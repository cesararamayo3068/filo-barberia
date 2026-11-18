$ErrorActionPreference='Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    docker compose -p filo-barberia-test -f compose.yaml -f compose.test.yaml up --build -d --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo construir o iniciar el entorno de prueba.' }
    python scripts/integration.py
    if ($LASTEXITCODE -ne 0) { throw 'Falló la prueba de integración.' }
} finally {
    docker compose -p filo-barberia-test -f compose.yaml -f compose.test.yaml stop
    Pop-Location
}
