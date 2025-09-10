/**
 * report router
 */

export default {
  routes: [
    // Generar nuevo informe
    {
      method: 'POST',
      path: '/reports/generate',
      handler: 'report.generate',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Genera un nuevo informe',
        tag: {
          plugin: 'report',
          name: 'Reports',
          actionType: 'create',
        },
      },
    },
    // Listar informes del usuario
    {
      method: 'GET',
      path: '/reports',
      handler: 'report.find',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Obtiene todos los informes del usuario',
        tag: {
          plugin: 'report',
          name: 'Reports',
          actionType: 'find',
        },
      },
    },
    // Obtener informe específico
    {
      method: 'GET',
      path: '/reports/:id',
      handler: 'report.findOne',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Obtiene un informe específico',
        tag: {
          plugin: 'report',
          name: 'Report',
          actionType: 'findOne',
        },
      },
    },
    // Descargar PDF del informe
    {
      method: 'GET',
      path: '/reports/:id/download',
      handler: 'report.download',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Descarga el PDF del informe',
        tag: {
          plugin: 'report',
          name: 'Report',
          actionType: 'download',
        },
      },
    },
    // Eliminar informe
    {
      method: 'DELETE',
      path: '/reports/:id',
      handler: 'report.delete',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Elimina un informe',
        tag: {
          plugin: 'report',
          name: 'Report',
          actionType: 'delete',
        },
      },
    },
    // Obtener estadísticas de informes
    {
      method: 'GET',
      path: '/reports/stats',
      handler: 'report.getStats',
      config: {
        auth: false, // Deshabilitar auth de Strapi, usar middleware personalizado
        policies: [],
        middlewares: ['api::report.auth'], // Usar middleware personalizado
        description: 'Obtiene estadísticas de informes',
        tag: {
          plugin: 'report',
          name: 'Reports',
          actionType: 'stats',
        },
      },
    },
  ],
};
