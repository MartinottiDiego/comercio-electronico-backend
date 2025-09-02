/**
 * Admin Dashboard Controller
 */

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::admin.admin', ({ strapi }) => ({
  /**
   * Obtiene las métricas principales del dashboard de admin
   */
  async getDashboardMetrics(ctx: Context) {
    try {
      // Obtener métricas básicas
      const totalUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { confirmed: true }
      });

      const activeStores = await strapi.entityService.findMany('api::store.store', {
        filters: { verified: true }
      });

      const totalOrders = await strapi.entityService.findMany('api::order.order', {
        filters: { orderStatus: { $in: ['delivered', 'processing', 'shipped'] } }
      });

      const completedOrders = await strapi.entityService.findMany('api::order.order', {
        filters: { orderStatus: 'delivered' },
        populate: ['order_items']
      });

      // Calcular ingresos totales
      let totalRevenue = 0;
      completedOrders.forEach((order: any) => {
        if (order.order_items) {
          order.order_items.forEach((item: any) => {
            totalRevenue += item.price * item.quantity;
          });
        }
      });

      // Simular visitas mensuales (usuarios totales * factor)
      const monthlyVisits = totalUsers.length * 25; // Factor de visitas por usuario

      // Calcular tasa de conversión
      const conversionRate = monthlyVisits > 0 ? Math.round((totalOrders.length / monthlyVisits) * 10000) / 100 : 0;

      // Por ahora, usar valores simulados para los cambios
      const metrics = {
        totalUsers: {
          value: totalUsers.length,
          change: 12.5,
          changeType: 'positive' as const
        },
        activeStores: {
          value: activeStores.length,
          change: 8.2,
          changeType: 'positive' as const
        },
        totalOrders: {
          value: totalOrders.length,
          change: 23.1,
          changeType: 'positive' as const
        },
        totalRevenue: {
          value: Math.round(totalRevenue * 100) / 100,
          change: 15.3,
          changeType: 'positive' as const
        },
        conversionRate: {
          value: conversionRate,
          change: 0.8,
          changeType: 'positive' as const
        },
        monthlyVisits: {
          value: monthlyVisits,
          change: 18.7,
          changeType: 'positive' as const
        }
      };

      return ctx.send({
        success: true,
        data: metrics
      });

    } catch (error) {
      return ctx.internalServerError('Error obteniendo métricas del dashboard');
    }
  },

  /**
   * Obtiene los datos de usuarios registrados por mes
   */
  async getUserRegistrationData(ctx: Context) {
    try {
      // Obtener todos los usuarios
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { confirmed: true }
      });

      // Agrupar usuarios por mes de registro
      const monthlyData: { [key: string]: number } = {};
      
      // Inicializar todos los meses con 0
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      months.forEach(month => {
        monthlyData[month] = 0;
      });

      // Contar usuarios por mes
      users.forEach((user: any) => {
        if (user.createdAt) {
          const date = new Date(user.createdAt);
          const monthIndex = date.getMonth();
          const monthName = months[monthIndex];
          monthlyData[monthName]++;
        }
      });

      // Convertir a formato para el gráfico
      const chartData = months.map(month => ({
        mes: month,
        usuarios: monthlyData[month]
      }));

      return ctx.send({
        success: true,
        data: chartData
      });

    } catch (error) {
      return ctx.internalServerError('Error obteniendo datos de usuarios por mes');
    }
  }
}));
