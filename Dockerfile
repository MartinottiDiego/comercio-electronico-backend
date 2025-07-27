# Dockerfile optimizado para Strapi v5
FROM node:18-alpine as base

# Instalar dependencias del sistema necesarias para Strapi
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    build-base \
    python3 \
    make \
    g++

# Crear directorio de trabajo
WORKDIR /opt/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S strapi -u 1001

# Copiar código fuente
COPY --chown=strapi:nodejs . .

# Crear directorios necesarios con permisos correctos
RUN mkdir -p /opt/app/.strapi /opt/app/public/uploads
RUN chown -R strapi:nodejs /opt/app

# Cambiar a usuario no-root
USER strapi

# Exponer puerto
EXPOSE 1337

# Healthcheck para verificar que Strapi esté funcionando
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node healthcheck.js

# Comando por defecto
CMD ["npm", "run", "develop"]