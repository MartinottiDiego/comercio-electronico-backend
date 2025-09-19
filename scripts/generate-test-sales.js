const { execSync } = require('child_process');

// Función para ejecutar comandos de Strapi
function runStrapiCommand(command) {
  try {
    console.log(`Ejecutando: ${command}`);
    const result = execSync(command, { cwd: process.cwd(), encoding: 'utf8' });
    console.log('✅ Comando ejecutado exitosamente');
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando comando:', error.message);
    throw error;
  }
}

// Función para crear datos de prueba
async function generateTestSales() {
  console.log('🚀 Generando datos de ventas de prueba...');
  
  // Crear órdenes para diferentes períodos
  const testOrders = [
    // Órdenes de hace 2 meses (90d)
    {
      orderNumber: 'TEST-90D-001',
      total: 150.00,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-90D-002', 
      total: 200.00,
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    
    // Órdenes de hace 1 mes (30d)
    {
      orderNumber: 'TEST-30D-001',
      total: 300.00,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-30D-002',
      total: 250.00,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-30D-003',
      total: 180.00,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    
    // Órdenes de hace 1 semana (7d)
    {
      orderNumber: 'TEST-7D-001',
      total: 120.00,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-7D-002',
      total: 90.00,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-7D-003',
      total: 110.00,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    },
    {
      orderNumber: 'TEST-7D-004',
      total: 80.00,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'paid',
      orderStatus: 'delivered'
    }
  ];

  console.log('📊 Datos de prueba generados:');
  console.log('90d: 2 órdenes - €350.00 total');
  console.log('30d: 3 órdenes - €730.00 total'); 
  console.log('7d: 4 órdenes - €400.00 total');
  
  // Mostrar cómo insertar manualmente
  console.log('\n🔧 Para insertar estos datos, ejecuta estos comandos en tu base de datos:');
  console.log('\n-- Insertar órdenes de prueba');
  
  testOrders.forEach((order, index) => {
    console.log(`INSERT INTO orders (orderNumber, total, createdAt, updatedAt, paymentStatus, orderStatus, user_id, store_id) VALUES ('${order.orderNumber}', ${order.total}, '${order.createdAt}', '${order.createdAt}', '${order.paymentStatus}', '${order.orderStatus}', 1, 1);`);
  });
  
  console.log('\n📝 Nota: Ajusta los IDs de user_id y store_id según tu configuración');
}

// Ejecutar
generateTestSales().catch(console.error);
