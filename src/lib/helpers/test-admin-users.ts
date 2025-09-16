/**
 * Función de prueba para verificar que se encuentran usuarios admin
 * Esta función se puede llamar desde el panel de administración o API
 */

export async function testAdminUsers() {
  try {
    const { findAdminUsers, getAdminEmails } = require('./admin-users');
    
    console.log('🔍 Buscando usuarios admin...');
    
    const adminUsers = await findAdminUsers();
    const adminEmails = await getAdminEmails();
    
    console.log(`📊 Usuarios admin encontrados: ${adminUsers.length}`);
    console.log('👥 Detalles de usuarios admin:');
    
    adminUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.username})`);
      if (user.profile) {
        console.log(`     - Nombre: ${user.profile.firstName} ${user.profile.lastName}`);
        console.log(`     - Rol: ${user.profile.roleUser}`);
        console.log(`     - Teléfono: ${user.profile.phone}`);
      }
    });
    
    console.log('📧 Emails de admin:', adminEmails);
    
    return {
      success: true,
      count: adminUsers.length,
      users: adminUsers,
      emails: adminEmails
    };
    
  } catch (error) {
    console.error('❌ Error en testAdminUsers:', error);
    return {
      success: false,
      error: error.message,
      count: 0,
      users: [],
      emails: []
    };
  }
}


