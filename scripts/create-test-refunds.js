/**
 * Script para crear reembolsos de prueba usando la API de Strapi
 * Ejecutar con: node scripts/create-test-refunds.js
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const ADMIN_TOKEN = 'your-admin-token-here'; // Necesitarás obtener un token de admin

async function createTestRefunds() {
  try {
    console.log('🔄 Creando reembolsos de prueba usando Strapi API...');

    // 1. Crear un usuario de prueba
    console.log('📝 Creando usuario de prueba...');
    const testUser = await axios.post(`${STRAPI_URL}/api/users`, {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!',
      confirmed: true,
      blocked: false,
      role: 1
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Usuario de prueba creado:', testUser.data.email);

    // 2. Crear una tienda de prueba
    console.log('🏪 Creando tienda de prueba...');
    const testStore = await axios.post(`${STRAPI_URL}/api/stores`, {
      data: {
        name: 'Tienda de Prueba',
        description: 'Tienda para probar reembolsos',
        owner: testUser.data.id
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Tienda de prueba creada:', testStore.data.data.attributes.name);

    // 3. Crear un producto de prueba
    console.log('📦 Creando producto de prueba...');
    const testProduct = await axios.post(`${STRAPI_URL}/api/products`, {
      data: {
        name: 'Producto de Prueba para Reembolso',
        description: 'Este es un producto de prueba para verificar el sistema de reembolsos',
        price: 29.99,
        stock: 10,
        store: testStore.data.data.id,
        category: 1 // Asumiendo que existe una categoría con ID 1
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Producto de prueba creado:', testProduct.data.data.attributes.name);

    // 4. Crear una orden de prueba
    console.log('📋 Creando orden de prueba...');
    const testOrder = await axios.post(`${STRAPI_URL}/api/orders`, {
      data: {
        orderNumber: `ORD-${Date.now()}`,
        total: 29.99,
        status: 'delivered',
        orderStatus: 'delivered',
        user: testUser.data.id,
        subtotal: 29.99,
        tax: 0,
        shipping: 0,
        currency: 'EUR'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Orden de prueba creada:', testOrder.data.data.attributes.orderNumber);

    // 5. Crear order item
    console.log('📦 Creando order item...');
    const testOrderItem = await axios.post(`${STRAPI_URL}/api/order-items`, {
      data: {
        order: testOrder.data.data.id,
        product: testProduct.data.data.id,
        quantity: 1,
        price: 29.99,
        subtotal: 29.99,
        name: 'Producto de Prueba para Reembolso'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Order item creado');

    // 6. Crear un pago de prueba
    console.log('💳 Creando pago de prueba...');
    const testPayment = await axios.post(`${STRAPI_URL}/api/payments`, {
      data: {
        amount: 29.99,
        currency: 'EUR',
        status: 'succeeded',
        paymentMethod: 'stripe',
        paymentIntentId: `pi_test_${Date.now()}`,
        order: testOrder.data.data.id
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Pago de prueba creado');

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

    for (let i = 0; i < 5; i++) {
      const reason = refundReasons[i % refundReasons.length];
      const status = refundStatuses[i % refundStatuses.length];
      
      const refund = await axios.post(`${STRAPI_URL}/api/refunds`, {
        data: {
          refundId: `REF-TEST-${Date.now()}-${i}`,
          amount: 29.99,
          reason: reason,
          description: `Reembolso de prueba ${i + 1} - ${reason}`,
          refundStatus: status,
          currency: 'EUR',
          order: testOrder.data.data.id,
          user: testUser.data.id,
          payment: testPayment.data.data.id
        }
      }, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Reembolso ${i + 1} creado:`, refund.data.data.attributes.refundId, `- Estado:`, status);
    }

    console.log('🎉 ¡Reembolsos de prueba creados exitosamente!');
    console.log('📊 Ahora puedes ir a /dashboard/reembolsos para verlos');
    console.log('🔑 Usuario de prueba:', testUser.data.email);
    console.log('🏪 Tienda:', testStore.data.data.attributes.name);

  } catch (error) {
    console.error('❌ Error creando reembolsos de prueba:', error.response?.data || error.message);
  }
}

// Ejecutar el script
createTestRefunds();
