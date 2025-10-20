# Etapa 1: instala dependencias de producción usando el lockfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
## Notas:
## - npm ci asegura instalaciones reproducibles con package-lock.json
## - omit=dev excluye dependencias de desarrollo para un runtime más liviano

# Etapa 2: runtime mínimo
FROM node:20-alpine AS runner
## Imagen de runtime: sólo lo necesario para ejecutar la app
WORKDIR /app
ENV NODE_ENV=production

# Copiamos solo lo necesario para correr
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public

EXPOSE 3000

# Healthcheck a /health 
## Node 20 ya incluye fetch; en versiones anteriores usar curl/wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Ejecutar como usuario no root por seguridad (principio de menor privilegio)
USER node

# Arranque de la app
CMD ["node","src/index.js"]
