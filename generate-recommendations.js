const fetch = require('node-fetch');

const STRAPI_URL = 'http://localhost:1337';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzU3MDk2ODY5LCJleHAiOjE3NTk2ODg4Njl9.eH69UKqk_NA0_u6p4NFeecpu8vmbyIwmi2gob93oPr4';

async function generateRecommendations() {
  try {
    console.log('🔄 Obteniendo productos populares...');
    
    // Obtener productos populares
    const productsResponse = await fetch(`${STRAPI_URL}/api/products?filters[stock][$gt]=0&filters[rating][$gte]=3&populate=*&sort=rating:desc&pagination[limit]=12`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productsResponse.ok) {
      throw new Error(`Error fetching products: ${productsResponse.statusText}`);
    }

    const productsData = await productsResponse.json();
    const products = productsData.data || [];

    console.log(`✅ Encontrados ${products.length} productos`);

    // Crear recomendaciones
    const recommendations = products.map((product, index) => ({
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        rating: product.rating,
        image: product.image?.url,
        categories: product.categories?.map(cat => cat.name) || []
      },
      score: 0.8 - (index * 0.05),
      rationale: `Producto popular con rating ${product.rating}/5`,
      algorithm: 'basic_popularity'
    }));

    console.log('🔄 Creando recomendaciones en la base de datos...');

    // Crear registro de recomendación
    const recommendationData = {
      data: {
        user: "1",
        items: recommendations,
        strategy: "basic",
        context: { source: "popular_products" },
        generatedAt: new Date().toISOString(),
        ttl: 7 * 24 * 60 * 60 * 1000,
        metadata: {
          totalProducts: products.length,
          generatedAt: new Date().toISOString()
        }
      }
    };

    const createResponse = await fetch(`${STRAPI_URL}/api/recommendations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recommendationData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Error creating recommendations: ${createResponse.statusText} - ${errorText}`);
    }

    const result = await createResponse.json();
    console.log('✅ Recomendaciones creadas exitosamente!');
    console.log(`📊 Total de recomendaciones: ${recommendations.length}`);
    console.log(`🆔 ID de recomendación: ${result.data?.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateRecommendations();
