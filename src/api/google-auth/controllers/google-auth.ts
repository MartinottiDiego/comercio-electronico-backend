import { Context } from 'koa';

/**
 * Descargar imagen de Google y subirla a Strapi
 */
async function uploadGoogleAvatar(imageUrl: string, email: string) {
  try {

    
    // Descargar la imagen de Google
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `google_avatar_${email.split('@')[0]}_${Date.now()}.jpg`;
    
    // Crear un FormData como lo hace el frontend
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('files', blob, filename);
    
    // Usar el endpoint /api/upload como lo hace el frontend
    const uploadResponse = await fetch(`${strapi.config.server.url}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Error al subir imagen: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const uploadData = await uploadResponse.json();
    const uploadedFile = Array.isArray(uploadData) ? uploadData[0] : uploadData;
    

    return uploadedFile; // Retornar el archivo subido
    
  } catch (error) {
    console.error('❌ Error subiendo avatar:', error);
    return null;
  }
}

export default {
  /**
   * Sincronización desde NextAuth
   */
  async nextAuthSync(ctx: Context) {
    try {
      const { email, username, provider, googleId, firstName, lastName, avatar, phone } = ctx.request.body as any;
      
      if (!email || !provider || !googleId) {
        return ctx.badRequest('Faltan datos obligatorios');
      }

      // Buscar usuario existente por email
      let user = await strapi.query('plugin::users-permissions.user').findOne({ 
        where: { email },
        populate: ['role', 'profile']
      });
      


      if (user) {
        // Obtener el rol "Authenticated" para asegurarnos de que el usuario tiene rol
        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' }
        });
        

        
        // Descargar y subir avatar si se proporciona
        let uploadedAvatar = null;
        if (avatar) {
          uploadedAvatar = await uploadGoogleAvatar(avatar, email);
        }
        
        // Usuario ya existe, actualizar datos de Google si es necesario
        await strapi.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: {
            provider: 'google',
            authProvider: 'google',
            confirmed: true,
            isGoogleUser: true,
            role: authenticatedRole?.id || 1, // Asegurar que tiene rol
          },
        });

        // Actualizar o crear profile si no existe
        if (user.profile) {
          // Preparar datos para actualizar (incluyendo avatar si se subió)
          const updateData: any = {
            firstName: firstName || user.profile.firstName,
            lastName: lastName || user.profile.lastName,
            roleUser: user.profile.roleUser || 'comprador',
          };
          
          if (uploadedAvatar) {
            updateData.avatar = uploadedAvatar.id;
          }
          
          // Actualizar profile existente
          await strapi.query('api::profile.profile').update({
            where: { id: user.profile.id },
            data: updateData
          });
        } else {
          // Preparar datos para crear profile
          const createData: any = {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: '', // Phone requerido pero vacío inicialmente
            roleUser: 'comprador',
            users_permissions_user: user.id
          };
          
          if (uploadedAvatar) {
            createData.avatar = uploadedAvatar.id;
          }
          
          // Crear profile si no existe
          await strapi.query('api::profile.profile').create({
            data: createData
          });
        }
      } else {
        // Crear nuevo usuario siguiendo el patrón del registro normal
        
        // 1. Obtener el rol "Authenticated" dinámicamente
        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' }
        });
        

        
        // Descargar y subir avatar si se proporciona
        let uploadedAvatar = null;
        if (avatar) {
          uploadedAvatar = await uploadGoogleAvatar(avatar, email);
        }
        
        // 2. Crear usuario con role authenticated correcto
        const newUser = await strapi.plugins['users-permissions'].services.user.add({
          username: username || email.split('@')[0],
          email: email,
          password: Math.random().toString(36).slice(-12), // Password aleatorio
          provider: 'google',
          authProvider: 'google',
          confirmed: true,
          blocked: false,
          role: authenticatedRole?.id || 1, // Role authenticated dinámico
          isGoogleUser: true,
        });

        // Preparar datos para crear profile
        const createData: any = {
          firstName: firstName || '',
          lastName: lastName || '',
          phone: '', // Phone requerido pero vacío inicialmente  
          roleUser: 'comprador', // Rol por defecto para nuevos usuarios
          users_permissions_user: newUser.id
        };
        
        if (uploadedAvatar) {
          createData.avatar = uploadedAvatar.id;
        }

        // 3. Crear profile con roleUser comprador
        await strapi.query('api::profile.profile').create({
          data: createData
        });

        user = newUser;
      }

      // Obtener los datos completos del usuario con profile para retornar
      const userWithProfile = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
        populate: ['role', 'profile']
      });
      


      // 🔑 GENERAR JWT de Strapi
      const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: userWithProfile.id });

      return ctx.send({ 
        success: true, 
        user: {
          id: userWithProfile.id,
          email: userWithProfile.email,
          username: userWithProfile.username,
          role: userWithProfile.profile?.roleUser || 'comprador',
          firstName: userWithProfile.profile?.firstName || '',
          lastName: userWithProfile.profile?.lastName || '',
          phone: userWithProfile.profile?.phone || '',
          provider: userWithProfile.provider,
          isGoogleUser: userWithProfile.isGoogleUser || true, // Para usuarios de Google
          jwt: jwt // ✨ Incluir JWT de Strapi
        }
      });
    } catch (error) {
      strapi.log.error('Error en nextAuthSync:', error);
      return ctx.internalServerError('Error interno al sincronizar usuario');
    }
  },
};
