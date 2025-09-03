import { StrapiPlugin, StrapiRoute } from '../types';

export default (plugin: StrapiPlugin) => {
  // Personalizar las rutas de autenticación
  const authRoutes = plugin.routes['content-api'].routes;
  
  // Buscar y personalizar la ruta de forgot-password
  const forgotPasswordRoute = authRoutes.find(route => 
    route.handler === 'auth.forgotPassword'
  );
  
  if (forgotPasswordRoute) {
    forgotPasswordRoute.handler = 'auth.forgotPassword';
    forgotPasswordRoute.config = {
      auth: false, // Permitir acceso público
      policies: [],
      middlewares: []
    };
  }

  // Buscar y personalizar la ruta de reset-password
  const resetPasswordRoute = authRoutes.find(route => 
    route.handler === 'auth.resetPassword'
  );
  
  if (resetPasswordRoute) {
    resetPasswordRoute.handler = 'auth.resetPassword';
    resetPasswordRoute.config = {
      auth: false, // Permitir acceso público
      policies: [],
      middlewares: []
    };
  }

  // Buscar y personalizar la ruta de email-confirmation
  const emailConfirmationRoute = authRoutes.find(route => 
    route.handler === 'auth.emailConfirmation'
  );
  
  if (emailConfirmationRoute) {
    emailConfirmationRoute.handler = 'auth.emailConfirmation';
    emailConfirmationRoute.config = {
      auth: false, // Permitir acceso público
      policies: [],
      middlewares: []
    };
  }

  // Agregar rutas personalizadas para eliminación lógica
  const userRoutes = [
    {
      method: 'PUT',
      path: '/users/:id/restore',
      handler: 'user.restore',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/users/deleted',
      handler: 'user.findDeleted',
      config: {
        auth: true,
        policies: [],
        middlewares: []
      }
    }
  ];

  // Agregar las rutas personalizadas al plugin
  plugin.routes['content-api'].routes.push(...userRoutes);

  return plugin;
};
