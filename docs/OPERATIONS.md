# Filo · Java + Angular

Aplicación independiente para una barbería: agenda diaria y semanal, clientes con historial, servicios y equipo. Angular consume una API Java y los datos viven en PostgreSQL.

## Stack

Java 21, Spring Boot 3.5.16, Spring MVC, JPA/Hibernate, Validation, Security y Maven. Angular 21.2, TypeScript estricto, componentes standalone, Router, Reactive Forms, Signals y HttpClient. PostgreSQL 17, Flyway, Nginx y Docker Compose. JUnit 5/Mockito, Vitest, integración HTTP y GitHub Actions.

Compatibilidad: [Angular](https://angular.dev/reference/versions) y [Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html).

## Arranque

Requisitos: Docker Desktop activo con contenedores Linux y Compose 2.24.4 o posterior. No necesitás instalar Java ni Node para este camino. Desde la raíz de la aplicación:

```powershell
Copy-Item .env.example .env
# Editá DB_PASSWORD y ADMIN_PASSWORD con contraseñas propias.
docker compose up --build -d --wait --wait-timeout 180
docker compose ps
```

Si ya existe .env, conservalo: esta instalación tiene credenciales locales aleatorias. Usuario inicial: **admin**; contraseña: **ADMIN_PASSWORD** de .env. Ese archivo está excluido de Git. La contraseña debe tener al menos 16 caracteres y como máximo 72 bytes UTF-8.

| Servicio | Dirección |
| --- | --- |
| App Angular | http://localhost:14203 |
| API Java | http://localhost:18083/api |
| Salud | http://localhost:18083/actuator/health |
| PostgreSQL | localhost:55435, base y usuario filo |

La instalación empieza vacía. Cargá al menos un cliente, un servicio y un barbero activo; después reservá desde Agenda. El administrador se crea una sola vez con contraseña BCrypt. Cambiar ADMIN_PASSWORD después no modifica una cuenta existente.

`docker compose stop` detiene los servicios conservando los datos. `docker compose up -d` vuelve a iniciarlos. PostgreSQL usa el volumen filo-barberia_filo_data. **No usar down -v con datos que quieras conservar.**

## Funcionalidad

- Crear, reprogramar y cancelar turnos; pendientes, confirmados, completados y cancelados.
- Agenda semanal/diaria, filtro por barbero y diseño adaptable a celular.
- Clientes con teléfono, notas e historial; servicios con precio ARS/duración; equipo.
- Desactivar registros conservando relaciones e historial.
- Horario 08:00–20:00 de Argentina, comienzos cada 5 minutos, duración 15–240 minutos.
- Las fechas anteriores a hoy quedan deshabilitadas para reservar o reprogramar, tanto en el calendario como en la API. El historial sigue disponible.
- Precio y duración congelados al reservar; se conservan al reprogramar el mismo servicio.
- PostgreSQL impide superposiciones incluso entre transacciones concurrentes. Las ediciones rechazan versiones desactualizadas.
- Ingresos del tablero: estimación de turnos confirmados y completados, no pagos cobrados.

## Estructura

```text
backend/src/main/java/com/filo/
  appointment/   reglas de agenda, DTO, servicio, repositorio y API
  catalog/       clientes, servicios y barberos
  security/      login, sesión, CSRF, contraseñas y límite de intentos
  common/        errores HTTP
backend/src/main/resources/db/migration/
backend/src/test/
frontend/src/app/
  core/          modelos, API y autenticación
  features/      login, agenda y catálogos
  layouts/       navegación y sesión
  shared/        formularios de edición
scripts/         verificación e integración
docs/API.md      endpoints y reglas
```

## Desarrollo

Sin contenedores de aplicación, se necesitan JDK 21, Maven 3.6.3+, Node 22.12+ o 24 y npm 11.21.1.

```powershell
docker compose up -d database
# Importar variables locales sin imprimir credenciales:
Get-Content .env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:PORT='18083'
$env:COOKIE_SECURE='false'
mvn -f backend/pom.xml spring-boot:run
```

En otra terminal, desde frontend: `npm ci` y `npm start`. Angular abre http://localhost:4200 y su proxy envía /api a 18083. Para otro puerto, ajustar frontend/proxy.conf.json.

## Pruebas

Cada construcción Docker ejecuta Maven verify, Angular build y Vitest. Para la integración real en contenedores y volumen separados:

```powershell
./scripts/verify.ps1
```

Alternativa manual:

```powershell
docker compose -p filo-barberia-test -f compose.yaml -f compose.test.yaml up --build -d --wait --wait-timeout 180
python scripts/integration.py
docker compose -p filo-barberia-test -f compose.yaml -f compose.test.yaml stop
```

El entorno aislado usa 14204 / 18084 / 55436 y su propio volumen. La prueba verifica login/logout, CSRF, validación, conflictos, versiones, historial, precio histórico y dos reservas simultáneas desde sesiones independientes. Los datos de prueba quedan cancelados/inactivos en esa base. El workflow .github/workflows/barberia.yml repite la construcción y la integración en CI.

Pruebas individuales: `mvn -f backend/pom.xml verify` y `npm test` desde frontend.

## Configuración y operación

| Variable | Uso |
| --- | --- |
| DB_PASSWORD | Contraseña PostgreSQL, obligatoria |
| ADMIN_USERNAME / ADMIN_PASSWORD | Bootstrap inicial del administrador |
| FRONTEND_PORT / BACKEND_PORT / DB_PORT | Puertos locales de Compose |
| DB_URL / DB_USER | JDBC y usuario al ejecutar Java fuera de Compose |
| PORT | Puerto Java interno, 8080 por defecto |
| COOKIE_SECURE | true por defecto; false para HTTP local |
| API_DOCS_ENABLED | Swagger/OpenAPI en el backend para desarrollo |

La sesión usa cookies HttpOnly/SameSite=Lax y vence tras 30 minutos de inactividad. Las mutaciones exigen CSRF. No se guardan contraseñas ni tokens de autenticación en LocalStorage. Login: 10 intentos por minuto y dirección, en memoria del proceso.

Swagger está deshabilitado por defecto. Con API_DOCS_ENABLED=true: http://localhost:18083/swagger-ui/index.html, requiere sesión en el mismo hostname. Los endpoints están documentados en [API.md](API.md).

Logs: `docker compose logs --tail 100 backend`. Respaldo desde PowerShell sin redirección binaria:

```powershell
docker compose exec -T database pg_dump -U filo -d filo -Fc -f /tmp/filo-backup.dump
docker compose cp database:/tmp/filo-backup.dump ./filo-backup.dump
```

Guardar respaldos fuera del repositorio. Para producción: dominio/HTTPS, COOKIE_SECURE=true, secretos del entorno, backups con restauración probada y proxy de confianza. Compose liga los puertos únicamente a localhost. La versión corresponde a una barbería y un administrador; no incluye recuperación de contraseña ni gestión de múltiples administradores.

## Alcance

Gestión interna con persistencia compartida. Reservas públicas, WhatsApp, cobro de señas, horarios personalizados y multi-sucursal quedan para otra etapa. No se publicó en un servidor externo.
