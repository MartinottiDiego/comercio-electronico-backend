export default (config, { strapi }) => {
  return async (ctx, next) => {
    await next();
    
    // Normalizar respuesta para consistencia
    if (ctx.body?.data) {
      ctx.body.data = ctx.body.data.map(store => ({
        ...store,
        attributes: {
          ...store.attributes,
          // Asegurar que rating sea número
          rating: parseFloat(store.attributes.rating) || 0,
          // Asegurar que verified sea boolean
          verified: Boolean(store.attributes.verified),
        },
      }));
    }
  };
};
