const { createStrapi } = require('@strapi/strapi');

async function createTestOrders() {
  const strapi = await createStrapi();
  await strapi.start();

  try {
    console.log('🚀 Creando órdenes de prueba...');

    // Obtener usuarios existentes
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      limit: 5
    });

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos. Crea usuarios primero.');
      return;
    }

    // Obtener productos existentes
    const products = await strapi.entityService.findMany('api::product.product', {
      limit: 10
    });

    if (products.length === 0) {
      console.log('❌ No hay productos en la base de datos. Crea productos primero.');
      return;
    }

    console.log(`📊 Usuarios encontrados: ${users.length}`);
    console.log(`📊 Productos encontrados: ${products.length}`);

    // Crear órdenes para los últimos 10 días
    const orders = [];
    const today = new Date();
    
    for (let i = 0; i < 20; i++) {
      const orderDate = new Date(today);
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 10));
      orderDate.setHours(Math.floor(Math.random() * 24));
      orderDate.setMinutes(Math.floor(Math.random() * 60));

      const user = users[Math.floor(Math.random() * users.length)];
      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items por orden
      
      let subtotal = 0;
      const orderItems = [];

      // Crear items de la orden
      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 cantidad
        const price = parseFloat((Math.random() * 100 + 10).toFixed(2)); // $10-$110
        const itemSubtotal = price * quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          product: product.id,
          name: product.name || `Producto ${product.id}`,
          quantity,
          price,
          subtotal: itemSubtotal,
          image: product.images?.[0]?.url || null
        });
      }

      const tax = subtotal * 0.21; // 21% IVA
      const shipping = subtotal > 50 ? 0 : 5.99; // Envío gratis si > $50
      const discount = Math.random() > 0.7 ? subtotal * 0.1 : 0; // 10% descuento ocasional
      const total = subtotal + tax + shipping - discount;

      const order = {
        orderNumber: `ORD-${Date.now()}-${i}`,
        orderStatus: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 5)],
        paymentStatus: ['pending', 'paid', 'failed'][Math.floor(Math.random() * 3)],
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        currency: 'EUR',
        shippingMethod: 'Standard',
        user: user.id,
        createdAt: orderDate.toISOString(),
        updatedAt: orderDate.toISOString()
      };

      orders.push({ order, orderItems });
    }

    // Crear las órdenes en la base de datos
    for (const { order, orderItems } of orders) {
      try {
        const createdOrder = await strapi.entityService.create('api::order.order', {
          data: order
        });

        // Crear los items de la orden
        for (const item of orderItems) {
          await strapi.entityService.create('api::order-item.order-item', {
            data: {
              ...item,
              order: createdOrder.id
            }
          });
        }

        console.log(`✅ Orden creada: ${order.orderNumber} - Total: €${order.total}`);
      } catch (error) {
        console.error(`❌ Error creando orden ${order.orderNumber}:`, error.message);
      }
    }

    console.log('🎉 Órdenes de prueba creadas exitosamente!');
    
    // Mostrar estadísticas
    const totalOrders = await strapi.entityService.count('api::order.order');
    const totalOrderItems = await strapi.entityService.count('api::order-item.order-item');
    
    console.log(`📊 Total de órdenes en la BD: ${totalOrders}`);
    console.log(`📊 Total de items de órdenes en la BD: ${totalOrderItems}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await strapi.destroy();
  }
}

createTestOrders();
