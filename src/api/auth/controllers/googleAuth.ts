import { OAuth2Client } from 'google-auth-library';

export default ({ strapi }: { strapi: any }) => ({
  // Callback de Google OAuth
  async googleCallback(ctx: any) {
    try {
      const { code, redirect_uri } = ctx.request.body;

      if (!code || !redirect_uri) {
        return ctx.badRequest('Código de autorización y URI de redirección son requeridos');
      }

      // Crear cliente OAuth2 de Google
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri
      );

      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        return ctx.badRequest('No se pudo obtener el token de acceso de Google');
      }

      // Obtener información del usuario de Google
      const userInfo = await this.getGoogleUserInfo(tokens.access_token);
      
      if (!userInfo) {
        return ctx.badRequest('No se pudo obtener la información del usuario de Google');
      }

      // Buscar o crear usuario en la base de datos
      const user = await this.findOrCreateGoogleUser(userInfo);

      // Generar JWT de Strapi
      const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      // Retornar JWT y datos del usuario
      return ctx.send({
        jwt,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          provider: user.provider,
        },
        message: 'Autenticación con Google exitosa'
      });

    } catch (error) {
      strapi.log.error('Error en googleCallback:', error);
      return ctx.internalServerError('Error interno del servidor');
    }
  },

  // Obtener información del usuario de Google
  async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario de Google');
      }

      return await response.json();
    } catch (error) {
      strapi.log.error('Error al obtener información de Google:', error);
      return null;
    }
  },

  // Buscar o crear usuario de Google
  async findOrCreateGoogleUser(googleUserInfo: any) {
    try {
      // Buscar usuario existente por email
      let user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: googleUserInfo.email }
      });

      // Datos para el profile
      const profileData = {
        firstName: googleUserInfo.given_name || '',
        lastName: googleUserInfo.family_name || '',
        avatar: googleUserInfo.picture || '',
        // Puedes agregar más campos si lo deseas
      };

      if (user) {
        // Usuario existe, actualizar información de Google si es necesario
        await strapi.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: {
            provider: 'google',
            authProvider: 'google',
            googleId: googleUserInfo.id,
            confirmed: true,
          }
        });

        // Buscar profile existente
        let profile = await strapi.query('api::profile.profile').findOne({
          where: { users_permissions_user: user.id }
        });
        if (profile) {
          // Actualizar profile con datos de Google
          await strapi.query('api::profile.profile').update({
            where: { id: profile.id },
            data: profileData
          });
        } else {
          // Crear profile si no existe
          await strapi.query('api::profile.profile').create({
            data: {
              ...profileData,
              users_permissions_user: user.id
            }
          });
        }
        return user;
      }

      // Crear nuevo usuario
      const newUser = await strapi.plugins['users-permissions'].services.user.add({
        username: googleUserInfo.name || googleUserInfo.email.split('@')[0],
        email: googleUserInfo.email,
        password: this.generateRandomPassword(), // Contraseña aleatoria para usuarios de Google
        provider: 'google',
        authProvider: 'google',
        googleId: googleUserInfo.id,
        confirmed: true,
        blocked: false,
        role: 1, // Role por defecto (authenticated)
      });

      // Crear profile para el nuevo usuario
      await strapi.query('api::profile.profile').create({
        data: {
          ...profileData,
          users_permissions_user: newUser.id
        }
      });

      return newUser;
    } catch (error) {
      strapi.log.error('Error al buscar/crear usuario de Google:', error);
      throw error;
    }
  },

  // Generar contraseña aleatoria para usuarios de Google
  generateRandomPassword(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },

  // Sincronización desde NextAuth
  async nextAuthSync(ctx) {
    try {
      const { email, username, provider, googleId, firstName, lastName, avatar } = ctx.request.body;
      if (!email || !provider || !googleId) {
        return ctx.badRequest('Faltan datos obligatorios');
      }
      // Buscar usuario existente
      let user = await strapi.query('plugin::users-permissions.user').findOne({ where: { email } });
      const profileData = {
        firstName: firstName || '',
        lastName: lastName || '',
        avatar: avatar || '',
      };
      if (user) {
        // Actualizar provider y datos de Google si es necesario
        await strapi.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: {
            provider,
            authProvider: 'google',
            googleId,
            username: username || user.username,
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            avatar: avatar || user.avatar,
            confirmed: true,
          },
        });
        // Buscar profile existente
        let profile = await strapi.query('api::profile.profile').findOne({
          where: { users_permissions_user: user.id }
        });
        if (profile) {
          await strapi.query('api::profile.profile').update({
            where: { id: profile.id },
            data: profileData
          });
        } else {
          await strapi.query('api::profile.profile').create({
            data: {
              ...profileData,
              users_permissions_user: user.id
            }
          });
        }
      } else {
        // Crear nuevo usuario
        const newUser = await strapi.plugins['users-permissions'].services.user.add({
          email,
          username: username || email.split('@')[0],
          provider,
          authProvider: 'google',
          googleId,
          firstName,
          lastName,
          avatar,
          password: Math.random().toString(36).slice(-12),
          confirmed: true,
          blocked: false,
          role: 1,
        });
        await strapi.query('api::profile.profile').create({
          data: {
            ...profileData,
            users_permissions_user: newUser.id
          }
        });
      }
      return ctx.send({ success: true });
    } catch (error) {
      strapi.log.error('Error en nextAuthSync:', error);
      return ctx.internalServerError('Error interno al sincronizar usuario Google');
    }
  },
});


