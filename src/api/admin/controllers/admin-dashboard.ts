export default {
  async getDashboardMetrics(ctx) {
    try {
      // Get total users
      const totalUsers = await strapi.entityService.count('plugin::users-permissions.user');
      
      // Get active stores (users with role 'tienda')
      const activeStores = await strapi.entityService.count('plugin::users-permissions.user', {
        filters: {
          role: {
            name: 'tienda'
          }
        }
      });

      // Get total orders
      const totalOrders = await strapi.entityService.count('api::order.order');

      // Get total revenue (sum of all delivered orders)
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          orderStatus: 'delivered'
        }
      });

      const totalRevenue = orders.reduce((sum, order) => {
        return sum + (order.total || 0);
      }, 0);

      // Calculate conversion rate (mock data for now)
      const conversionRate = 3.2;

      // Calculate monthly visits based on user activity
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Get users who have been active this month (created or updated)
      const activeUsersThisMonth = await strapi.entityService.count('plugin::users-permissions.user', {
        filters: {
          $or: [
            {
              createdAt: {
                $gte: startOfMonth.toISOString()
              }
            },
            {
              updatedAt: {
                $gte: startOfMonth.toISOString()
              }
            }
          ]
        }
      });

      // Estimate monthly visits: active users * average sessions per user
      // This is a rough estimation - in a real app you'd track actual sessions
      const averageSessionsPerUser = 8; // Estimated based on typical e-commerce behavior
      const monthlyVisits = activeUsersThisMonth * averageSessionsPerUser;

      const metrics = {
        totalUsers,
        activeStores,
        totalOrders,
        totalRevenue,
        conversionRate,
        monthlyVisits
      };

      return { data: metrics };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      ctx.throw(500, 'Error al obtener métricas del dashboard');
    }
  },

  async getUserRegistrationData(ctx) {
    try {
      // Get users registered in the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          createdAt: {
            $gte: twelveMonthsAgo.toISOString()
          }
        }
      });

      // Group by month
      const monthlyData = users.reduce((acc, user) => {
        const date = new Date(user.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = 0;
        }
        acc[monthKey]++;
        
        return acc;
      }, {} as Record<string, number>);

      // Convert to array format for chart with Spanish month names
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const chartData = Object.entries(monthlyData).map(([month, count]) => {
        const date = new Date(month + '-01');
        const monthIndex = date.getMonth();
        return {
          mes: monthNames[monthIndex],
          usuarios: count
        };
      }).sort((a, b) => {
        // Sort by month order (Ene, Feb, Mar, etc.)
        const monthOrder = monthNames.indexOf(a.mes) - monthNames.indexOf(b.mes);
        return monthOrder;
      });

      return { data: chartData };
    } catch (error) {
      console.error('Error fetching user registration data:', error);
      ctx.throw(500, 'Error al obtener datos de registro de usuarios');
    }
  }
};