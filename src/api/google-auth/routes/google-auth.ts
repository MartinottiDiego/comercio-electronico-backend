export default {
  routes: [
    // Sincronización desde NextAuth
    {
      method: 'POST',
      path: '/google-auth/nextauth-sync',
      handler: 'google-auth.nextAuthSync',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};


