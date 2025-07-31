const axios = require('axios');

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjM1LCJpYXQiOjE3NTM5Mjc0NTMsImV4cCI6MTc1NjUxOTQ1M30.xnuhW_5icahnzQI3CUjwmgZhTPoHxx_EF8Lg8GcYJpQ';

async function testNotificationDetails() {
  try {
    console.log('🔍 Probando endpoint GET individual de notificaciones...\n');

    // 1. Primero obtener todas las notificaciones
    console.log('1️⃣ Obteniendo lista de notificaciones...');
    const listResponse = await axios.get(`${STRAPI_URL}/api/notifications?populate=*`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`
      }
    });

    console.log('✅ Lista obtenida:', listResponse.data.data?.length || 0, 'notificaciones');

    if (listResponse.data.data && listResponse.data.data.length > 0) {
      const firstNotification = listResponse.data.data[0];
      console.log('📋 Primera notificación:', {
        id: firstNotification.id,
        documentId: firstNotification.documentId,
        title: firstNotification.attributes?.title,
        status: firstNotification.attributes?.status
      });

      // 2. Probar GET individual con ID
      console.log('\n2️⃣ Probando GET /api/notifications/' + firstNotification.id);
      try {
        const detailResponse = await axios.get(`${STRAPI_URL}/api/notifications/${firstNotification.id}`, {
          headers: {
            'Authorization': `Bearer ${USER_TOKEN}`
          }
        });
        console.log('✅ GET individual con ID funciona');
        console.log('📝 Detalles:', detailResponse.data.data?.attributes?.title);
      } catch (error) {
        console.log('❌ Error GET individual con ID:', error.response?.status, error.response?.data?.error?.message || error.message);
      }

      // 3. Probar GET individual con documentId
      console.log('\n3️⃣ Probando GET /api/notifications/' + firstNotification.documentId);
      try {
        const detailResponse = await axios.get(`${STRAPI_URL}/api/notifications/${firstNotification.documentId}`, {
          headers: {
            'Authorization': `Bearer ${USER_TOKEN}`
          }
        });
        console.log('✅ GET individual con documentId funciona');
        console.log('📝 Detalles:', detailResponse.data.data?.attributes?.title);
      } catch (error) {
        console.log('❌ Error GET individual con documentId:', error.response?.status, error.response?.data?.error?.message || error.message);
      }

      // 4. Probar PUT con documentId
      console.log('\n4️⃣ Probando PUT /api/notifications/' + firstNotification.documentId);
      try {
        const updateResponse = await axios.put(`${STRAPI_URL}/api/notifications/${firstNotification.documentId}`, {
          data: {
            status: 'read',
            readAt: new Date().toISOString()
          }
        }, {
          headers: {
            'Authorization': `Bearer ${USER_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ PUT con documentId funciona');
        console.log('📝 Estado actualizado:', updateResponse.data.data?.attributes?.status);
      } catch (error) {
        console.log('❌ Error PUT con documentId:', error.response?.status, error.response?.data?.error?.message || error.message);
      }

    } else {
      console.log('⚠️ No hay notificaciones para probar');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar
testNotificationDetails(); 