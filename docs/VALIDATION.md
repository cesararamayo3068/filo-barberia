# Validación de la migración

Verificada localmente con Docker Desktop y PostgreSQL 17:

- Compilación Java 21 y empaquetado Spring Boot: correctos.
- JUnit / Mockito: 15 pruebas correctas, incluyendo fechas pasadas, historial y cambio de día en UTC/Argentina.
- Compilación Angular de producción: correcta.
- Vitest: 5 pruebas correctas en Docker; se verifica en el DOM que ayer esté bloqueado y hoy y mañana estén habilitados.
- Integración HTTP: login, logout, CSRF, validación, reservas, reprogramación, cancelación, historial, precios históricos, versiones y persistencia en una nueva sesión.
- Dos sesiones independientes compitiendo por el mismo horario: una reserva aceptada y otra rechazada con HTTP 409.
- La API rechaza crear o reprogramar turnos para días anteriores a hoy con HTTP 400; la integración completa sigue pasando.
- Navegador: login, altas de cliente/servicio/barbero, reserva, reprogramación, recarga, cancelación y consulta del historial correctos. Vista de 390 px sin desborde horizontal de página.

La integración se ejecuta en el proyecto Compose filo-barberia-test, con volumen separado. El frontend servido por Nginx usa CSP sin habilitar scripts inline; la optimización de Angular desactiva inlineCritical para que el CSS no dependa de un manejador onload inline.

Las dependencias de instalación informan 16 alertas moderadas transitivas en herramientas del CLI (glob/minimatch y su cadena). No se aplicaron actualizaciones mayores automáticas. El runtime final de frontend solo contiene Nginx y los archivos compilados, sin node_modules. Revisar estas dependencias antes de actualizar el toolchain.

No se ha ejecutado el workflow en GitHub ni se ha hecho un despliegue externo.
