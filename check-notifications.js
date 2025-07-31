const axios = require('axios');

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjM1LCJpYXQiOjE3NTM5Mjc0NTMsImV4cCI6MTc1NjUxOTQ1M30.xnuhW_5icahnzQI3CUjwmgZhTPoHxx_EF8Lg8GcYJpQ';

async function checkNotifications() {
  try {
    console.log('🔍 Verificando notificaciones...');
    
    // Intentar obtener notificaciones con diferentes endpoints
    const endpoints = [
      '/api/notifications',
      '/api/notifications?populate=*',
      '/api/notifications?filters[recipientEmail]=test@example.com'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Probando: ${endpoint}`);
        const response = await axios.get(`${STRAPI_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${USER_TOKEN}`
          }
        });
        console.log('✅ Respuesta:', response.data);
        break;
      } catch (error) {
        console.log(`❌ Error en ${endpoint}:`, error.response?.status, error.response?.data?.error?.message || error.message);
      }
    }
    
    // Verificar si hay notificaciones en la base de datos directamente
    console.log('\n🔍 Verificando logs de Strapi...');
    console.log('💡 Revisa los logs de Docker para ver si se enviaron emails:');
    console.log('docker-compose logs strapi | grep -i "notificacion\|email\|resend"');
    
  } catch (error) {
    console.error('❌ Error verificando notificaciones:', error.message);
  }
}

// Ejecutar
checkNotifications(); 