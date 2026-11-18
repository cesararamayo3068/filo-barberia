# API REST de Filo

Base: `/api`. JSON excepto el login. Las operaciones requieren una sesión de administrador; los POST y PUT requieren CSRF. La app y la API usan el mismo origen mediante Nginx o el proxy de Angular, sin habilitar CORS abierto.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /csrf | Obtener token y cookie CSRF antes de login y después de login/logout |
| POST | /login | Formulario URL encoded: username y password. Responde 204 |
| GET | /session | Usuario autenticado |
| POST | /logout | Cerrar e invalidar sesión; responde 204 |
| GET / POST | /clients | Listar / crear clientes |
| PUT | /clients/{id} | Actualizar cliente |
| GET | /clients/{id}/appointments | Historial del cliente |
| GET / POST | /barbers | Listar / crear barberos |
| PUT | /barbers/{id} | Actualizar barbero |
| GET / POST | /services | Listar / crear servicios |
| PUT | /services/{id} | Actualizar servicio |
| GET | /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD | Agenda por fechas inclusivas, hasta 62 días de diferencia |
| POST | /appointments | Reservar |
| PUT | /appointments/{id} | Reprogramar, cambiar estado o cancelar |

## Turno

```json
{
  "version": null,
  "clientId": 1,
  "barberId": 1,
  "serviceId": 1,
  "date": "2026-11-20",
  "time": "10:00",
  "status": "CONFIRMED",
  "notes": ""
}
```

En actualizaciones, enviar `version` de la última lectura. Los IDs son numéricos y provienen de la base; los del ejemplo requieren registros reales.

Estados: CONFIRMED, PENDING, COMPLETE, CANCELLED. Los tres primeros ocupan el horario; CANCELLED libera el intervalo y conserva el historial. Solo se reserva o reprograma para hoy o fechas futuras según America/Argentina/Buenos_Aires. Los turnos históricos siguen visibles y permiten actualizar notas/estado o cancelar conservando fecha, hora y referencias; no se pueden reactivar cancelados en el pasado. El horario es 08:00–20:00 en Argentina, con comienzos cada 5 minutos y duración de servicio de 15 a 240 minutos. Los intervalos son semiabiertos: uno puede comenzar justo cuando termina el anterior.

La API toma el precio y la duración del servicio al reservar. Los mantiene al reprogramar el mismo servicio, aunque el catálogo cambie; elegir otro servicio toma sus valores actuales. No acepta precio o duración arbitrarios desde el frontend.

Las referencias deben estar activas al reservar. Al editar un turno existente se pueden conservar referencias inactivas para no bloquear su gestión. Los catálogos se desactivan, no se borran, para conservar relaciones e historial.

## Errores

400: datos inválidos; 401: sesión ausente/vencida o login incorrecto; 403: CSRF inválido; 404: registro inexistente; 409: superposición o versión desactualizada; 429: límite de login.

Los errores de dominio usan ProblemDetail y un mensaje en español. Nunca se muestran consultas SQL o trazas al usuario. PostgreSQL impide por una restricción de exclusión que dos transacciones reserven el mismo horario del mismo barbero.

## OpenAPI

Para desarrollo, activar `API_DOCS_ENABLED=true` en el backend. Swagger: `http://localhost:18083/swagger-ui/index.html`. Requiere sesión de administrador en el mismo hostname. Está deshabilitado por defecto. El proxy frontal expone la API funcional; Swagger se consulta en el puerto del backend.
