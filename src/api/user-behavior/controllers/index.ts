export default ({ strapi }: { strapi: any }) => ({
  async find(ctx: any) {
    const { userId } = ctx.query;
    
    if (!userId) {
      return ctx.badRequest('userId is required');
    }

    try {
      const behaviors = await strapi.entityService.findMany('api::user-behavior.user-behavior', {
        filters: { userId },
        populate: ['product'],
        sort: { timestamp: 'desc' }
      });

      return { data: behaviors };
    } catch (error) {
      console.error('Error finding user behaviors:', error);
      return ctx.internalServerError('Error finding user behaviors');
    }
  },

  async create(ctx: any) {
    const { userId, productId, action, context, sessionId, metadata } = ctx.request.body;

    if (!userId || !action || !context) {
      return ctx.badRequest('userId, action, and context are required');
    }

    try {
      const behavior = await strapi.entityService.create('api::user-behavior.user-behavior', {
        data: {
          userId,
          product: productId,
          action,
          context,
          sessionId,
          timestamp: new Date(),
          metadata: metadata || {}
        }
      });

      return { data: behavior };
    } catch (error) {
      console.error('Error creating user behavior:', error);
      return ctx.internalServerError('Error creating user behavior');
    }
  }
}); 