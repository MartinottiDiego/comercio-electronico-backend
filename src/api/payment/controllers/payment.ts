/**
 * payment controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::payment.payment', ({ strapi }) => ({
  // Método para obtener pagos con información del usuario
  async find(ctx) {
    try {
      const { data, meta } = await super.find(ctx);
      
      // Si hay datos, poblar la información del usuario
      if (data && data.length > 0) {
        const populatedData = await Promise.all(
          data.map(async (payment: any) => {
            // Verificar si el pago tiene usuario y obtener el ID del usuario
            const userId = payment.attributes?.user || payment.user;
            
            if (userId) {
              try {
                const user = await strapi.entityService.findOne(
                  'plugin::users-permissions.user',
                  userId,
                  {
                    populate: ['profile']
                  }
                );
                
                return {
                  ...payment,
                  attributes: {
                    ...payment.attributes,
                    user: user ? {
                      id: user.id,
                      email: user.email,
                      username: user.username,
                      profile: (user as any).profile || null
                    } : null
                  }
                };
              } catch (userError) {
                console.error('Error fetching user for payment:', userError);
                return payment;
              }
            }
            return payment;
          })
        );
        
        return { data: populatedData, meta };
      }
      
      return { data, meta };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return ctx.internalServerError('Error obteniendo pagos');
    }
  },

  // Método para obtener un pago específico con información del usuario
  async findOne(ctx) {
    try {
      const { data } = await super.findOne(ctx);
      
      // Verificar si el pago tiene usuario y obtener el ID del usuario
      const userId = data?.attributes?.user || data?.user;
      
      if (data && userId) {
        try {
          const user = await strapi.entityService.findOne(
            'plugin::users-permissions.user',
            userId,
            {
              populate: ['profile']
            }
          );
          
          return {
            data: {
              ...data,
              attributes: {
                ...data.attributes,
                user: user ? {
                  id: user.id,
                  email: user.email,
                  username: user.username,
                  profile: (user as any).profile || null
                } : null
              }
            }
          };
        } catch (userError) {
          console.error('Error fetching user for payment:', userError);
          return { data };
        }
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching payment:', error);
      return ctx.internalServerError('Error obteniendo pago');
    }
  }
})); 