export default {
  routes: [
    {
      method: 'POST',
      path: '/custom-auth/forgot-password',
      handler: 'auth.forgotPassword',
      config: {
        auth: false, // Endpoint público
        policies: [],
        middlewares: [],
        description: 'Solicitar reset de contraseña (API personalizada)',
        tag: {
          plugin: 'auth',
          name: 'Custom Forgot Password',
          actionType: 'create',
        },
      },
    },
    {
      method: 'POST',
      path: '/custom-auth/reset-password',
      handler: 'auth.resetPassword',
      config: {
        auth: false, // Endpoint público
        policies: [],
        middlewares: [],
        description: 'Resetear contraseña con token (API personalizada)',
        tag: {
          plugin: 'auth',
          name: 'Custom Reset Password',
          actionType: 'update',
        },
      },
    },

  ],
};
