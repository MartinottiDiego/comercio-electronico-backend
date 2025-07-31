const axios = require('axios');

// Configuración
const STRAPI_URL = 'http://localhost:1337';

// Credenciales del usuario de prueba
const userCredentials = {
  identifier: 'test@example.com', // o el email que usaste
  password: 'test123456'
};

async function getAuthToken() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    
    const response = await axios.post(`${STRAPI_URL}/api/auth/local`, userCredentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const { jwt } = response.data;
    console.log('✅ Token obtenido exitosamente!');
    console.log('🔑 Token:', jwt);
    console.log('\n📝 Copia este token y reemplázalo en test-order.js');
    
    return jwt;
    
  } catch (error) {
    console.error('❌ Error obteniendo token:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('🔍 Verifica que:');
      console.log('1. El usuario existe en Strapi');
      console.log('2. El email y contraseña son correctos');
      console.log('3. El usuario tiene el rol "Authenticated"');
    }
  }
}

// Ejecutar
getAuthToken(); 