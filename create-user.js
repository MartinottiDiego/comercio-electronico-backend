const axios = require('axios');

// Configuración
const STRAPI_URL = 'http://localhost:1337';

// Datos del usuario a crear
const userData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'test123456',
  role: 1 // ID del rol Authenticated
};

async function createUser() {
  try {
    console.log('👤 Creando usuario de prueba...');
    
    const response = await axios.post(`${STRAPI_URL}/api/auth/local/register`, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Usuario creado exitosamente!');
    console.log('📧 Email:', response.data.user.email);
    console.log('🔑 Token:', response.data.jwt);
    console.log('\n📝 Usa este token en test-order.js');
    
    return response.data.jwt;
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('🔍 El usuario ya existe o hay un error de validación');
      console.log('💡 Intenta con diferentes credenciales o verifica en Strapi Admin');
    }
  }
}

// Ejecutar
createUser(); 