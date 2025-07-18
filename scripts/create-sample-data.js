const axios = require('axios');

const STRAPI_URL = 'http://127.0.0.1:1337';

// Sample users data - Creating more users for better review distribution
const sampleUsers = [
  {
    username: 'maria_garcia',
    email: 'maria.garcia@example.com',
    password: 'password123',
    firstName: 'María',
    lastName: 'García',
    phone: '+54 9 11 1234-5678',
    role: 'comprador'
  },
  {
    username: 'juan_rodriguez',
    email: 'juan.rodriguez@example.com',
    password: 'password123',
    firstName: 'Juan',
    lastName: 'Rodríguez',
    phone: '+54 9 11 2345-6789',
    role: 'comprador'
  },
  {
    username: 'ana_lopez',
    email: 'ana.lopez@example.com',
    password: 'password123',
    firstName: 'Ana',
    lastName: 'López',
    phone: '+54 9 11 3456-7890',
    role: 'comprador'
  },
  {
    username: 'carlos_martinez',
    email: 'carlos.martinez@example.com',
    password: 'password123',
    firstName: 'Carlos',
    lastName: 'Martínez',
    phone: '+54 9 11 4567-8901',
    role: 'comprador'
  },
  {
    username: 'lucia_fernandez',
    email: 'lucia.fernandez@example.com',
    password: 'password123',
    firstName: 'Lucía',
    lastName: 'Fernández',
    phone: '+54 9 11 5678-9012',
    role: 'comprador'
  },
  {
    username: 'pedro_sanchez',
    email: 'pedro.sanchez@example.com',
    password: 'password123',
    firstName: 'Pedro',
    lastName: 'Sánchez',
    phone: '+54 9 11 6789-0123',
    role: 'comprador'
  },
  {
    username: 'sofia_ramirez',
    email: 'sofia.ramirez@example.com',
    password: 'password123',
    firstName: 'Sofía',
    lastName: 'Ramírez',
    phone: '+54 9 11 7890-1234',
    role: 'comprador'
  },
  {
    username: 'diego_torres',
    email: 'diego.torres@example.com',
    password: 'password123',
    firstName: 'Diego',
    lastName: 'Torres',
    phone: '+54 9 11 8901-2345',
    role: 'comprador'
  },
  {
    username: 'valentina_morales',
    email: 'valentina.morales@example.com',
    password: 'password123',
    firstName: 'Valentina',
    lastName: 'Morales',
    phone: '+54 9 11 9012-3456',
    role: 'comprador'
  },
  {
    username: 'miguel_herrera',
    email: 'miguel.herrera@example.com',
    password: 'password123',
    firstName: 'Miguel',
    lastName: 'Herrera',
    phone: '+54 9 11 0123-4567',
    role: 'comprador'
  },
  {
    username: 'camila_vargas',
    email: 'camila.vargas@example.com',
    password: 'password123',
    firstName: 'Camila',
    lastName: 'Vargas',
    phone: '+54 9 11 1234-5679',
    role: 'comprador'
  },
  {
    username: 'alejandro_ruiz',
    email: 'alejandro.ruiz@example.com',
    password: 'password123',
    firstName: 'Alejandro',
    lastName: 'Ruiz',
    phone: '+54 9 11 2345-6780',
    role: 'comprador'
  },
  {
    username: 'isabella_gomez',
    email: 'isabella.gomez@example.com',
    password: 'password123',
    firstName: 'Isabella',
    lastName: 'Gómez',
    phone: '+54 9 11 3456-7891',
    role: 'comprador'
  },
  {
    username: 'daniel_castro',
    email: 'daniel.castro@example.com',
    password: 'password123',
    firstName: 'Daniel',
    lastName: 'Castro',
    phone: '+54 9 11 4567-8902',
    role: 'comprador'
  },
  {
    username: 'emma_reyes',
    email: 'emma.reyes@example.com',
    password: 'password123',
    firstName: 'Emma',
    lastName: 'Reyes',
    phone: '+54 9 11 5678-9013',
    role: 'comprador'
  }
];

