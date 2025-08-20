import { PolicyContext } from '../types';

export default async (policyContext: PolicyContext, config: any, { strapi }: { strapi: any }) => {
  // Permitir acceso público a los endpoints de autenticación
  const { action } = policyContext;
  
  // Endpoints que deben ser públicos
  const publicEndpoints = [
    'api::auth.forgot-password',
    'api::auth.reset-password',
    'api::auth.email-confirmation',
    'api::auth.register',
    'api::auth.login',
  ];

  if (publicEndpoints.includes(action)) {
    return true;
  }

  // Para otros endpoints, verificar autenticación
  if (policyContext.state.user) {
    return true;
  }

  return false;
};
