# Google OAuth Configuration

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Cómo Obtener las Credenciales

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Google+ 
4. Ve a "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Tipo: "Web application"
6. URIs autorizados: `http://localhost:1337/api/auth/google/callback`
7. JavaScript origins: `http://localhost:3001`

## Estructura de la Respuesta

El endpoint `/api/auth/google/callback` retorna:

```json
{
  "jwt": "strapi_jwt_token",
  "user": {
    "id": 123,
    "email": "user@gmail.com",
    "username": "username",
    "provider": "google"
  },
  "message": "Autenticación con Google exitosa"
}
```




