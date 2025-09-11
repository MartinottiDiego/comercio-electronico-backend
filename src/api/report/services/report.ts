/**
 * report service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::report.report', ({ strapi }) => ({
  /**
   * Generar un nuevo informe
   */
  async generateReport(params: {
    type: 'usuarios' | 'ventas' | 'productos' | 'tiendas' | 'metricas';
    dateFrom: string;
    dateTo: string;
    userId: number;
  }) {
    const { type, dateFrom, dateTo, userId } = params;

    try {
      // Validar rango de fechas
      const startDate = new Date(dateFrom + 'T00:00:00.000Z');
      const endDate = new Date(dateTo + 'T23:59:59.999Z'); // Incluir todo el día
      const today = new Date();
      
      // Validar que las fechas sean válidas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Fechas inválidas');
      }
      
      // Validar que la fecha de inicio no sea mayor que la de fin
      if (startDate > endDate) {
        throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin');
      }
      
      // Validar que el rango no sea mayor a 1 año
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (startDate < oneYearAgo) {
        throw new Error('El rango de fechas no puede ser mayor a 1 año');
      }
      
      // Validar que la fecha de fin no sea mayor a hoy (con margen de 1 día)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (endDate > tomorrow) {
        throw new Error('La fecha de fin no puede ser mayor a mañana');
      }

      // Logs para debuggear

      // Crear el informe en estado "generating"
      const report = await strapi.entityService.create('api::report.report', {
        data: {
          type,
          title: this.getReportTitle(type),
          description: this.getReportDescription(type, dateFrom, dateTo),
          dateFrom: startDate,
          dateTo: endDate,
          reportStatus: 'generating',
          generatedBy: userId,
          metadata: {
            generatedAt: new Date().toISOString(),
            userAgent: 'admin-dashboard'
          }
        }
      });


      // Verificar que el reporte se creó correctamente con el generatedBy
      const createdReport = await strapi.entityService.findOne('api::report.report', report.id, {
        populate: ['generatedBy']
      });

      // Generar los datos del informe de forma asíncrona
      this.generateReportData(Number(report.id), type, startDate, endDate);

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  /**
   * Generar los datos del informe de forma asíncrona
   */
  async generateReportData(reportId: number, type: string, startDate: Date, endDate: Date) {
    try {
      let reportData = {};

      // Generar datos según el tipo de informe
      switch (type) {
        case 'usuarios':
          reportData = await this.generateUserReportData(startDate, endDate);
          break;
        case 'ventas':
          reportData = await this.generateSalesReportData(startDate, endDate);
          break;
        case 'productos':
          reportData = await this.generateProductReportData(startDate, endDate);
          break;
        case 'tiendas':
          reportData = await this.generateStoreReportData(startDate, endDate);
          break;
        case 'metricas':
          reportData = await this.generateMetricsReportData(startDate, endDate);
          break;
        default:
          throw new Error(`Tipo de informe no válido: ${type}`);
      }

      // Generar URL del archivo PDF (temporal)
      const fileUrl = `/api/reports/${reportId}/download`;

      // Actualizar el informe con los datos generados
      await strapi.entityService.update('api::report.report', reportId, {
        data: {
          reportStatus: 'completed',
          data: reportData,
          fileUrl: fileUrl,
          metadata: {
            ...(reportData as any).metadata,
            completedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error('Error generating report data:', error);
      
      // Marcar el informe como fallido
      await strapi.entityService.update('api::report.report', reportId, {
        data: {
          reportStatus: 'failed',
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString()
          }
        }
      });
    }
  },

  /**
   * Generar datos de informe de usuarios
   */
  async generateUserReportData(startDate: Date, endDate: Date) {
    // Obtener usuarios en el rango de fechas
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      }
    });

    // Obtener usuarios activos (que han actualizado su perfil en el período)
    const activeUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        updatedAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      }
    });

    // Obtener total de usuarios
    const totalUsers = await strapi.entityService.count('plugin::users-permissions.user');

    // Calcular la diferencia de tiempo para determinar la granularidad
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    const yearsDiff = endDate.getFullYear() - startDate.getFullYear();

    let temporalDistribution = {};

    if (yearsDiff > 1) {
      // Distribución por año
      temporalDistribution = this.groupUsersByYear(users);
    } else if (monthsDiff > 1) {
      // Distribución por mes
      temporalDistribution = this.groupUsersByMonth(users);
    } else {
      // Distribución por día
      temporalDistribution = this.groupUsersByDay(users, startDate, endDate);
    }

    return {
      totalUsers,
      newUsers: users.length,
      activeUsers: activeUsers.length,
      temporalDistribution,
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        granularity: yearsDiff > 1 ? 'year' : monthsDiff > 1 ? 'month' : 'day'
      }
    };
  },

  /**
   * Agrupar usuarios por año
   */
  groupUsersByYear(users: any[]) {
    const distribution: { [key: string]: number } = {};
    users.forEach(user => {
      const year = new Date(user.createdAt).getFullYear();
      distribution[year] = (distribution[year] || 0) + 1;
    });
    return distribution;
  },

  /**
   * Agrupar usuarios por mes
   */
  groupUsersByMonth(users: any[]) {
    const distribution: { [key: string]: number } = {};
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      distribution[monthName] = (distribution[monthName] || 0) + 1;
    });
    return distribution;
  },

  /**
   * Agrupar usuarios por día
   */
  groupUsersByDay(users: any[], startDate: Date, endDate: Date) {
    const distribution: { [key: string]: number } = {};
    
    // Inicializar todos los días en el rango con 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayKey = currentDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      distribution[dayKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Contar usuarios por día
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const dayKey = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      if (distribution.hasOwnProperty(dayKey)) {
        distribution[dayKey] += 1;
      }
    });
    
    return distribution;
  },

  /**
   * Generar datos de informe de ventas
   */
  async generateSalesReportData(startDate: Date, endDate: Date) {
    // Primero, obtener TODAS las órdenes para ver qué fechas tienen
    const allOrders = await strapi.entityService.findMany('api::order.order', {
      populate: ['order_items', 'order_items.product']
    });


    // Obtener todas las órdenes en el rango de fechas (admin puede ver todas)
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      },
      populate: ['order_items', 'order_items.product']
    });


    // Calcular total de ventas
    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calcular promedio por orden
    const averageOrder = orders.length > 0 ? totalSales / orders.length : 0;

    // Obtener productos más vendidos reales
    const productSales: { [key: string]: number } = {};
    orders.forEach(order => {
      const orderItems = (order as any).order_items;
      if (orderItems) {
        orderItems.forEach((item: any) => {
          const productName = item.product?.title || 'Producto desconocido';
          const quantity = item.quantity || 0;
          productSales[productName] = (productSales[productName] || 0) + quantity;
        });
      }
    });

    // Ordenar productos por cantidad vendida
    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    // Obtener detalles de ventas individuales
    const salesDetails = orders.map(order => {
      const orderItems = (order as any).order_items;
      return {
        id: order.id,
        date: order.createdAt,
        total: order.total || 0,
        items: orderItems?.map((item: any) => ({
          product: item.product?.title || 'Producto desconocido',
          quantity: item.quantity || 0,
          price: item.price || 0,
          subtotal: (item.quantity || 0) * (item.price || 0)
        })) || []
      };
    });

    return {
      totalSales,
      transactions: orders.length,
      averageOrder: Math.round(averageOrder * 100) / 100,
      topProducts,
      salesDetails,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }
    };
  },

  /**
   * Generar datos de informe de productos
   */
  async generateProductReportData(startDate: Date, endDate: Date) {
    // Obtener todas las órdenes en el rango de fechas para calcular ventas
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      },
      populate: ['order_items', 'order_items.product', 'order_items.product.store']
    });

    // Obtener todos los productos para estadísticas generales
    const allProducts = await strapi.entityService.findMany('api::product.product', {
      populate: ['store', 'categories']
    });

    // Calcular estadísticas de stock
    const inStockProducts = allProducts.filter(p => (p as any).stock > 0).length;
    const outOfStockProducts = allProducts.filter(p => (p as any).stock <= 0).length;

    // Calcular productos más vendidos con detalles completos
    const productSales: { [key: string]: any } = {};
    orders.forEach(order => {
      const orderItems = (order as any).order_items;
      if (orderItems) {
        orderItems.forEach((item: any) => {
          const productId = item.product?.id;
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = {
                id: productId,
                name: item.product?.title || 'Producto desconocido',
                price: item.product?.price || 0,
                stock: item.product?.stock || 0,
                store: item.product?.store?.name || 'Tienda no asignada',
                storeId: item.product?.store?.id || null,
                totalQuantity: 0,
                totalSales: 0,
                totalRevenue: 0,
                categories: item.product?.categories?.map((cat: any) => cat.name).join(', ') || 'Sin categoría'
              };
            }
            productSales[productId].totalQuantity += item.quantity || 0;
            productSales[productId].totalSales += 1;
            productSales[productId].totalRevenue += (item.quantity || 0) * (item.price || 0);
          }
        });
      }
    });

    // Ordenar productos por cantidad vendida
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // Calcular productos más rentables (por ingresos)
    const topRevenueProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Estadísticas por tienda
    const storeStats: { [key: string]: any } = {};
    Object.values(productSales).forEach((product: any) => {
      const storeName = product.store;
      if (!storeStats[storeName]) {
        storeStats[storeName] = {
          name: storeName,
          totalProducts: 0,
          totalSales: 0,
          totalRevenue: 0
        };
      }
      storeStats[storeName].totalProducts += 1;
      storeStats[storeName].totalSales += product.totalSales;
      storeStats[storeName].totalRevenue += product.totalRevenue;
    });

    const topStores = Object.values(storeStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return {
      totalProducts: allProducts.length,
      inStockProducts,
      outOfStockProducts,
      newProducts: allProducts.filter(p => new Date(p.createdAt) >= startDate).length,
      topProducts,
      topRevenueProducts,
      topStores,
      totalSales: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`
      }
    };
  },

  /**
   * Generar datos de informe de tiendas
   */
  async generateStoreReportData(startDate: Date, endDate: Date) {
    // Obtener tiendas creadas en el rango de fechas
    const stores = await strapi.entityService.findMany('api::store.store', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      }
    });

    // Obtener tiendas activas
    const activeStores = await strapi.entityService.findMany('api::store.store', {
      filters: {
        active: true
      }
    });

    // Obtener total de tiendas
    const totalStores = await strapi.entityService.count('api::store.store');

    // Simular tiendas con mejor rendimiento
    const topPerformingStores = [
      { name: 'TechStore', sales: Math.floor(Math.random() * 50000) + 10000 },
      { name: 'FashionHub', sales: Math.floor(Math.random() * 40000) + 8000 },
      { name: 'HomeGoods', sales: Math.floor(Math.random() * 30000) + 5000 }
    ];

    return {
      totalStores,
      newStores: stores.length,
      activeStores: activeStores.length,
      topPerformingStores,
      averageStoreRating: (Math.random() * 2 + 3).toFixed(1),
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`
      }
    };
  },

  /**
   * Generar datos de informe de métricas
   */
  async generateMetricsReportData(startDate: Date, endDate: Date) {
    // Obtener datos reales de la aplicación
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      },
      populate: ['order_items', 'order_items.product']
    });

    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      }
    });

    const products = await strapi.entityService.findMany('api::product.product', {
      populate: ['store']
    });

    const stores = await strapi.entityService.findMany('api::store.store');

    // Calcular métricas de tráfico (simuladas pero realistas)
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const totalProducts = products.length;
    const totalStores = stores.length;
    
    // Simular métricas de tráfico basadas en datos reales
    const pageViews = Math.floor(totalOrders * 15 + totalUsers * 8 + Math.random() * 10000) + 10000;
    const uniqueVisitors = Math.floor(totalUsers * 1.5 + Math.random() * 500) + 100;
    const sessions = Math.floor(uniqueVisitors * 2.3 + Math.random() * 200) + 50;
    
    // Calcular métricas de conversión
    const conversionRate = totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(1) : '0.0';
    const bounceRate = (Math.random() * 15 + 25).toFixed(1);
    const averageSessionDuration = Math.floor(Math.random() * 3 + 2) + ' min ' + Math.floor(Math.random() * 60) + ' seg';
    
    // Calcular métricas de ventas
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';
    const revenuePerUser = totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : '0.00';
    
    // Calcular métricas de productos
    const productsInStock = products.filter(p => (p as any).stock > 0).length;
    const outOfStockProducts = products.filter(p => (p as any).stock <= 0).length;
    const averageProductPrice = products.length > 0 ? 
      (products.reduce((sum, p) => sum + ((p as any).price || 0), 0) / products.length).toFixed(2) : '0.00';
    
    // Calcular métricas de tiendas
    const activeStores = stores.filter(s => (s as any).active !== false).length;
    const averageProductsPerStore = stores.length > 0 ? (totalProducts / stores.length).toFixed(1) : '0.0';
    
    // Calcular métricas de rendimiento por hora (simulado)
    const hourlyDistribution = this.calculateHourlyDistribution(orders);
    
    // Calcular métricas de fuentes de tráfico (simulado)
    const trafficSources = {
      direct: Math.floor(uniqueVisitors * 0.40),
      search: Math.floor(uniqueVisitors * 0.35),
      social: Math.floor(uniqueVisitors * 0.15),
      referral: Math.floor(uniqueVisitors * 0.10)
    };

    return {
      // Métricas de tráfico
      pageViews,
      uniqueVisitors,
      sessions,
      bounceRate: bounceRate + '%',
      averageSessionDuration,
      
      // Métricas de conversión
      conversionRate: conversionRate + '%',
      totalOrders,
      totalUsers,
      
      // Métricas de ventas
      totalRevenue,
      averageOrderValue: '$' + averageOrderValue,
      revenuePerUser: '$' + revenuePerUser,
      
      // Métricas de productos
      totalProducts,
      productsInStock,
      outOfStockProducts,
      averageProductPrice: '$' + averageProductPrice,
      
      // Métricas de tiendas
      totalStores,
      activeStores,
      averageProductsPerStore,
      
      // Distribución temporal
      hourlyDistribution,
      
      // Fuentes de tráfico
      trafficSources,
      
      metadata: {
        generatedAt: new Date().toISOString(),
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`
      }
    };
  },

  /**
   * Calcular distribución de tráfico por hora
   */
  calculateHourlyDistribution(orders: any[]) {
    const hourlyData: { [key: string]: number } = {};
    
    // Inicializar todas las horas con 0
    for (let i = 0; i < 24; i++) {
      hourlyData[`${i.toString().padStart(2, '0')}:00`] = 0;
    }
    
    // Simular distribución basada en órdenes (más actividad en horas comerciales)
    orders.forEach(() => {
      const hour = Math.floor(Math.random() * 24);
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourKey] += 1;
    });
    
    // Añadir tráfico base simulado
    Object.keys(hourlyData).forEach(hour => {
      const hourNum = parseInt(hour.split(':')[0]);
      let baseTraffic = 0;
      
      // Más tráfico en horas comerciales (9-17)
      if (hourNum >= 9 && hourNum <= 17) {
        baseTraffic = Math.floor(Math.random() * 20) + 10;
      } else if (hourNum >= 18 && hourNum <= 22) {
        baseTraffic = Math.floor(Math.random() * 15) + 5;
      } else {
        baseTraffic = Math.floor(Math.random() * 5) + 1;
      }
      
      hourlyData[hour] += baseTraffic;
    });
    
    return hourlyData;
  },

  /**
   * Obtener título del informe según el tipo
   */
  getReportTitle(type: string): string {
    const titles = {
      'usuarios': 'Usuarios registrados',
      'ventas': 'Ventas y transacciones',
      'productos': 'Productos más vendidos',
      'tiendas': 'Rendimiento de tiendas',
      'metricas': 'Métricas del sitio'
    };
    return titles[type] || 'Informe general';
  },

  /**
   * Obtener descripción del informe
   */
  getReportDescription(type: string, dateFrom: string, dateTo: string): string {
    const typeName = this.getReportTitle(type);
    return `Informe de ${typeName.toLowerCase()} generado automáticamente con datos del período ${dateFrom} al ${dateTo}.`;
  },

  /**
   * Obtener estadísticas de informes
   */
  async getReportStats(userId?: number) {
    try {
      // Si se proporciona userId, filtrar por usuario, sino mostrar todos
      const baseFilters = userId ? { generatedBy: { id: userId } } : {};

      const totalReports = await strapi.entityService.count('api::report.report', {
        filters: baseFilters
      });

      const completedReports = await strapi.entityService.count('api::report.report', {
        filters: { 
          ...baseFilters,
          reportStatus: 'completed'
        }
      });

      const failedReports = await strapi.entityService.count('api::report.report', {
        filters: { 
          ...baseFilters,
          reportStatus: 'failed'
        }
      });

      return {
        total: totalReports,
        completed: completedReports,
        failed: failedReports,
        successRate: totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting report stats:', error);
      throw error;
    }
  }
}));
