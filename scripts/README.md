# Script de Seeding para Strapi

Este directorio contiene el script de seeding para poblar la base de datos con categorías y productos de ejemplo.

## Archivos

- `seed-data.js` - Script principal de seeding que crea categorías y productos

## Cómo usar

### Método 1: Consola de Strapi (Recomendado)

1. **Asegúrate de que el servidor esté corriendo:**
   ```bash
   npm run dev
   ```

2. **Abre la consola de Strapi en otra terminal:**
   ```bash
   npm run console
   ```

3. **Copia y pega el contenido del archivo `seed-data.js` en la consola**

4. **Ejecuta la función:**
   ```javascript
   await seedData()
   ```

### Método 2: Ejecutar directamente

```bash
node scripts/seed-data.js
```

## Requisitos previos

- **Store con ID 1**: El script asume que existe un store con ID 1. Si no existe, créalo primero desde el admin de Strapi.

## Qué crea el script

### Categorías (16 categorías)
- Móviles, Portátiles, Televisores, Electrodomésticos
- Moda, Calzado, Hogar, Deportes
- Belleza, Salud, Libros, Juguetes
- Automóvil, Mascotas, Música, Gaming

### Productos (18 productos)
- Productos de tecnología (iPhone, Samsung, MacBook, etc.)
- Productos del hogar (jarra, maceta, lámpara)
- Productos de moda (jersey, zapatillas, reloj)
- Productos de belleza y salud
- Libros

## Relaciones creadas

- Todos los productos se asocian con el **Store ID: 1**
- Cada producto se asocia con su categoría correspondiente
- Las categorías incluyen subcategorías como arrays

## Verificación

Después de ejecutar el script, puedes verificar en el admin de Strapi:

1. **Content Manager** → **Category** → Ver las 16 categorías creadas
2. **Content Manager** → **Product** → Ver los 18 productos creados
3. **Content Manager** → **Store** → Verificar que el store ID 1 existe

## Solución de problemas

- **Error "Store not found"**: Crea un store con ID 1 desde el admin de Strapi
- **Error de conexión**: Asegúrate de que el servidor esté corriendo
- **Error de permisos**: Verifica que tienes permisos de administrador en Strapi 