// Sample reviews data - More variety
const sampleReviews = [
  {
    rating: 5,
    comment: "Excelente producto! La calidad es increíble y llegó perfectamente embalado. Definitivamente lo recomiendo.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 12
  },
  {
    rating: 4,
    comment: "Muy buen producto, cumple con lo esperado. La entrega fue rápida y el servicio al cliente excelente.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 8
  },
  {
    rating: 5,
    comment: "Superó mis expectativas! El precio es muy bueno para la calidad que ofrece. Volveré a comprar.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 15
  },
  {
    rating: 3,
    comment: "El producto es bueno pero podría mejorar en algunos aspectos. La entrega fue lenta.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 3
  },
  {
    rating: 4,
    comment: "Buena relación calidad-precio. Recomendado para el uso diario.",
    status: "approved",
    verifiedPurchase: false,
    helpfulCount: 5
  },
  {
    rating: 5,
    comment: "Increíble! No puedo creer lo bueno que es este producto. Definitivamente vale la pena.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 20
  },
  {
    rating: 4,
    comment: "Muy satisfecho con la compra. El producto funciona perfectamente.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 7
  },
  {
    rating: 5,
    comment: "Excelente servicio y producto de alta calidad. Muy recomendado!",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 11
  },
  {
    rating: 4,
    comment: "Cumple con lo prometido. Buena calidad y precio justo.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 6
  },
  {
    rating: 5,
    comment: "Fantástico producto! La calidad es excepcional y el envío fue muy rápido.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 18
  },
  {
    rating: 3,
    comment: "Producto aceptable, pero esperaba algo mejor por el precio.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 2
  },
  {
    rating: 4,
    comment: "Buen producto en general. Recomendado para el uso que le doy.",
    status: "approved",
    verifiedPurchase: false,
    helpfulCount: 4
  },
  {
    rating: 5,
    comment: "¡Simplemente perfecto! No puedo estar más satisfecho con esta compra.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 25
  },
  {
    rating: 4,
    comment: "Muy buen producto. La calidad es consistente y el servicio excelente.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 9
  },
  {
    rating: 5,
    comment: "¡Increíble! La mejor compra que he hecho este año.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 22
  },
  {
    rating: 4,
    comment: "Muy buen producto. La entrega fue perfecta y el producto de calidad.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 8
  },
  {
    rating: 3,
    comment: "Producto regular. Cumple su función pero podría ser mejor.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 2
  },
  {
    rating: 5,
    comment: "¡Espectacular! No puedo creer lo bueno que es este producto.",
    status: "approved",
    verifiedPurchase: true,
    helpfulCount: 16
  }
];

async function createUsersAndProfiles() {
  console.log('Creating sample users and profiles...');
  
  const createdUsers = [];
  
  for (let i = 0; i < sampleUsers.length; i++) {
    const userData = sampleUsers[i];
    
    try {
      // 1. Create user (exactly like frontend)
      const userResponse = await axios.post(`${STRAPI_URL}/api/auth/local/register`, {
        username: userData.username,
        email: userData.email,
        password: userData.password
      });
      
      if (userResponse.data.user) {
        console.log(`✅ Created user: ${userData.username}`);
        
        // 2. Create profile (exactly like frontend)
        const profilePayload = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          roleUser: userData.role,
          users_permissions_user: userResponse.data.user.id
        };
        
        const profileResponse = await axios.post(`${STRAPI_URL}/api/profiles`, {
          data: profilePayload
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userResponse.data.jwt}`
          }
        });
        
        if (profileResponse.data.data) {
          console.log(`✅ Created profile for: ${userData.username}`);
          createdUsers.push({
            user: {
              ...userResponse.data.user,
              jwt: userResponse.data.jwt
            },
            profile: profileResponse.data.data
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.username}:`, error.response?.data || error.message);
    }
  }
  
  return createdUsers;
}

async function getProducts() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/products`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching products:', error.response?.data || error.message);
    return [];
  }
}

async function createReviews(users) {
  console.log('Creating sample reviews...');
  
  if (users.length === 0) {
    console.log('No users found. Please create users first.');
    return;
  }
  
  const products = await getProducts();
  
  if (products.length === 0) {
    console.log('No products found.');
    return;
  }
  
  let reviewCount = 0;
  
  for (const product of products) {
    // Create 3-8 reviews per product (minimum 3, some products will have more)
    const numReviews = Math.floor(Math.random() * 6) + 3; // 3 to 8 reviews
    
    console.log(`📝 Creating ${numReviews} reviews for: ${product.title}`);
    
    for (let i = 0; i < numReviews; i++) {
      const userData = users[Math.floor(Math.random() * users.length)];
      const reviewData = sampleReviews[Math.floor(Math.random() * sampleReviews.length)];
      
      const reviewPayload = {
        data: {
          ...reviewData,
          product: product.id,
          users_permissions_user: userData.user.id
        }
      };
      
      try {
        const response = await axios.post(`${STRAPI_URL}/api/reviews`, reviewPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.user.jwt || userData.user.token}`
          }
        });
        console.log(`  ✅ Review ${i + 1}/${numReviews} created`);
        reviewCount++;
      } catch (error) {
        console.error(`  ❌ Error creating review ${i + 1}/${numReviews} for ${product.title}:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log(`🎉 Created ${reviewCount} reviews successfully!`);
  console.log(`📊 Average reviews per product: ${(reviewCount / products.length).toFixed(1)}`);
}

async function main() {
  console.log('🚀 Starting sample data creation...\n');
  
  const users = await createUsersAndProfiles();
  console.log(`\n👥 Created ${users.length} users with profiles`);
  console.log('\n' + '='.repeat(50) + '\n');
  await createReviews(users);
  
  console.log('\n✅ Sample data creation completed!');
  console.log('\nYou can now test the review system in your frontend.');
}

main().catch(console.error);