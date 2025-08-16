export default {
  routes: [
    {
      method: 'POST',
      path: '/api/custom-auth/forgot-password',
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
      path: '/api/custom-auth/reset-password',
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
    {
      method: 'POST',
      path: '/api/auth/google/nextauth',
      handler: 'google-auth.nextAuthSync',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Sincroniza usuario Google desde NextAuth',
      },
    },
  ],
};
