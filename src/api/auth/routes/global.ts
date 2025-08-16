export default {
  routes: [
    {
      method: 'POST',
      path: '/custom-auth/forgot-password',
      handler: 'auth.forgotPassword',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Solicitar reset de contraseña',
      },
    },
    {
      method: 'POST',
      path: '/custom-auth/reset-password',
      handler: 'auth.resetPassword',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Resetear contraseña con token',
      },
    },
  ],
};
