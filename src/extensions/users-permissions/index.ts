import { StrapiPlugin } from './types';
import emailConfig from './config/email';
import policies from './config/policies';
import functions from './config/functions';
import routes from './config/routes';

export default (plugin: StrapiPlugin) => {
  // SOBRESCRIBIR COMPLETAMENTE la configuración de email
  plugin.config = {
    ...plugin.config,
    ...emailConfig
  };

  // Aplicar funciones personalizadas
  plugin = functions(plugin);

  // Aplicar rutas personalizadas
  plugin = routes(plugin);

  // Configurar políticas globales
  plugin.policies = {
    ...plugin.policies,
    'global::public-auth': policies
  };

  return plugin;
};
