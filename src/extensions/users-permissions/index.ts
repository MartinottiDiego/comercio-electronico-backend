import { StrapiPlugin } from './types';
import emailConfig from './config/email';
import policies from './config/policies';
import routes from './config/routes';
import userController from './controllers/user';

export default (plugin: StrapiPlugin) => {
  // SOBRESCRIBIR COMPLETAMENTE la configuración de email
  plugin.config = {
    ...plugin.config,
    ...emailConfig
  };

  // Aplicar rutas personalizadas
  plugin = routes(plugin);

  // Agregar controlador de usuario personalizado
  (plugin.controllers as any).user = userController;

  // Configurar políticas globales
  plugin.policies = {
    ...plugin.policies,
    'global::public-auth': policies
  };

  return plugin;
};
