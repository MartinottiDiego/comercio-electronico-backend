const STRAPI_URL = 'http://localhost:1337';

async function checkNotificationStorage() {
  console.log('🔍 Verificando almacenamiento de notificaciones...\n');

  // 1. Verificar en Backend (Strapi)
  console.log('📊 1. BACKEND (Strapi/PostgreSQL):');
  try {
    const response = await fetch(`${STRAPI_URL}/api/notifications?populate=*&sort[0]=createdAt:desc`);
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Total de notificaciones en backend: ${result.data.length}`);
      
      // Agrupar por usuario
      const byUser = {};
      result.data.forEach(notification => {
        const email = notification.recipientEmail;
        if (!byUser[email]) byUser[email] = [];
        byUser[email].push(notification);
      });

      Object.keys(byUser).forEach(email => {
        console.log(`   📧 ${email}: ${byUser[email].length} notificaciones`);
        byUser[email].forEach(notif => {
          console.log(`      - ${notif.title} (${notif.status})`);
        });
      });
    } else {
      console.log('   ❌ Error accediendo al backend');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n📋 2. FRONTEND (localStorage):');
  console.log('   💡 Para verificar localStorage, abre la consola del navegador y ejecuta:');
  console.log('   localStorage.getItem("user")');
  console.log('   localStorage.getItem("waazaar_notifications_" + userEmail)');

  console.log('\n📋 3. FRONTEND (Zustand Store):');
  console.log('   💡 Para verificar el store, abre la consola del navegador y ejecuta:');
  console.log('   useNotificationsStore.getState()');

  console.log('\n📋 4. VERIFICAR USUARIO ACTUAL:');
  console.log('   💡 Para verificar el usuario logueado:');
  console.log('   JSON.parse(localStorage.getItem("user"))');

  console.log('\n🔧 COMANDOS ÚTILES PARA DEBUGGING:');
  console.log('   // Ver todas las notificaciones del backend');
  console.log('   fetch("http://localhost:1337/api/notifications").then(r => r.json()).then(console.log)');
  
  console.log('   // Ver notificaciones de un usuario específico');
  console.log('   fetch("http://localhost:1337/api/notifications?filters[recipientEmail]=tu-email@ejemplo.com").then(r => r.json()).then(console.log)');
  
  console.log('   // Ver localStorage del navegador');
  console.log('   Object.keys(localStorage).filter(key => key.includes("notification"))');
}

// Función para crear notificación de prueba
async function createTestNotification(userEmail) {
  console.log(`\n🧪 Creando notificación de prueba para ${userEmail}...`);
  
  try {
    const response = await fetch(`${STRAPI_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'test',
          title: '🧪 Notificación de prueba',
          message: `Esta es una notificación de prueba para ${userEmail}`,
          priority: 'normal',
          recipientEmail: userEmail,
          recipientRole: 'comprador',
          actionUrl: '/test',
          actionText: 'Ver prueba'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('   ✅ Notificación de prueba creada:', result.data.title);
    } else {
      console.log('   ❌ Error creando notificación de prueba');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

// Ejecutar verificación
async function runCheck() {
  await checkNotificationStorage();
  
  // Crear notificación de prueba si se especifica un email
  const testEmail = process.argv[2];
  if (testEmail) {
    await createTestNotification(testEmail);
  }
}

runCheck(); 