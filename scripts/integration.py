"""Prueba HTTP real. Usar el entorno aislado de compose.test.yaml."""
import argparse
import concurrent.futures
import datetime
import http.cookiejar
import json
import pathlib
import urllib.error
import urllib.request
import urllib.parse
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="http://127.0.0.1:14204")
args = parser.parse_args()
config = dict(line.split("=", 1) for line in (pathlib.Path(__file__).resolve().parents[1] / ".env").read_text(encoding="utf-8-sig").splitlines() if "=" in line and not line.startswith("#"))
base = args.base.rstrip("/")
label = "Prueba " + uuid.uuid4().hex[:8]

class Session:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.token = None
    def call(self, method, path, data=None, expected=200, csrf=True, form=False):
        payload = None if data is None else (urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode())
        headers = {"Content-Type": "application/x-www-form-urlencoded" if form else "application/json"}
        if csrf and self.token:
            headers["X-XSRF-TOKEN"] = self.token
        req = urllib.request.Request(base + path, data=payload, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=30) as res:
                status, raw = res.status, res.read()
        except urllib.error.HTTPError as ex:
            status, raw = ex.code, ex.read()
        if status != expected:
            raise AssertionError(f"{method} {path}: HTTP {status}, esperado {expected}")
        return json.loads(raw) if raw and raw[:1] in (b"{", b"[") else None
    def login(self):
        self.token = self.call("GET", "/api/csrf")["token"]
        self.call("POST", "/api/login", {"username":config.get("ADMIN_USERNAME","admin"), "password":config["ADMIN_PASSWORD"]}, expected=204, form=True)
        self.token = self.call("GET", "/api/csrf")["token"]

s = Session()
s.call("GET", "/api/clients", expected=401)
s.call("POST", "/api/clients", {}, expected=403, csrf=False)
s.login()
assert s.call("GET", "/api/session")["username"] == config.get("ADMIN_USERNAME", "admin")
s.call("POST", "/api/clients", {}, expected=400)
s.call("POST", "/api/clients", {"name":"X","phone":"","notes":"","active":True}, expected=403, csrf=False)
client = s.call("POST", "/api/clients", {"name":label,"phone":"", "notes":"Integración automatizada", "active":True})
barber = s.call("POST", "/api/barbers", {"name":label,"active":True})
service = s.call("POST", "/api/services", {"name":label,"duration":30,"price":12000,"active":True})
date = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
appointment = {"clientId":client["id"],"barberId":barber["id"],"serviceId":service["id"],"date":date,"time":"09:00","status":"CONFIRMED","notes":""}
# Una fecha suficientemente anterior siempre debe rechazarse, incluso por API.
past = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
s.call("POST", "/api/appointments", {**appointment,"date":past}, expected=400)
a = s.call("POST", "/api/appointments", appointment)
s.call("PUT", f'/api/appointments/{a["id"]}', {**appointment,"date":past,"version":a["version"]}, expected=400)
s.call("POST", "/api/appointments", {**appointment,"time":"09:15"}, expected=409)
b = s.call("POST", "/api/appointments", {**appointment,"time":"09:30"})
s.call("POST", "/api/appointments", {**appointment,"time":"19:45"}, expected=400)
s.call("PUT", f'/api/services/{service["id"]}', {**service,"price":15000,"duration":60})
rescheduled = s.call("PUT", f'/api/appointments/{a["id"]}', {**appointment,"time":"10:00","version":a["version"]})
assert float(rescheduled["price"]) == 12000 and rescheduled["duration"] == 30
s.call("PUT", f'/api/appointments/{a["id"]}', {**appointment,"time":"11:00","version":a["version"]}, expected=409)
s.call("PUT", f'/api/appointments/{b["id"]}', {**appointment,"time":"09:30","version":b["version"],"status":"CANCELLED"})
replacement = s.call("POST", "/api/appointments", {**appointment,"time":"09:00"})
assert any(r["id"]==a["id"] for r in s.call("GET", f'/api/appointments?from={date}&to={date}'))
assert len(s.call("GET", f'/api/clients/{client["id"]}/appointments')) == 3

# Dos sesiones independientes intentan tomar el mismo horario al mismo tiempo.
left, right = Session(), Session()
left.login()
right.login()
def race(session):
    try:
        session.call("POST", "/api/appointments", {**appointment,"time":"14:00"})
        return 200
    except AssertionError as ex:
        if "HTTP 409," in str(ex):
            return 409
        raise
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(race, [left,right]))
assert sorted(results) == [200,409], results

# Una nueva sesión recupera los datos de PostgreSQL.
fresh = Session()
fresh.login()
assert any(c["id"]==client["id"] for c in fresh.call("GET", "/api/clients"))
for row in fresh.call("GET", f'/api/clients/{client["id"]}/appointments'):
    if row["status"]!="CANCELLED":
        fresh.call("PUT", f'/api/appointments/{row["id"]}', {**appointment,"time":row["time"],"version":row["version"],"status":"CANCELLED"})
for kind, row in [("clients",client),("barbers",barber)]:
    fresh.call("PUT", f'/api/{kind}/{row["id"]}', {**row,"active":False})
current_service = next(x for x in fresh.call("GET", "/api/services") if x["id"]==service["id"])
fresh.call("PUT", f'/api/services/{service["id"]}', {**current_service,"active":False})
fresh.call("POST", "/api/appointments", {**appointment,"time":"16:00"}, expected=400)
fresh.call("POST", "/api/logout", {}, expected=204)
fresh.call("GET", "/api/clients", expected=401)
print("OK: login, CSRF, validación, agenda, conflictos, concurrencia, precio histórico, versiones, historial, persistencia y logout.")
