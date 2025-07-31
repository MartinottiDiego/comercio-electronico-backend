// Script de seeding para Strapi v5
// Ejecutar con: npm run console y luego copiar/pegar este código

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');

    // Store ID (ya creado manualmente)
    const storeId = 1;

    // Verificar que el store existe
    const store = await strapi.entityService.findOne('api::store.store', storeId);
    if (!store) {
      throw new Error(`Store with ID ${storeId} not found. Please create it first.`);
    }
    console.log(`✅ Store found: ${store.name}`);

    // Crear categorías
    const categories = [
      {
        name: 'Móviles',
        slug: 'moviles',
        subcategories: ['Smartphones', 'Accesorios móviles', 'Fundas y protectores', 'Cargadores', 'Auriculares'],
        publishedAt: new Date()
      },
      {
        name: 'Portátiles',
        slug: 'portatiles',
        subcategories: ['Gaming', 'Ultrabooks', 'Workstations', 'Accesorios portátiles', 'Componentes'],
        publishedAt: new Date()
      },
      {
        name: 'Televisores',
        slug: 'televisores',
        subcategories: ['Smart TV', '4K Ultra HD', 'OLED', 'LED', 'Accesorios TV', 'Streaming'],
        publishedAt: new Date()
      },
      {
        name: 'Electrodomésticos',
        slug: 'electrodomesticos',
        subcategories: ['Cocina', 'Lavado', 'Refrigeración', 'Climatización', 'Pequeños electrodomésticos'],
        publishedAt: new Date()
      },
      {
        name: 'Moda',
        slug: 'moda',
        subcategories: ['Ropa hombre', 'Ropa mujer', 'Ropa infantil', 'Accesorios', 'Relojes', 'Joyería'],
        publishedAt: new Date()
      },
      {
        name: 'Calzado',
        slug: 'calzado',
        subcategories: ['Deportivo', 'Casual', 'Formal', 'Botas', 'Sandalias', 'Infantil'],
        publishedAt: new Date()
      },
      {
        name: 'Hogar',
        slug: 'hogar',
        subcategories: ['Muebles', 'Decoración', 'Textiles', 'Iluminación', 'Organización', 'Jardín'],
        publishedAt: new Date()
      },
      {
        name: 'Deportes',
        slug: 'deportes',
        subcategories: ['Fitness', 'Fútbol', 'Running', 'Ciclismo', 'Natación', 'Outdoor'],
        publishedAt: new Date()
      },
      {
        name: 'Belleza',
        slug: 'belleza',
        subcategories: ['Maquillaje', 'Cuidado facial', 'Perfumes', 'Cuidado capilar', 'Cuidado corporal'],
        publishedAt: new Date()
      },
      {
        name: 'Salud',
        slug: 'salud',
        subcategories: ['Vitaminas', 'Suplementos', 'Cuidado personal', 'Primeros auxilios', 'Bienestar'],
        publishedAt: new Date()
      },
      {
        name: 'Libros',
        slug: 'libros',
        subcategories: ['Ficción', 'No ficción', 'Educativos', 'Infantiles', 'Cómics', 'E-books'],
        publishedAt: new Date()
      },
      {
        name: 'Juguetes',
        slug: 'juguetes',
        subcategories: ['Educativos', 'Electrónicos', 'Construcción', 'Muñecas', 'Vehículos', 'Juegos de mesa'],
        publishedAt: new Date()
      },
      {
        name: 'Automóvil',
        slug: 'automovil',
        subcategories: ['Accesorios', 'Herramientas', 'Cuidado del auto', 'Electrónica', 'Neumáticos'],
        publishedAt: new Date()
      },
      {
        name: 'Mascotas',
        slug: 'mascotas',
        subcategories: ['Alimentación', 'Juguetes', 'Cuidado', 'Accesorios', 'Salud animal'],
        publishedAt: new Date()
      },
      {
        name: 'Música',
        slug: 'musica',
        subcategories: ['Instrumentos', 'Audio', 'Accesorios', 'Vinilos', 'Equipos DJ'],
        publishedAt: new Date()
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        subcategories: ['Consolas', 'Videojuegos', 'Accesorios', 'PC Gaming', 'Realidad virtual'],
        publishedAt: new Date()
      }
    ];

    console.log('📂 Creating categories...');
    const createdCategories = [];
    
    for (const categoryData of categories) {
      const category = await strapi.entityService.create('api::category.category', {
        data: categoryData
      });
      createdCategories.push(category);
      console.log(`✅ Created category: ${category.name}`);
    }

    // Mapeo de productos con sus categorías correspondientes
    const productsWithCategories = [
      {
        title: 'iPhone 15 Pro',
        price: 1219.00,
        stock: 43,
        original_price: 1347.00,
        discount_percentage: 10.50,
        brand: 'Apple',
        rating: 4.80,
        review_count: 25,
        free_shipping: true,
        max_quantity: 5,
        description: 'El nuevo iPhone 15 Pro con chip A17 Bionic, sistema de cámaras Pro y una pantalla Super Retina XDR con ProMotion.',
        slug: 'i-phone-15-pro',
        categoryName: 'Móviles'
      },
      {
        title: 'Samsung Galaxy S24 Ultra',
        price: 1459.00,
        stock: 30,
        original_price: 1677.85,
        discount_percentage: 15.00,
        brand: 'Samsung',
        rating: 4.90,
        review_count: 63,
        free_shipping: true,
        max_quantity: 3,
        description: 'Experimenta el poder del Galaxy AI. Cámara de 200MP, el procesador más rápido en un Galaxy y una batería que dura todo el día.',
        slug: 'samsung-galaxy-s24-ultra',
        categoryName: 'Móviles'
      },
      {
        title: 'MacBook Pro M3',
        price: 1899.00,
        stock: 25,
        original_price: 2054.72,
        discount_percentage: 8.20,
        brand: 'Apple',
        rating: 4.85,
        review_count: 109,
        free_shipping: true,
        max_quantity: 2,
        description: 'El MacBook Pro con el nuevo chip M3 ofrece un rendimiento y una eficiencia espectaculares. Pantalla Liquid Retina XDR y hasta 22 horas de autonomía.',
        slug: 'mac-book-pro-m3',
        categoryName: 'Portátiles'
      },
      {
        title: 'Portátil Dell XPS 15',
        price: 1650.00,
        stock: 40,
        original_price: 1848.00,
        discount_percentage: 12.00,
        brand: 'Dell',
        rating: 4.70,
        review_count: 109,
        free_shipping: true,
        max_quantity: 4,
        description: 'Un portátil de alto rendimiento con pantalla InfinityEdge, procesadores Intel Core de última generación y gráficos NVIDIA.',
        slug: 'portatil-dell-xps-15',
        categoryName: 'Portátiles'
      },
      {
        title: 'Smart TV LG OLED evo C3 55"',
        price: 1349.00,
        stock: 35,
        original_price: 1591.82,
        discount_percentage: 18.00,
        brand: 'LG',
        rating: 4.90,
        review_count: 20,
        free_shipping: false,
        max_quantity: 2,
        description: 'El único negro puro que hace que el resto de colores brille. Experiencia audiovisual cinematográfica con Dolby Vision y Dolby Atmos.',
        slug: 'smart-tv-lg-oled-evo-c3-55',
        categoryName: 'Televisores'
      },
      {
        title: 'Smart TV Samsung QLED 4K 65"',
        price: 1199.00,
        stock: 50,
        original_price: 1468.78,
        discount_percentage: 22.50,
        brand: 'Samsung',
        rating: 4.75,
        review_count: 90,
        free_shipping: false,
        max_quantity: 3,
        description: 'Sumérgete en una imagen con más de mil millones de colores. Quantum Dot y procesador QLED 4K para una experiencia visual inigualable.',
        slug: 'smart-tv-samsung-qled-4-k-65',
        categoryName: 'Televisores'
      },
      {
        title: 'Jarra de Cerámica Artesanal',
        price: 35.00,
        stock: 60,
        original_price: 35.00,
        discount_percentage: 0.00,
        brand: 'ArtesaníaViva',
        rating: 4.90,
        review_count: 64,
        free_shipping: true,
        max_quantity: 8,
        description: 'Hecha a mano por artesanos locales. Cada pieza es única, perfecta para decorar tu mesa con un toque rústico y elegante.',
        slug: 'jarra-de-ceramica-artesanal',
        categoryName: 'Hogar'
      },
      {
        title: 'Maceta de Diseño Minimalista',
        price: 25.00,
        stock: 180,
        original_price: 25.00,
        discount_percentage: 0.00,
        brand: 'VerdeInterior',
        rating: 4.70,
        review_count: 56,
        free_shipping: true,
        max_quantity: 15,
        description: 'El hogar perfecto para tus plantas. Diseño limpio y moderno que se adapta a cualquier estilo de decoración.',
        slug: 'maceta-de-diseno-minimalista',
        categoryName: 'Hogar'
      },
      {
        title: 'Lámpara de Escritorio LED',
        price: 45.00,
        stock: 150,
        original_price: 47.25,
        discount_percentage: 5.00,
        brand: 'HogarTech',
        rating: 4.40,
        review_count: 10,
        free_shipping: true,
        max_quantity: 20,
        description: 'Iluminación ajustable y diseño moderno. Perfecta para trabajar o estudiar, con diferentes tonos de luz y un puerto USB de carga.',
        slug: 'lampara-de-escritorio-led',
        categoryName: 'Hogar'
      },
      {
        title: 'Jersey de Lana Merino',
        price: 89.00,
        stock: 95,
        original_price: 97.90,
        discount_percentage: 10.00,
        brand: 'ModaClásica',
        rating: 4.70,
        review_count: 15,
        free_shipping: true,
        max_quantity: 15,
        description: 'Suavidad y calidez incomparables. Este jersey de lana merino es perfecto para cualquier ocasión, del trabajo al fin de semana.',
        slug: 'jersey-de-lana-merino',
        categoryName: 'Moda'
      },
      {
        title: 'Zapatillas Nike Air Max',
        price: 139.00,
        stock: 119,
        original_price: 159.85,
        discount_percentage: 15.00,
        brand: 'Nike',
        rating: 4.60,
        review_count: 100,
        free_shipping: true,
        max_quantity: 10,
        description: 'Comodidad y estilo legendarios. Las Nike Air Max continúan la tradición con una amortiguación increíble y un diseño icónico.',
        slug: 'zapatillas-nike-air-max',
        categoryName: 'Calzado'
      },
      {
        title: 'Reloj Inteligente Pro',
        price: 249.00,
        stock: 80,
        original_price: 298.80,
        discount_percentage: 20.00,
        brand: 'TechBrand',
        rating: 4.50,
        review_count: 63,
        free_shipping: true,
        max_quantity: 8,
        description: 'Monitoriza tu salud, recibe notificaciones y paga desde tu muñeca. Un diseño elegante con la última tecnología.',
        slug: 'reloj-inteligente-pro',
        categoryName: 'Moda'
      },
      {
        title: 'Crema Facial Hidratante con Ácido Hialurónico',
        price: 29.00,
        stock: 200,
        original_price: 29.00,
        discount_percentage: 0.00,
        brand: 'BellezaPura',
        rating: 2.71,
        review_count: 74,
        free_shipping: true,
        max_quantity: 25,
        description: 'Hidratación intensa durante 24 horas. Reduce la apariencia de líneas finas y deja la piel suave y radiante.',
        slug: 'crema-facial-hidratante-con-acido-hialuronico',
        categoryName: 'Belleza'
      },
      {
        title: 'Set de Maquillaje Esencial',
        price: 55.00,
        stock: 70,
        original_price: 63.25,
        discount_percentage: 15.00,
        brand: 'Glamour & Co.',
        rating: 4.60,
        review_count: 69,
        free_shipping: true,
        max_quantity: 12,
        description: 'Todo lo que necesitas para un look perfecto. Incluye base, corrector, máscara de pestañas y paleta de sombras.',
        slug: 'set-de-maquillaje-esencial',
        categoryName: 'Belleza'
      },
      {
        title: 'Perfume Floral \'Jardín Secreto\'',
        price: 75.00,
        stock: 110,
        original_price: 82.50,
        discount_percentage: 10.00,
        brand: 'AromasDeluxe',
        rating: 4.70,
        review_count: 10,
        free_shipping: true,
        max_quantity: 18,
        description: 'Una fragancia elegante y femenina con notas de jazmín, rosa y sándalo. Ideal para el día a día.',
        slug: 'perfume-floral-jardin-secreto',
        categoryName: 'Belleza'
      },
      {
        title: 'Suplemento de Vitaminas y Minerales',
        price: 19.00,
        stock: 300,
        original_price: 19.95,
        discount_percentage: 5.00,
        brand: 'SaludTotal',
        rating: 4.80,
        review_count: 93,
        free_shipping: true,
        max_quantity: 30,
        description: 'Refuerza tu sistema inmune y llénate de energía. Un complejo vitamínico completo para tu bienestar diario.',
        slug: 'suplemento-de-vitaminas-y-minerales',
        categoryName: 'Salud'
      },
      {
        title: 'Colección de Libros Clásicos',
        price: 99.00,
        stock: 50,
        original_price: 118.80,
        discount_percentage: 20.00,
        brand: 'EditorialLegado',
        rating: 5.00,
        review_count: 54,
        free_shipping: true,
        max_quantity: 5,
        description: 'Una selección de 5 obras maestras de la literatura universal en edición de lujo. Un tesoro para tu biblioteca.',
        slug: 'coleccion-de-libros-clasicos',
        categoryName: 'Libros'
      }
    ];

    console.log('📦 Creating products...');
    
    for (const productData of productsWithCategories) {
      // Encontrar la categoría correspondiente
      const category = createdCategories.find(cat => cat.name === productData.categoryName);
      
      if (!category) {
        console.error(`❌ Category not found: ${productData.categoryName}`);
        continue;
      }

      // Preparar datos del producto
      const { categoryName, ...productFields } = productData;
      
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          ...productFields,
          store: storeId,
          category: category.id,
          publishedAt: new Date()
        }
      });
      
      console.log(`✅ Created product: ${product.title} (Category: ${category.name})`);
    }

    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories created: ${createdCategories.length}`);
    console.log(`   - Products created: ${productsWithCategories.length}`);
    console.log(`   - All products linked to store ID: ${storeId}`);

  } catch (error) {
    console.error('❌ Error during data seeding:', error);
    throw error;
  }
}

// Exportar la función para uso en consola de Strapi
module.exports = { seedData };

// Si se ejecuta directamente, ejecutar la función
if (require.main === module) {
  console.log('⚠️  Este script debe ejecutarse desde la consola de Strapi.');
  console.log('💡 Ejecuta: npm run console');
  console.log('💡 Luego copia y pega el contenido de este archivo.');
} 