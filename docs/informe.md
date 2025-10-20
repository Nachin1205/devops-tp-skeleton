# Informe TP Integrador DevOps

## Resumen
Aplicación TODO simple en Node.js (Express) con un front mínimo estático. Objetivos: empaquetar en Docker con buenas prácticas, automatizar CI (lint, tests, build y push de imagen), y documentar monitoreo básico.

## Parte 1 – Aplicación y contenedores
- Lenguaje y stack: Node.js 20 (Express, ESM), front estático vanilla JS.
- Endpoints principales:
  - `GET /health` devuelve `{ status: 'ok' }` para health-check.
  - `GET /todos` lista en memoria.
  - `POST /todos` crea item `{ title }`.
  - `PUT /todos/:id` actualiza `{ title?, done? }`.
  - `DELETE /todos/:id` elimina por id.
- Pruebas unitarias/integración: `node --test` + `supertest` contra la app (sin levantar server). Valida `/health` y CRUD in-memory.
- Dockerfile (multi-stage):
  - `deps` instala dependencias de producción con `npm ci --omit=dev` usando `package-lock.json` para reproducibilidad.
  - `runner` copia `node_modules`, `src`, `public` y corre como usuario no root (`USER node`).
  - `HEALTHCHECK` consulta `http://localhost:3000/health`.
  - Base `node:20-alpine` para imagen liviana.
- Docker ignore: excluye fuentes innecesarias (`tests`, `.github`, `*.md`) para achicar el contexto de build.

## Parte 2 – Repositorio y CI
- Estructura: `src/`, `public/`, `tests/`, `docs/`, Dockerfile, compose y workflow en `.github/workflows/`.
- GitHub Actions (CI) dividido en 2 jobs:
  - `checks` (siempre): `npm ci`, `npm run lint`, `npm test`.
  - `docker` (solo en `main` y tags `v*`): buildx + push a Docker Hub.
- Versionado de imagen: tags inmutables por `sha` y `latest` en `main`; si se crea un tag `vX.Y.Z` también se publica `X.Y.Z`.
- Secrets usados: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` para login en Docker Hub.

## Parte 3 – CD (Render)
- Despliegue a Render: lo toma un compañero. Estrategia sugerida:
  - Opción 1 (auto deploy por repo): servicio Web conectado a GitHub, build `Dockerfile`, health-check `/health`.
  - Opción 2 (deploy por imagen): Render consume `docker.io/<user>/devops-tp:<tag>`; setear auto-deploy en push de `latest`.
  - Variables: `NODE_ENV=production`, opcional `SENTRY_DSN`.

## Parte 4 – Monitoreo
- Health-checks: endpoint `GET /health` + `HEALTHCHECK` Docker y `healthcheck` en `docker-compose.yml`.
- Logs: middleware de acceso HTTP que emite JSON (nivel, evento, método, ruta, estado, duración). Errores no manejados también en JSON.
- Trazado/errores: integración opcional con Sentry vía `SENTRY_DSN` (handlers de request y error). Permite capturar excepciones, tasa de errores y trazas básicas.
- Métricas: no se exportan métricas Prometheus en esta versión. Alternativa: agregar `/metrics` con `prom-client` (histogramas de latencia, contadores por ruta/estado) si se requiere.

## Parte 5 – Conclusiones
- Se priorizó una imagen mínima y segura (alpine, `npm ci`, usuario no root) y un pipeline claro con separación de responsabilidades.
- Versionado de imágenes trazable (sha) y consumo cómodo (`latest`/semver).
- Próximos pasos: agregar métricas Prometheus, dashboards y alertas; pipeline de CD a Render con gates; pruebas E2E.

