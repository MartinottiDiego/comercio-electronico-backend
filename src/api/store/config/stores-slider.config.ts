/**
 * Configuración para el Stores Slider
 */

export const STORES_SLIDER_CONFIG = {
  // Límites
  DEFAULT_LIMIT: 8,
  MAX_LIMIT: 20,
  MIN_LIMIT: 1,
  
  // Filtros
  MIN_RATING: 0,
  ONLY_VERIFIED: true,
  
  // Populate por defecto
  DEFAULT_POPULATE: 'image,products',
  
  // Límite de productos por tienda
  PRODUCTS_PER_STORE: 5,
  
  // Cache
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
  },
  
  // Logging
  LOG_LEVEL: 'info',
  LOG_PREFIX: '[StoresSlider]',
} as const;

export type StoresSliderConfig = typeof STORES_SLIDER_CONFIG;
