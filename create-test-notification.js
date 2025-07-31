const axios = require('axios');

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjM1LCJpYXQiOjE3NTM5Mjc0NTMsImV4cCI6MTc1NjUxOTQ1M30.xnuhW_5icahnzQI3CUjwmgZhTPoHxx_EF8Lg8GcYJpQ';

async function createTestNotification() {
  try {
    console.log('🔔 Creando notificación de prueba...');

    const notificationData = {
      data: {
        type: 'order_created',
        title: '¡Orden creada exitosamente!',
        message: 'Tu orden #TEST-123 ha sido creada y está siendo procesada.',
        priority: 'normal',
        status: 'unread',
        recipientEmail: 'test@example.com',
        recipientRole: 'comprador',
        isEmailSent: false
      }
    };

    const response = await axios.post(`${STRAPI_URL}/api/notifications`, notificationData, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Notificación creada exitosamente!');
    console.log('📝 ID:', response.data.data.id);
    console.log('📝 DocumentID:', response.data.data.documentId);
    console.log('📝 Título:', response.data.data.attributes.title);
    console.log('📝 Estado:', response.data.data.attributes.status);

    return response.data.data;

  } catch (error) {
    console.error('❌ Error creando notificación:', error.response?.data || error.message);
  }
}

// Ejecutar
createTestNotification(); 