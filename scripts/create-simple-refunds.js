/**
 * Script simple para crear reembolsos de prueba
 * Usa datos existentes en la base de datos
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

async function createSimpleRefunds() {
  try {
    console.log('🔄 Creando reembolsos de prueba simples...');

    // 1. Obtener un usuario existente
    console.log('👤 Buscando usuario existente...');
    const usersResponse = await axios.get(`${STRAPI_URL}/api/users`);
    if (!usersResponse.data || usersResponse.data.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    const testUser = usersResponse.data[0];
    console.log('✅ Usuario encontrado:', testUser.email);

    // 2. Obtener una tienda existente
    console.log('🏪 Buscando tienda existente...');
    const storesResponse = await axios.get(`${STRAPI_URL}/api/stores`);
    if (!storesResponse.data || storesResponse.data.data.length === 0) {
      console.log('❌ No hay tiendas en la base de datos');
      return;
    }
    const testStore = storesResponse.data.data[0];
    console.log('✅ Tienda encontrada:', testStore.attributes.name);

    // 3. Obtener un producto existente de esa tienda
    console.log('📦 Buscando producto existente...');
    const productsResponse = await axios.get(`${STRAPI_URL}/api/products?filters[store][id][$eq]=${testStore.id}`);
    if (!productsResponse.data || productsResponse.data.data.length === 0) {
      console.log('❌ No hay productos en esa tienda');
      return;
    }
    const testProduct = productsResponse.data.data[0];
    console.log('✅ Producto encontrado:', testProduct.attributes.name);

    // 4. Crear una orden simple
    console.log('📋 Creando orden de prueba...');
    const testOrder = await axios.post(`${STRAPI_URL}/api/orders`, {
      data: {
        orderNumber: `ORD-TEST-${Date.now()}`,
        total: testProduct.attributes.price,
        status: 'delivered',
        orderStatus: 'delivered',
        user: testUser.id,
        subtotal: testProduct.attributes.price,
        tax: 0,
        shipping: 0,
        currency: 'EUR'
      }
    });
    console.log('✅ Orden creada:', testOrder.data.data.attributes.orderNumber);

    // 5. Crear order item
    console.log('📦 Creando order item...');
    await axios.post(`${STRAPI_URL}/api/order-items`, {
      data: {
        order: testOrder.data.data.id,
        product: testProduct.id,
        quantity: 1,
        price: testProduct.attributes.price,
        subtotal: testProduct.attributes.price,
        name: testProduct.attributes.name
      }
    });
    console.log('✅ Order item creado');

    // 6. Crear un pago simple
    console.log('💳 Creando pago de prueba...');
    const testPayment = await axios.post(`${STRAPI_URL}/api/payments`, {
      data: {
        amount: testProduct.attributes.price,
        currency: 'EUR',
        status: 'succeeded',
        paymentMethod: 'stripe',
        paymentIntentId: `pi_test_${Date.now()}`,
        order: testOrder.data.data.id
      }
    });
    console.log('✅ Pago creado');

    // 7. Crear reembolsos de prueba
    const refundReasons = [
      'defective_product',
      'wrong_size', 
      'damaged',
      'not_as_described',
      'other'
    ];

    const refundStatuses = [
      'pending',
      'processing',
      'completed',
      'rejected'
    ];

    console.log('🔄 Creando reembolsos de prueba...');

    for (let i = 0; i < 3; i++) {
      const reason = refundReasons[i % refundReasons.length];
      const status = refundStatuses[i % refundStatuses.length];
      
      const refund = await axios.post(`${STRAPI_URL}/api/refunds`, {
        data: {
          refundId: `REF-SIMPLE-${Date.now()}-${i}`,
          amount: testProduct.attributes.price,
          reason: reason,
          description: `Reembolso de prueba ${i + 1} - ${reason}`,
          refundStatus: status,
          currency: 'EUR',
          order: testOrder.data.data.id,
          user: testUser.id,
          payment: testPayment.data.data.id
        }
      });

      console.log(`✅ Reembolso ${i + 1} creado:`, refund.data.data.attributes.refundId, `- Estado:`, status);
    }

    console.log('🎉 ¡Reembolsos de prueba creados exitosamente!');
    console.log('📊 Ahora puedes ir a /dashboard/reembolsos para verlos');
    console.log('🔑 Usuario:', testUser.email);
    console.log('🏪 Tienda:', testStore.attributes.name);
    console.log('📦 Producto:', testProduct.attributes.name);

  } catch (error) {
    console.error('❌ Error creando reembolsos de prueba:', error.response?.data || error.message);
  }
}

// Ejecutar el script
createSimpleRefunds();
