import { Context } from 'koa';

/**
 * Descargar imagen de Google y subirla a Strapi v5
 * SOLUCIÓN DEFINITIVA: Usando la API REST de Strapi desde el servidor
 */
async function uploadGoogleAvatar(imageUrl: string, email: string) {
  try {
    console.log('🚀 Iniciando subida de avatar para:', email);
    console.log('📥 URL de imagen:', imageUrl);
    
    // Validar URL de imagen
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('URL de imagen inválida');
    }
    
    // Descargar la imagen de Google
    console.log('⬇️ Descargando imagen de Google...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.status} ${response.statusText}`);
    }
    
    // Verificar que es una imagen
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Tipo de contenido inválido: ${contentType}`);
    }
    
    console.log('✅ Imagen descargada exitosamente - Tipo:', contentType);
    
    // Obtener el buffer de la imagen
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Validar tamaño del archivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      throw new Error(`Imagen demasiado grande: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (máximo 5MB)`);
    }
    
    console.log('📊 Tamaño del buffer:', (buffer.length / 1024).toFixed(2), 'KB');
    
    // Determinar extensión basada en el content-type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';
    
    const filename = `google_avatar_${email.split('@')[0]}_${Date.now()}.${extension}`;
    console.log('📝 Nombre del archivo:', filename);
    
    // MÉTODO DEFINITIVO: Usar la API REST de Strapi desde el servidor
    console.log('🚀 Subiendo archivo usando API REST de Strapi...');
    
    // Crear FormData nativo (más robusto que construcción manual)
    const formData = new FormData();
    
    // Crear un Blob desde el buffer para mantener la integridad de la imagen
    const blob = new Blob([buffer], { type: contentType });
    
    // Agregar el archivo al FormData
    formData.append('files', blob, filename);
    
    // Agregar metadata del archivo
    formData.append('fileInfo', JSON.stringify({
      name: filename,
      alternativeText: `Avatar de Google para ${email}`,
      caption: `Avatar de ${email} sincronizado desde Google`,
    }));
    
    console.log('📁 Preparando petición a API REST...');
    
    // Obtener la URL base del servidor
    const serverUrl = strapi.config.get('server.url') || 'http://localhost:1337';
    
    // Hacer la petición a la API REST de Strapi
    const uploadResponse = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      body: formData,
      // NO agregar Content-Type manualmente, fetch lo maneja automáticamente
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Error en API REST: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
    }
    
    const uploadedFiles = await uploadResponse.json();
    console.log('✅ Upload completado exitosamente via API REST');
    
    // Procesar resultado del upload
    let uploadedFile;
    if (Array.isArray(uploadedFiles)) {
      uploadedFile = uploadedFiles[0];
    } else {
      uploadedFile = uploadedFiles;
    }
    
    if (!uploadedFile || !uploadedFile.id) {
      throw new Error('No se pudo obtener el archivo subido correctamente');
    }
    
    console.log('🎯 Archivo subido exitosamente - ID:', uploadedFile.id, 'URL:', uploadedFile.url);
    
    return uploadedFile;
    
  } catch (error) {
    console.error('❌ Error subiendo avatar de Google:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('❌ Detalles del error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return null;
  }
}

/**
 * MÉTODO ALTERNATIVO: Usando fetch con el local server si el anterior falla
 * Este método hace la petición directamente a localhost bypass de la red externa
 */
async function uploadGoogleAvatarLocal(imageUrl: string, email: string) {
  try {
    console.log('🚀 Iniciando subida de avatar (método local) para:', email);
    console.log('📥 URL de imagen:', imageUrl);
    
    // Validar URL de imagen
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('URL de imagen inválida');
    }
    
    // Descargar la imagen de Google
    console.log('⬇️ Descargando imagen de Google...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.status} ${response.statusText}`);
    }
    
    // Verificar que es una imagen
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Tipo de contenido inválido: ${contentType}`);
    }
    
    console.log('✅ Imagen descargada exitosamente - Tipo:', contentType);
    
    // Obtener el buffer de la imagen
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Validar tamaño del archivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      throw new Error(`Imagen demasiado grande: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (máximo 5MB)`);
    }
    
    console.log('📊 Tamaño del buffer:', (buffer.length / 1024).toFixed(2), 'KB');
    
    // Determinar extensión basada en el content-type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';
    
    const filename = `google_avatar_${email.split('@')[0]}_${Date.now()}.${extension}`;
    console.log('📝 Nombre del archivo:', filename);
    
    // MÉTODO LOCAL: Usar localhost hardcoded
    console.log('🚀 Subiendo archivo usando localhost directo...');
    
    // Crear FormData nativo (más robusto que construcción manual)
    const formData = new FormData();
    
    // Crear un Blob desde el buffer para mantener la integridad de la imagen
    const blob = new Blob([buffer], { type: contentType });
    
    // Agregar el archivo al FormData
    formData.append('files', blob, filename);
    
    // Agregar metadata del archivo
    formData.append('fileInfo', JSON.stringify({
      name: filename,
      alternativeText: `Avatar de Google para ${email}`,
      caption: `Avatar de ${email} sincronizado desde Google`,
    }));
    
    console.log('📁 Preparando petición a 127.0.0.1:1337...');
    
    // Hacer la petición a 127.0.0.1 hardcoded (IPv4 explícito)
    const uploadResponse = await fetch('http://127.0.0.1:1337/api/upload', {
      method: 'POST',
      body: formData,
      // NO agregar Content-Type manualmente, fetch lo maneja automáticamente
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Error en API REST local: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
    }
    
    const uploadedFiles = await uploadResponse.json();
    console.log('✅ Upload completado exitosamente via localhost');
    
    // Procesar resultado del upload
    let uploadedFile;
    if (Array.isArray(uploadedFiles)) {
      uploadedFile = uploadedFiles[0];
    } else {
      uploadedFile = uploadedFiles;
    }
    
    if (!uploadedFile || !uploadedFile.id) {
      throw new Error('No se pudo obtener el archivo subido correctamente');
    }
    
    console.log('🎯 Archivo subido exitosamente - ID:', uploadedFile.id, 'URL:', uploadedFile.url);
    
    return uploadedFile;
    
  } catch (error) {
    console.error('❌ Error subiendo avatar de Google (método local):', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('❌ Detalles del error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return null;
  }
}

export default {
  // Endpoint para sincronizar usuario de NextAuth con Strapi
  async nextAuthSync(ctx: Context) {
    try {
      console.log('🎯 === INICIANDO SINCRONIZACIÓN DE USUARIO ===');
      
      const { email, name, avatar, provider } = ctx.request.body;
      
      if (!email) {
        return ctx.badRequest('Email es requerido');
      }
      
      console.log('📧 Datos recibidos:', { email, name, avatar: !!avatar, provider });
      
      // Extraer nombre y apellido del nombre completo
      let firstName = '';
      let lastName = '';
      let username = '';
      
      if (name) {
        const nameParts = name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        username = nameParts.join('').toLowerCase();
      }
      
      console.log('👤 Nombre procesado:', { firstName, lastName, username });
      
      // Buscar usuario existente
      console.log('🔍 Buscando usuario existente...');
      let user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
        populate: ['role', 'profile']
      });
      
      if (user) {
        console.log('✅ Usuario encontrado, ID:', user.id);
        
        // Procesar avatar de Google si se proporciona
        let uploadedAvatar = null;
        if (avatar) {
          console.log('🔄 Usuario existente, procesando avatar de Google...');
          
          // INTENTAR PRIMERO EL MÉTODO DE API REST
          uploadedAvatar = await uploadGoogleAvatar(avatar, email);
          
          // SI FALLA, INTENTAR EL MÉTODO LOCAL
          if (!uploadedAvatar) {
            console.log('⚠️ Método API REST falló, intentando método localhost...');
            uploadedAvatar = await uploadGoogleAvatarLocal(avatar, email);
          }
          
          if (uploadedAvatar) {
            console.log('✅ Avatar procesado para usuario existente:', uploadedAvatar.id);
          } else {
            console.log('⚠️ No se pudo procesar el avatar para usuario existente');
          }
        } else {
          console.log('ℹ️ No hay avatar para procesar en usuario existente');
        }
        
        // Verificar si ya tiene profile
        if (!user.profile) {
          console.log('⚠️ Usuario sin profile, creando...');
          
          // Crear profile si no existe
          const createData: any = {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: '', // Phone requerido pero vacío inicialmente
            roleUser: 'comprador', // Rol por defecto
            users_permissions_user: user.id
          };
          
          if (uploadedAvatar) {
            createData.avatar = uploadedAvatar.id;
          }
          
          await strapi.query('api::profile.profile').create({
            data: createData
          });
          console.log('✅ Profile creado para usuario existente');
        } else {
          console.log('✅ Usuario ya tiene profile');
          
          // Actualizar datos del profile existente con información más reciente de Google
          const updateData: any = {};
          
          // Actualizar nombre y apellido si se proporcionan
          if (firstName && firstName !== user.profile.firstName) {
            updateData.firstName = firstName;
            console.log('🔄 Actualizando firstName:', user.profile.firstName, '->', firstName);
          }
          
          if (lastName && lastName !== user.profile.lastName) {
            updateData.lastName = lastName;
            console.log('🔄 Actualizando lastName:', user.profile.lastName, '->', lastName);
          }
          
          // Actualizar avatar si se procesó uno nuevo
          if (uploadedAvatar) {
            updateData.avatar = uploadedAvatar.id;
            console.log('🔄 Actualizando avatar del profile existente...');
          }
          
          // Solo actualizar si hay cambios
          if (Object.keys(updateData).length > 0) {
            await strapi.query('api::profile.profile').update({
              where: { id: user.profile.id },
              data: updateData
            });
            console.log('✅ Profile actualizado con datos de Google');
          } else {
            console.log('ℹ️ No hay cambios en el profile');
          }
        }
        
        // Actualizar datos del usuario si es necesario
        if (provider === 'google') {
          const userUpdateData: any = {};
          
          // Marcar como usuario de Google si no lo está
          if (!user.isGoogleUser) {
            userUpdateData.isGoogleUser = true;
            console.log('🔄 Marcando usuario como usuario de Google');
          }
          
          // Actualizar provider si es necesario
          if (user.provider !== 'google') {
            userUpdateData.provider = 'google';
            console.log('🔄 Actualizando provider a Google');
          }
          
          // Actualizar username si es necesario
          if (username && username !== user.username) {
            userUpdateData.username = username;
            console.log('🔄 Actualizando username:', user.username, '->', username);
          }
          
          // Solo actualizar si hay cambios
          if (Object.keys(userUpdateData).length > 0) {
            await strapi.query('plugin::users-permissions.user').update({
              where: { id: user.id },
              data: userUpdateData
            });
            console.log('✅ Usuario actualizado con datos de Google');
          } else {
            console.log('ℹ️ No hay cambios en el usuario');
          }
        }
      } else {
        console.log('🆕 Usuario no encontrado, creando nuevo...');
        
        // Crear nuevo usuario siguiendo el patrón del registro normal
        
        // 1. Obtener el rol "Authenticated" dinámicamente
        const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' }
        });
        
        // Descargar y subir avatar si se proporciona
        let uploadedAvatar = null;
        if (avatar) {
          console.log('🆕 Usuario nuevo, procesando avatar de Google...');
          
          // INTENTAR PRIMERO EL MÉTODO DE API REST
          uploadedAvatar = await uploadGoogleAvatar(avatar, email);
          
          // SI FALLA, INTENTAR EL MÉTODO LOCAL
          if (!uploadedAvatar) {
            console.log('⚠️ Método API REST falló, intentando método localhost...');
            uploadedAvatar = await uploadGoogleAvatarLocal(avatar, email);
          }
          
          if (uploadedAvatar) {
            console.log('✅ Avatar procesado para usuario nuevo:', uploadedAvatar.id);
          } else {
            console.log('⚠️ No se pudo procesar el avatar para usuario nuevo');
          }
        } else {
          console.log('ℹ️ No hay avatar para procesar en usuario nuevo');
        }
        
        // 2. Crear usuario con role authenticated correcto
        console.log('👤 Creando nuevo usuario...');
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
        console.log('✅ Usuario creado exitosamente, ID:', newUser.id);

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
      console.log('🔍 Obteniendo datos completos del usuario...');
      const userWithProfile = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
        populate: ['role', 'profile', 'profile.avatar']
      });
      
      console.log('✅ Usuario con profile obtenido:', {
        id: userWithProfile.id,
        email: userWithProfile.email,
        hasProfile: !!userWithProfile.profile,
        profileRole: userWithProfile.profile?.roleUser,
        hasAvatar: !!userWithProfile.profile?.avatar
      });

      // 🔑 GENERAR JWT de Strapi
      console.log('🔑 Generando JWT de Strapi...');
      const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: userWithProfile.id });
      console.log('✅ JWT generado exitosamente');

      // Preparar respuesta con información del avatar
      const avatarInfo = userWithProfile.profile?.avatar;
      let avatarUrl = null;
      
      if (avatarInfo) {
        if (avatarInfo.url) {
          avatarUrl = avatarInfo.url;
        } else if (avatarInfo.data?.attributes?.url) {
          avatarUrl = avatarInfo.data.attributes.url;
        }
        
        // Asegurar URL completa
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const strapiUrl = strapi.config.get('server.url') || 'http://localhost:1337';
          avatarUrl = `${strapiUrl}${avatarUrl}`;
        }
      }

      const responseData = {
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
          isGoogleUser: userWithProfile.isGoogleUser || true,
          avatar: avatarUrl,
          jwt: jwt
        }
      };

      console.log('🎯 === SINCRONIZACIÓN COMPLETADA EXITOSAMENTE ===');
      console.log('📤 Enviando respuesta:', {
        userId: responseData.user.id,
        email: responseData.user.email,
        hasAvatar: !!responseData.user.avatar,
        avatarUrl: responseData.user.avatar
      });

      return ctx.send(responseData);
    } catch (error) {
      strapi.log.error('Error en nextAuthSync:', error);
      return ctx.internalServerError('Error interno al sincronizar usuario');
    }
  },
};
