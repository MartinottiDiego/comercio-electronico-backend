/**
 * store service
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::store.store', ({ strapi }) => ({
  async getStoreOwnerEmail(storeId: number): Promise<string | null> {
    try {
      const store = await strapi.db.query('api::store.store').findOne({
        where: { id: storeId },
        populate: {
          owner: {
            fields: ['email']
          }
        }
      });

      if (store && store.owner) {
        return store.owner.email;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo email del dueño de la tienda:', error);
      return null;
    }
  },

  async getStoreOwnerByEmail(ownerEmail: string): Promise<any | null> {
    try {
      const store = await strapi.db.query('api::store.store').findOne({
        where: {
          owner: {
            email: ownerEmail
          }
        },
        populate: {
          owner: {
            fields: ['id', 'email', 'username']
          }
        }
      });

      return store;
    } catch (error) {
      console.error('Error obteniendo tienda por email del dueño:', error);
      return null;
    }
  },

  // Nuevo método para obtener stores top-rated
  async getTopRated({ limit = 8, populate = 'image,products' }) {
    try {
      console.log('[StoresSlider] Iniciando getTopRated con límite:', limit);
      
      // Construir query para Strapi v5 - usar where en lugar de filters
      const query = {
        where: {
          rating: {
            $gt: 0, // Solo stores con rating > 0
          },
          verified: {
            $eq: true, // Solo stores verificados
          },
          storeStatus: {
            $eq: 'approved', // Solo stores aprobados
          },
          blocked: {
            $eq: false, // Solo stores no bloqueados
          },
        },
        orderBy: {
          rating: 'desc', // Ordenar por rating descendente
        },
        limit,
        populate: {
          image: {
            fields: ['url', 'alternativeText', 'width', 'height'],
          },
          products: {
            fields: ['id', 'title'],
            limit: 5, // Solo primeros 5 productos para performance
          },
        },
      };

      console.log('[StoresSlider] Query construida:', JSON.stringify(query, null, 2));

      const stores = await strapi.db.query('api::store.store').findMany(query);
      
      console.log('[StoresSlider] Tiendas encontradas:', stores.length);
      if (stores.length > 0) {
        console.log('[StoresSlider] Primera tienda:', {
          id: stores[0].id,
          name: stores[0].name,
          rating: stores[0].rating,
          verified: stores[0].verified
        });
      }
      
      // Normalizar respuesta
      const normalizedStores = stores.map(store => ({
        id: store.id,
        attributes: {
          name: store.name,
          slug: store.slug,
          description: store.description,
          rating: store.rating,
          verified: store.verified,
          blocked: store.blocked,
          storeStatus: store.storeStatus,
          specialty: store.specialty,
          location: store.location,
          image: store.image,
          products: store.products,
        },
      }));

      console.log('[StoresSlider] Respuesta normalizada:', normalizedStores.length, 'tiendas');
      return normalizedStores;
    } catch (error) {
      console.error('[StoresSlider] Error in getTopRated service:', error);
      throw new Error('Error obteniendo tiendas destacadas');
    }
  },

  // Método para calcular métricas de una store específica
  async calculateStoreMetrics(storeId: number) {
    try {
      // Obtener la store para validar que existe
      const store = await strapi.entityService.findOne('api::store.store', storeId, {
        populate: ['owner', 'products']
      });

      if (!store) {
        return {
          success: false,
          error: 'Store no encontrada'
        };
      }

      // Obtener productos directamente de la store (más eficiente)
      const products = (store as any).products || [];

      // Obtener todas las órdenes
      const orders = await strapi.entityService.findMany('api::order.order', {
        populate: {
          order_items: {
            populate: {
              product: {
                populate: ['store', 'categories']
              }
            }
          },
          user: true
        }
      });

      console.log(`[StoreService] Total de órdenes en la BD: ${orders.length}`);
      
      // Debug: Revisar estructura de las órdenes
      if (orders.length > 0) {
        const firstOrder = orders[0];
        console.log(`[StoreService] Estructura de la primera orden:`, {
          id: firstOrder.id,
          total: (firstOrder as any).total,
          createdAt: (firstOrder as any).createdAt,
          orderItems: (firstOrder as any).order_items,
          orderItemsCount: (firstOrder as any).order_items?.length || 0
        });
        
        if ((firstOrder as any).order_items?.length > 0) {
          const firstItem = (firstOrder as any).order_items[0];
          console.log(`[StoreService] Estructura del primer item:`, {
            itemId: firstItem.id,
            product: firstItem.product,
            productId: firstItem.product?.id,
            store: firstItem.product?.store,
            storeId: firstItem.product?.store?.id || firstItem.product?.store
          });
        }
      }

      // Filtrar órdenes que contienen productos de esta store
      console.log(`[StoreService] Filtrando órdenes para store ID: ${storeId}`);
      
      const filteredOrders = orders.filter(order => {
        const hasMatchingItems = (order as any).order_items?.some((item: any) => {
          const itemStoreId = item.product?.store?.id || item.product?.store;
          const itemStoreIdNum = parseInt(itemStoreId?.toString() || '0');
          const matches = itemStoreIdNum === storeId;
          
          if (matches) {
            console.log(`[StoreService] Orden ${order.id} coincide - Item store ID: ${itemStoreId}`);
          }
          
          return matches;
        });
        
        return hasMatchingItems;
      });

      console.log(`[StoreService] Órdenes filtradas: ${filteredOrders.length} de ${orders.length} total`);
      
      if (filteredOrders.length > 0) {
        console.log(`[StoreService] Primeras órdenes filtradas:`, filteredOrders.slice(0, 3).map(order => ({
          id: order.id,
          total: (order as any).total,
          createdAt: (order as any).createdAt,
          orderItems: (order as any).order_items?.length || 0
        })));
      } else {
        console.log(`[StoreService] ⚠️ NO HAY ÓRDENES FILTRADAS - Revisando datos originales:`);
        if (orders.length > 0) {
          const firstOrder = orders[0];
          console.log(`[StoreService] Primera orden original:`, {
            id: firstOrder.id,
            createdAt: (firstOrder as any).createdAt,
            orderItems: (firstOrder as any).order_items?.map((item: any) => ({
              itemId: item.id,
              productId: item.product?.id,
              productName: item.product?.name,
              storeId: item.product?.store?.id || item.product?.store,
              subtotal: item.subtotal
            }))
          });
        }
      }

      // Calcular métricas de ventas
      const salesMetrics = this.calculateSalesMetrics(filteredOrders, storeId);

      // Calcular métricas de productos
      const productMetrics = this.calculateProductMetrics(products);

      // Calcular métricas de rendimiento
      const performanceMetrics = this.calculatePerformanceMetrics(filteredOrders, products);

      // Calcular datos para gráficos
      const chartData = this.calculateChartData(filteredOrders, products, parseInt(store.id.toString()));
      console.log(`[StoreService] Datos de gráficos calculados:`, chartData);
      console.log(`[StoreService] Ventas por mes detalladas:`, chartData.salesByMonth);
      console.log(`[StoreService] Ventas por categoría detalladas:`, chartData.salesByCategory);

      // Combinar todas las métricas
      const metrics = {
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          status: store.storeStatus,
          owner: (store as any).owner?.email || 'N/A'
        },
        sales: salesMetrics,
        products: productMetrics,
        performance: performanceMetrics,
        charts: chartData,
        lastUpdated: new Date().toISOString()
      };

      console.log(`[StoreService] Métricas completas con gráficos:`, {
        hasCharts: !!metrics.charts,
        salesByMonth: metrics.charts?.salesByMonth?.length || 0,
        salesByCategory: metrics.charts?.salesByCategory?.length || 0
      });

      return {
        success: true,
        data: metrics
      };

    } catch (error) {
      console.error(`[StoreService] Error calculando métricas para store ${storeId}:`, error);
      return {
        success: false,
        error: 'Error interno calculando métricas'
      };
    }
  },

  // Método auxiliar para calcular métricas de ventas
  calculateSalesMetrics(orders: any[], storeId: number) {
    // Filtrar órdenes que realmente pertenecen a esta store
    const storeOrders = orders.filter(order => {
      return (order as any).order_items?.some((item: any) => 
        item.product?.store?.id === storeId || item.product?.store === storeId
      );
    });

    // Calcular totales
    const totalSales = storeOrders.length;
    const totalRevenue = storeOrders.reduce((sum, order) => {
      // Solo sumar el monto de los productos de esta store
      const storeOrderTotal = (order as any).order_items
        ?.filter((item: any) => 
          item.product?.store?.id === storeId || item.product?.store === storeId
        )
        .reduce((itemSum: number, item: any) => itemSum + (item.subtotal || 0), 0) || 0;
      
      return sum + storeOrderTotal;
    }, 0);

    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calcular ventas por estado
    const salesByStatus = storeOrders.reduce((acc, order) => {
      const status = (order as any).orderStatus || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Calcular ventas por mes (últimos 12 meses)
    const salesByMonth = this.calculateSalesByMonth(orders, storeId);

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      salesByStatus,
      salesByMonth,
      recentOrders: storeOrders.slice(0, 5) // Últimas 5 órdenes
    };
  },

  // Método auxiliar para calcular métricas de productos
  calculateProductMetrics(products: any[]) {
    const totalProducts = products.length;
    
    // Si no hay productos, retornar métricas vacías
    if (totalProducts === 0) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        outOfStockProducts: 0,
        totalInventoryValue: 0,
        averagePrice: 0,
        productsByCategory: {}
      };
    }

    const activeProducts = products.filter(p => (p as any).stock > 0).length;
    const outOfStockProducts = products.filter(p => (p as any).stock === 0).length;
    
    // Calcular valor total del inventario
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + ((product as any).price * (product as any).stock);
    }, 0);

    // Calcular precio promedio
    const averagePrice = totalProducts > 0 
      ? products.reduce((sum, p) => sum + (p as any).price, 0) / totalProducts 
      : 0;

    // Productos por categoría
    const productsByCategory = products.reduce((acc, product) => {
      const category = (product as any).categories?.[0]?.name || 'Sin categoría';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalInventoryValue,
      averagePrice,
      productsByCategory
    };
  },

  // Método auxiliar para calcular métricas de rendimiento
  calculatePerformanceMetrics(orders: any[], products: any[]) {
    // Calcular conversión (simulado - en un caso real tendrías datos de visitas)
    const conversionRate = orders.length > 0 ? Math.min(orders.length * 0.05, 5.0) : 0;

    // Calcular productos más vendidos
    const productSales = this.calculateProductSales(orders);
    const topSellingProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([productId, sales]) => ({
        productId,
        sales: sales as number
      }));

    // Calcular tendencias (simulado)
    const trends = {
      salesGrowth: this.calculateSalesGrowth(orders),
      productPerformance: this.calculateProductPerformance(products)
    };

    return {
      conversionRate,
      topSellingProducts,
      trends
    };
  },

  // Métodos auxiliares adicionales

  calculateProductSales(orders: any[]) {
    const productSales: { [key: string]: number } = {};

    orders.forEach(order => {
      (order as any).order_items?.forEach((item: any) => {
        if (item.product?.id) {
          const productId = item.product.id.toString();
          productSales[productId] = (productSales[productId] || 0) + item.quantity;
        }
      });
    });

    return productSales;
  },

  calculateSalesGrowth(orders: any[]) {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthOrders = orders.filter(order => {
      const orderDate = new Date((order as any).createdAt);
      return orderDate >= currentMonth;
    });

    const previousMonthOrders = orders.filter(order => {
      const orderDate = new Date((order as any).createdAt);
      return orderDate >= previousMonth && orderDate < currentMonth;
    });

    const currentSales = currentMonthOrders.length;
    const previousSales = previousMonthOrders.length;

    if (previousSales === 0) {
      return currentSales > 0 ? 100 : 0;
    }

    return ((currentSales - previousSales) / previousSales) * 100;
  },

  calculateProductPerformance(products: any[]) {
    const totalProducts = products.length;
    
    // Si no hay productos, retornar métricas vacías
    if (totalProducts === 0) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        averageRating: 0,
        stockUtilization: 0
      };
    }

    const activeProducts = products.filter(p => (p as any).stock > 0).length;
    const averageRating = products.length > 0 
      ? products.reduce((sum, p) => sum + ((p as any).rating || 0), 0) / products.length 
      : 0;

    return {
      totalProducts,
      activeProducts,
      averageRating,
      stockUtilization: totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0
    };
  },

  // Método para calcular datos de gráficos
  calculateChartData(orders: any[], products: any[], storeId: number) {
    console.log(`[StoreService] Calculando datos de gráficos para ${orders.length} órdenes y ${products.length} productos`);
    
    // Calcular ventas por mes (últimos 12 meses)
    const salesByMonth = this.calculateSalesByMonth(orders, storeId);
    console.log(`[StoreService] Ventas por mes calculadas:`, salesByMonth);
    
    // Calcular distribución por categorías
    const salesByCategory = this.calculateSalesByCategory(orders, products, storeId);
    console.log(`[StoreService] Ventas por categoría calculadas:`, salesByCategory);

    return {
      salesByMonth,
      salesByCategory
    };
  },

  // Método auxiliar para calcular ventas por mes
  calculateSalesByMonth(orders: any[], storeId: number) {
    console.log(`[StoreService] Calculando ventas por mes para ${orders.length} órdenes`);
    
    // Generar los últimos 12 meses
    const now = new Date();
    const months = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      // Filtrar órdenes de este mes
      const monthOrders = orders.filter(order => {
        const orderDate = new Date((order as any).createdAt);
        const orderMonthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonthKey === monthKey;
      });
      
      // Calcular solo el monto de los productos de esta store
      const totalAmount = monthOrders.reduce((sum, order) => {
        const storeOrderTotal = (order as any).order_items
          ?.filter((item: any) => {
            const itemStoreId = item.product?.store?.id || item.product?.store;
            const itemStoreIdNum = parseInt(itemStoreId?.toString() || '0');
            return itemStoreIdNum === storeId;
          })
          .reduce((itemSum: number, item: any) => itemSum + (item.subtotal || 0), 0) || 0;
        
        return sum + storeOrderTotal;
      }, 0);
      
      console.log(`[StoreService] ${monthName}: ${monthOrders.length} órdenes, €${totalAmount}`);
      
      months.push({
        month: monthName,
        amount: totalAmount,
        orders: monthOrders.length
      });
    }
    
    console.log(`[StoreService] Ventas por mes calculadas:`, months);
    return months;
  },

  // Método auxiliar para calcular ventas por categoría
  calculateSalesByCategory(orders: any[], products: any[], storeId: number) {
    console.log(`[StoreService] Calculando ventas por categoría para ${orders.length} órdenes y ${products.length} productos, store ID: ${storeId}`);
    
    const categoryColors = {
      'Electrónicos': '#ef4444',
      'Moda': '#22c55e',
      'Hogar': '#a855f7',
      'Deportes': '#3b82f6',
      'Otros': '#6b7280'
    };

    // Obtener categorías de productos
    const categorySales: { [key: string]: number } = {};
    
    orders.forEach(order => {
      (order as any).order_items?.forEach((item: any) => {
        // Filtrar solo productos de esta store
        const itemStoreId = item.product?.store?.id || item.product?.store;
        const itemStoreIdNum = parseInt(itemStoreId?.toString() || '0');
        
        if (itemStoreIdNum === storeId) {
          if (item.product?.categories?.[0]?.name) {
            const category = item.product.categories[0].name;
            const amount = (item.subtotal || 0);
            categorySales[category] = (categorySales[category] || 0) + amount;
            console.log(`[StoreService] ✅ Categoría: ${category}, monto: €${amount}`);
          } else {
            console.log(`[StoreService] ⚠️ Producto sin categoría: ${item.product?.title || 'Sin título'}`);
          }
        }
      });
    });

    console.log(`[StoreService] Categorías encontradas:`, Object.keys(categorySales));

    // Si no hay datos de categorías, retornar array vacío
    if (Object.keys(categorySales).length === 0) {
      console.log(`[StoreService] No hay categorías encontradas, retornando array vacío`);
      return [];
    }

    const total = Object.values(categorySales).reduce((sum, value) => sum + value, 0);
    
    const result = Object.entries(categorySales).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name as keyof typeof categoryColors] || '#6b7280',
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));

    console.log(`[StoreService] Resultado final categorías:`, result);
    return result;
  },
}));
