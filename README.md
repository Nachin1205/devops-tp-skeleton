# TP Integrador DevOps — Starter


## 1) App & Tests
- API con `Express`:
  - `GET /health` ⇒ `{ status: "ok" }`
  - CRUD en memoria en `/todos`
- Pruebas con el runner nativo de Node 20 + `supertest` (`npm test`).

## 2) Correr local
```bash
# requisitos: Node 20+
npm ci
npm test
npm start
# http://localhost:3000/health
```

## 3) Docker (multi-stage)
```bash
docker build -t tuusuario/devops-tp:local .
docker run -p 3000:3000 tuusuario/devops-tp:local
curl http://localhost:3000/health
```

## 4) Docker Compose
```bash
docker compose up --build -d
curl http://localhost:3000/health
```

## 5) CI en GitHub Actions
1. Creá un repo en GitHub y subí este código.
2. En **Settings → Secrets and variables → Actions**, creá:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN` (un access token de Docker Hub)
3. Creá un repo en Docker Hub llamado `devops-tp` bajo tu usuario.
4. Protegé la rama `main` en **Settings → Branches → Branch protection**: 
   - requerí PRs y que pase el workflow.
5. Cada push a `main` hará **build & push** de la imagen con tags `latest` y `sha`.

## 6) Monitoreo (Sentry — opcional pero recomendado)
- Crear cuenta en Sentry, obtener **DSN**.
- Exportar `SENTRY_DSN` (o configurarlo en el host/compose/Actions).
- Endpoint `/boom` genera un error para validar el tracking.

## 7) Endpoints
```
GET  /health
GET  /todos
POST /todos      { "title": "algo" }
PUT  /todos/:id  { "title"?, "done"? }
DELETE /todos/:id
GET  /boom       # error de prueba para monitoreo
```

## 8) Entregables sugeridos
- **Repo** público en GitHub
- **ZIP** del código (Release → Attach binaries)
- **Informe** (añadí un `docs/informe.md`)
- **PPT** con el flujo CI/CD, capturas y aprendizajes
