const fetch = require('node-fetch');

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const API_TOKEN = 'your-api-token-here'; // Necesitarás un token de API

// Datos de prueba
const testOrders = [
  // Órdenes de hace 2 meses (90d)
  {
    data: {
      orderNumber: 'TEST-90D-001',
      total: 150.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1, // Ajusta según tu usuario
      store: 1, // Ajusta según tu tienda
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-90D-002',
      total: 200.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  
  // Órdenes de hace 1 mes (30d)
  {
    data: {
      orderNumber: 'TEST-30D-001',
      total: 300.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-30D-002',
      total: 250.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-30D-003',
      total: 180.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  
  // Órdenes de hace 1 semana (7d)
  {
    data: {
      orderNumber: 'TEST-7D-001',
      total: 120.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-7D-002',
      total: 90.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-7D-003',
      total: 110.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    data: {
      orderNumber: 'TEST-7D-004',
      total: 80.00,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      user: 1,
      store: 1,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

async function insertTestOrders() {
  console.log('🚀 Insertando órdenes de prueba...');
  
  for (const order of testOrders) {
    try {
      const response = await fetch(`${STRAPI_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify(order)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Orden ${order.data.orderNumber} creada: ID ${result.data.id}`);
      } else {
        console.error(`❌ Error creando orden ${order.data.orderNumber}:`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error creando orden ${order.data.orderNumber}:`, error.message);
    }
  }
  
  console.log('\n📊 Resumen de datos de prueba:');
  console.log('90d: 2 órdenes - €350.00 total');
  console.log('30d: 3 órdenes - €730.00 total');
  console.log('7d: 4 órdenes - €400.00 total');
  console.log('\n🎯 Ahora puedes probar el selector de períodos!');
}

// Ejecutar
insertTestOrders().catch(console.error);
