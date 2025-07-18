const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

async function updateProductStats() {
  try {
    console.log('🔄 Updating product statistics...');

    // Obtener todos los productos
    const productsResponse = await axios.get(`${STRAPI_URL}/api/products?pagination[pageSize]=100`);
    const products = productsResponse.data.data;

    console.log(`📦 Found ${products.length} products to update`);

    for (const product of products) {
      try {
        // Obtener reviews aprobadas del producto
        const reviewsResponse = await axios.get(`${STRAPI_URL}/api/reviews?filters[product][$eq]=${product.id}&filters[status][$eq]=approved`);
        const reviews = reviewsResponse.data.data;

        // Calcular estadísticas
        const totalReviews = reviews.length;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        // Actualizar producto
        await axios.put(`${STRAPI_URL}/api/products/${product.id}`, {
          data: {
            rating: Math.round(averageRating * 10) / 10,
            reviewCount: totalReviews
          }
        });

        console.log(`✅ Product "${product.title}": rating=${averageRating.toFixed(1)}, reviews=${totalReviews}`);
      } catch (error) {
        console.error(`❌ Error updating product ${product.id}:`, error.response?.data || error.message);
      }
    }

    console.log('🎉 Product statistics updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar el script
updateProductStats(); 