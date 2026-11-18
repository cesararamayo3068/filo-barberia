package com.filo.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BarberiaApiIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String BASE = System.getProperty("filo.base-url", "http://127.0.0.1:14204");
    private static final Map<String, String> CONFIG = loadConfiguration();

    private static Map<String, String> loadConfiguration() {
        try {
            Map<String, String> result = new HashMap<>();
            for (String line : Files.readAllLines(Path.of(System.getProperty("filo.env-file")))) {
                int separator = line.indexOf('=');
                if (separator > 0 && !line.startsWith("#")) {
                    result.put(line.substring(0, separator).replace("\uFEFF", ""), line.substring(separator + 1));
                }
            }
            return result;
        } catch (Exception e) {
            throw new IllegalStateException("Prepará el archivo .env antes de ejecutar el perfil http-integration.");
        }
    }

    private static Map<String, Object> with(Map<String, Object> source, Object... changes) {
        Map<String, Object> result = new HashMap<>(source);
        for (int i = 0; i < changes.length; i += 2) result.put((String) changes[i], changes[i + 1]);
        return result;
    }

    private static class Session {
        private final HttpClient client = HttpClient.newBuilder()
            .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .connectTimeout(Duration.ofSeconds(10)).build();
        private String token;

        HttpResponse<String> send(String method, String path, Map<String, Object> data, boolean csrf) throws Exception {
            var builder = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json");
            if (csrf && token != null) builder.header("X-XSRF-TOKEN", token);
            builder.method(method, data == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(data)));
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        }

        JsonNode call(String method, String path, Map<String, Object> data, int expected) throws Exception {
            var response = send(method, path, data, true);
            assertEquals(expected, response.statusCode(), method + " " + path);
            return response.body().isBlank() ? JSON.getNodeFactory().nullNode() : JSON.readTree(response.body());
        }

        void login() throws Exception {
            token = call("GET", "/api/csrf", null, 200).path("token").asText();
            String username = java.net.URLEncoder.encode(CONFIG.getOrDefault("ADMIN_USERNAME", "admin"), java.nio.charset.StandardCharsets.UTF_8);
            String password = java.net.URLEncoder.encode(CONFIG.get("ADMIN_PASSWORD"), java.nio.charset.StandardCharsets.UTF_8);
            var request = HttpRequest.newBuilder(URI.create(BASE + "/api/login")).timeout(Duration.ofSeconds(30))
                .header("X-XSRF-TOKEN", token).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=" + username + "&password=" + password)).build();
            assertEquals(204, client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode(), "Login");
            token = call("GET", "/api/csrf", null, 200).path("token").asText();
        }
    }

    @Test
    void managesAppointmentsWithAuthenticationPersistenceAndConcurrentReservations() throws Exception {
        Session session = new Session();
        session.call("GET", "/api/clients", null, 401);
        assertEquals(403, session.send("POST", "/api/clients", Map.of(), false).statusCode());
        session.login();
        assertEquals(CONFIG.getOrDefault("ADMIN_USERNAME", "admin"),
            session.call("GET", "/api/session", null, 200).path("username").asText());
        session.call("POST", "/api/clients", Map.of(), 400);
        assertEquals(403, session.send("POST", "/api/clients", Map.of("name", "Sin CSRF"), false).statusCode());

        String label = "Integración Java " + UUID.randomUUID().toString().substring(0, 8);
        JsonNode client = session.call("POST", "/api/clients", Map.of("name", label, "phone", "", "notes", "", "active", true), 200);
        JsonNode barber = session.call("POST", "/api/barbers", Map.of("name", label, "active", true), 200);
        JsonNode service = session.call("POST", "/api/services", Map.of("name", label, "duration", 30, "price", 12000, "active", true), 200);
        LocalDate today = LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires"));
        String date = today.plusDays(7).toString();
        Map<String, Object> appointment = Map.of("clientId", client.path("id").asLong(),
            "barberId", barber.path("id").asLong(), "serviceId", service.path("id").asLong(),
            "date", date, "time", "09:00", "status", "CONFIRMED", "notes", "");
        session.call("POST", "/api/appointments", with(appointment, "date", today.minusDays(1).toString()), 400);
        JsonNode first = session.call("POST", "/api/appointments", appointment, 200);
        String firstPath = "/api/appointments/" + first.path("id").asLong();
        session.call("PUT", firstPath, with(appointment, "date", today.minusDays(1).toString(), "version", first.path("version").asLong()), 400);
        session.call("POST", "/api/appointments", with(appointment, "time", "09:15"), 409);
        JsonNode second = session.call("POST", "/api/appointments", with(appointment, "time", "09:30"), 200);
        session.call("POST", "/api/appointments", with(appointment, "time", "19:45"), 400);

        long serviceId = service.path("id").asLong();
        session.call("PUT", "/api/services/" + serviceId, Map.of("version", service.path("version").asLong(),
            "name", label, "duration", 60, "price", 15000, "active", true), 200);
        JsonNode moved = session.call("PUT", firstPath,
            with(appointment, "time", "10:00", "version", first.path("version").asLong()), 200);
        assertEquals(12000, moved.path("price").asInt());
        assertEquals(30, moved.path("duration").asInt());
        session.call("PUT", firstPath, with(appointment, "time", "11:00", "version", first.path("version").asLong()), 409);
        session.call("PUT", "/api/appointments/" + second.path("id").asLong(),
            with(appointment, "time", "09:30", "version", second.path("version").asLong(), "status", "CANCELLED"), 200);
        session.call("POST", "/api/appointments", appointment, 200);
        assertEquals(3, session.call("GET", "/api/clients/" + client.path("id").asLong() + "/appointments", null, 200).size());
        JsonNode range = session.call("GET", "/api/appointments?from=" + date + "&to=" + date, null, 200);
        boolean found = false;
        for (JsonNode row : range) if (row.path("id").equals(first.path("id"))) found = true;
        assertTrue(found, "La agenda debe recuperar el turno persistido.");

        Session left = new Session(), right = new Session();
        left.login();
        right.login();
        List<CompletableFuture<Integer>> attempts = new ArrayList<>();
        for (Session contender : List.of(left, right)) {
            attempts.add(CompletableFuture.supplyAsync(() -> {
                try {
                    return contender.send("POST", "/api/appointments", with(appointment, "time", "14:00"), true).statusCode();
                } catch (Exception e) {
                    throw new java.util.concurrent.CompletionException(e);
                }
            }));
        }
        assertEquals(List.of(200, 409), attempts.stream().map(CompletableFuture::join).sorted().toList());

        Session fresh = new Session();
        fresh.login();
        boolean persisted = false;
        for (JsonNode row : fresh.call("GET", "/api/clients", null, 200)) {
            if (row.path("id").equals(client.path("id"))) persisted = true;
        }
        assertTrue(persisted, "Una nueva sesión debe recuperar el cliente.");
        for (JsonNode row : fresh.call("GET", "/api/clients/" + client.path("id").asLong() + "/appointments", null, 200)) {
            if (!row.path("status").asText().equals("CANCELLED")) {
                fresh.call("PUT", "/api/appointments/" + row.path("id").asLong(),
                    with(appointment, "time", row.path("time").asText(), "version", row.path("version").asLong(), "status", "CANCELLED"), 200);
            }
        }
        fresh.call("PUT", "/api/clients/" + client.path("id").asLong(),
            Map.of("version", client.path("version").asLong(), "name", label, "phone", "", "notes", "", "active", false), 200);
        fresh.call("PUT", "/api/barbers/" + barber.path("id").asLong(),
            Map.of("version", barber.path("version").asLong(), "name", label, "active", false), 200);
        JsonNode currentService = null;
        for (JsonNode row : fresh.call("GET", "/api/services", null, 200)) {
            if (row.path("id").asLong() == serviceId) currentService = row;
        }
        assertNotNull(currentService);
        fresh.call("PUT", "/api/services/" + serviceId, Map.of("version", currentService.path("version").asLong(),
            "name", label, "duration", 60, "price", 15000, "active", false), 200);
        fresh.call("POST", "/api/appointments", with(appointment, "time", "16:00"), 400);
        fresh.call("POST", "/api/logout", Map.of(), 204);
        fresh.call("GET", "/api/clients", null, 401);
    }
}
