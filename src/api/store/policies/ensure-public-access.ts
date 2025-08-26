export default (policyContext, config, { strapi }) => {
  // Policy para endpoints públicos - siempre permitir acceso
  return true;
};
