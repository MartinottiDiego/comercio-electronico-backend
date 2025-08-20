export default () => ({
  // Servicio personalizado para autenticación
  async validateResetToken(token: string) {
    try {
      // Validar token usando el servicio nativo de Strapi
      const user = await strapi.plugins['users-permissions'].services.user.fetch({
        resetPasswordToken: token,
      });
      
      return user;
    } catch (error) {
      strapi.log.error('Error validando token:', error);
      return null;
    }
  },
});











