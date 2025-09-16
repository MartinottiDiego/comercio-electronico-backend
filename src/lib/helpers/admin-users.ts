/**
 * Helper para buscar usuarios con rol admin
 */

export async function findAdminUsers() {
  try {
    // Buscar todos los usuarios que tengan un profile con roleUser = 'admin'
    const adminUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: {
        profile: {
          roleUser: 'admin'
        }
      },
      populate: {
        profile: true
      }
    });

    return adminUsers;
  } catch (error) {
    console.error('❌ Error buscando usuarios admin:', error);
    return [];
  }
}

export async function getAdminEmails() {
  try {
    const adminUsers = await findAdminUsers();
    return adminUsers.map(user => user.email).filter(email => email);
  } catch (error) {
    console.error('❌ Error obteniendo emails de admin:', error);
    return [];
  }
}


