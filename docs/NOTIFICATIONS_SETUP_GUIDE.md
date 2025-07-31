# 🚀 Guía de Configuración del Sistema de Notificaciones

Esta guía te ayudará a configurar completamente el sistema de notificaciones de WaaZaar, incluyendo notificaciones push, email y en tiempo real.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración del Backend](#configuración-del-backend)
3. [Configuración del Frontend](#configuración-del-frontend)
4. [Configuración de Email](#configuración-de-email)
5. [Configuración de Push Notifications](#configuración-de-push-notifications)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
9. [Producción](#producción)

## 🔧 Requisitos Previos

### Backend (Strapi v5)
- Node.js 18+
- PostgreSQL
- Docker (opcional)

### Frontend (Next.js)
- Node.js 18+
- Navegador moderno con soporte para Service Workers

### Dependencias Necesarias

**Backend:**
```bash
npm install web-push nodemailer
```

**Frontend:**
```bash
npm install zustand
```

## ⚙️ Configuración del Backend

### 1. Variables de Entorno

Crea o actualiza tu archivo `.env` en el directorio raíz del backend:

```env
# Configuración de la base de datos
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecommerce_backend_strapi_v2
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=tu-password
DATABASE_SSL=false

# Configuración de Strapi
JWT_SECRET=tu-jwt-secret-key-aqui
ADMIN_JWT_SECRET=tu-admin-jwt-secret-key-aqui
API_TOKEN_SALT=tu-api-token-salt-aqui
APP_KEYS=tu-app-keys-aqui
TRANSFER_TOKEN_SALT=tu-transfer-token-salt-aqui

# Configuración de la aplicación
FRONTEND_URL=http://localhost:3000
STRAPI_URL=http://localhost:1337

# Configuración de notificaciones push
VAPID_PUBLIC_KEY=tu-vapid-public-key-aqui
VAPID_PRIVATE_KEY=tu-vapid-private-key-aqui

# Configuración de email - Resend (Recomendado)
EMAIL_PROVIDER=resend
RESEND_API_KEY=tu-resend-api-key-aqui

# Configuración de email - SMTP tradicional (Alternativa)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=tu-email@gmail.com
# SMTP_PASS=tu-app-password-aqui

# Configuración de Stripe (para webhooks)
STRIPE_SECRET_KEY=tu-stripe-secret-key-aqui
STRIPE_WEBHOOK_SECRET=tu-stripe-webhook-secret-aqui

# Configuración de logs
LOG_LEVEL=info
```

### 2. Generar VAPID Keys

Ejecuta este comando en el directorio del backend:

```bash
npx web-push generate-vapid-keys
```

Copia las claves generadas a tu archivo `.env`:
- `VAPID_PUBLIC_KEY`: La clave pública
- `VAPID_PRIVATE_KEY`: La clave privada

### 3. Instalar Dependencias

```bash
cd mi-nuevo-backend
npm install web-push
```

### 4. Reiniciar Strapi

```bash
npm run develop
```

## 🎨 Configuración del Frontend

### 1. Variables de Entorno

Crea o actualiza tu archivo `.env.local` en el directorio raíz del frontend:

```env
# URLs de la aplicación
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_APP_URL=http://localhost:3000

# VAPID Public Key (la misma del backend)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu-vapid-public-key-aqui

# Configuración de email
RESEND_API_KEY=tu-resend-api-key-aqui
```

### 2. Service Worker

El archivo `public/sw.js` ya está configurado. Asegúrate de que esté en la carpeta `public/` de tu proyecto Next.js.

### 3. Reiniciar el Frontend

```bash
cd frontend-ecommerce
npm run dev
```

## 📧 Configuración de Email

### Opción 1: Resend (Recomendado)

1. Regístrate en [Resend](https://resend.com)
2. Obtén tu API key
3. Configura tu dominio de email
4. Agrega la API key a tu `.env`

### Opción 2: SMTP Tradicional

1. Configura tu proveedor de email (Gmail, Outlook, etc.)
2. Genera una contraseña de aplicación
3. Configura las variables SMTP en tu `.env`

## 📱 Configuración de Push Notifications

### 1. Verificar Soporte del Navegador

El sistema automáticamente detecta si el navegador soporta push notifications.

### 2. Permisos del Usuario

Los usuarios deben dar permiso para recibir notificaciones. Esto se maneja automáticamente en el componente `NotificationSettings`.

### 3. Service Worker

El service worker ya está configurado para:
- Recibir notificaciones push
- Manejar clics en notificaciones
- Navegar a URLs específicas
- Marcar notificaciones como leídas

## 🧪 Testing

### 1. Testing de Email

```bash
# En el backend
node create-test-notification.js
```

### 2. Testing de Push Notifications

1. Ve a la página de configuración de notificaciones
2. Activa las notificaciones push
3. Envía una notificación de prueba

### 3. Testing de Sincronización

```bash
# En el backend
node check-notifications.js
```

### 4. Testing de Roles

Prueba las notificaciones con diferentes roles:
- **Admin**: Todas las notificaciones del sistema
- **Tienda**: Notificaciones de ventas y pedidos
- **Comprador**: Notificaciones de pedidos y estado

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Error de VAPID Keys
```
Error: VAPID keys no configuradas
```
**Solución:** Verifica que las VAPID keys estén en tu `.env`

#### 2. Error de Service Worker
```
Error: Service Worker no registrado
```
**Solución:** Verifica que `public/sw.js` existe y es accesible

#### 3. Error de Permisos
```
Error: Permiso de notificación denegado
```
**Solución:** El usuario debe dar permiso manualmente en el navegador

#### 4. Error de Conexión
```
Error: Backend no disponible
```
**Solución:** Verifica que Strapi esté corriendo y accesible

### Logs Útiles

**Backend:**
```bash
# Ver logs de Strapi
npm run develop

# Ver logs específicos de notificaciones
grep "notificación\|notification" logs/strapi.log
```

**Frontend:**
```javascript
// En la consola del navegador
console.log('Estado de notificaciones:', notificationStore.getState());
```

## 📊 Monitoreo y Mantenimiento

### 1. Estadísticas de Suscripciones

```bash
# Obtener estadísticas
curl -X GET http://localhost:1337/api/push-subscriptions/stats \
  -H "Authorization: Bearer tu-token"
```

### 2. Limpieza Automática

El sistema automáticamente:
- Marca suscripciones expiradas como inactivas
- Limpia notificaciones antiguas (90 días)
- Maneja reintentos con exponential backoff

### 3. Monitoreo de Rendimiento

- **Email**: Tasa de entrega > 95%
- **Push**: Tasa de entrega > 80%
- **Sincronización**: Polling cada 30 segundos

## 🚀 Producción

### 1. Variables de Entorno de Producción

```env
# URLs de producción
FRONTEND_URL=https://tu-dominio.com
STRAPI_URL=https://api.tu-dominio.com

# SSL para producción
DATABASE_SSL=true

# Logs de producción
LOG_LEVEL=error
```

### 2. Configuración de Dominio

1. Configura tu dominio en Resend
2. Actualiza las URLs en el service worker
3. Configura HTTPS (requerido para push notifications)

### 3. Monitoreo de Producción

- Configura alertas para errores de notificaciones
- Monitorea las tasas de entrega
- Revisa logs regularmente

### 4. Escalabilidad

El sistema está diseñado para:
- Manejar miles de notificaciones simultáneas
- Escalar horizontalmente
- Manejar fallos de red graciosamente

## 📚 Recursos Adicionales

- [Documentación de Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Documentación de Resend](https://resend.com/docs)
- [Documentación de Strapi](https://docs.strapi.io/)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del backend y frontend
2. Verifica la configuración de variables de entorno
3. Prueba con un navegador diferente
4. Verifica la conectividad de red

---

**¡Tu sistema de notificaciones está listo para usar! 🎉** 