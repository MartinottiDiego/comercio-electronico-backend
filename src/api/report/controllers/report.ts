/**
 * report controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::report.report', ({ strapi }) => ({
  /**
   * Generar un nuevo informe
   */
  async generate(ctx) {
    try {
      const { type, dateFrom, dateTo } = ctx.request.body;
      const { user } = ctx.state;

      // Logs para debuggear
      console.log('🔍 Usuario en ctx.state:', user);
      console.log('🔍 User ID:', user?.id);
      console.log('🔍 Headers de autorización:', ctx.request.headers.authorization);
      
      // Usar el usuario autenticado
      const userId = user.id;
      console.log('🔍 UserId final que se usará:', userId);

      // Validar campos requeridos
      if (!type || !dateFrom || !dateTo) {
        return ctx.badRequest('Los campos type, dateFrom y dateTo son requeridos');
      }

      // Validar que el tipo de informe sea válido
      const validTypes = ['usuarios', 'ventas', 'productos', 'tiendas', 'metricas'];
      if (!validTypes.includes(type)) {
        return ctx.badRequest('Tipo de informe no válido');
      }

      // Generar el informe usando el usuario
      const report = await strapi.service('api::report.report').generateReport({
        type,
        dateFrom,
        dateTo,
        userId: userId
      });

      return ctx.send({
        success: true,
        data: report,
        message: 'Informe generado correctamente'
      });

    } catch (error) {
      console.error('Error generating report:', error);
      return ctx.internalServerError('Error al generar el informe');
    }
  },

  /**
   * Obtener informes del usuario
   */
  async find(ctx) {
    try {
      const { user } = ctx.state;
      const page = parseInt(ctx.query.page as string) || 1;
      const pageSize = parseInt(ctx.query.pageSize as string) || 10;

      console.log('🔍 find - Usuario autenticado:', user);
      console.log('🔍 find - User ID:', user.id);

      // El admin puede ver todos los informes, no solo los suyos
      const reports = await strapi.entityService.findMany('api::report.report', {
        sort: { createdAt: 'desc' },
        start: (page - 1) * pageSize,
        limit: pageSize,
        populate: ['generatedBy']
      });

      console.log('🔍 find - Reports encontrados:', reports);

      // Obtener total para paginación (todos los informes)
      const total = await strapi.entityService.count('api::report.report');

      console.log('🔍 find - Total de reports:', total);

      return ctx.send({
        success: true,
        data: reports,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total
          }
        }
      });

    } catch (error) {
      console.error('Error fetching reports:', error);
      return ctx.internalServerError('Error al obtener los informes');
    }
  },

  /**
   * Obtener un informe específico
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;

      // Obtener el informe usando documentId
      const report = await strapi.entityService.findOne('api::report.report', id, {
        populate: ['generatedBy']
      });

      if (!report) {
        return ctx.notFound('Informe no encontrado');
      }

      return ctx.send({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error fetching report:', error);
      return ctx.internalServerError('Error al obtener el informe');
    }
  },

  /**
   * Descargar PDF del informe
   */
  async download(ctx) {
    try {
      const { id } = ctx.params;

      // Obtener el informe usando documentId
      const report = await strapi.entityService.findOne('api::report.report', id);

      if (!report) {
        return ctx.notFound('Informe no encontrado');
      }

      // Verificar que el informe esté completado
      if (report.reportStatus !== 'completed') {
        return ctx.badRequest('El informe aún no está listo para descargar');
      }

      // Devolver los datos del informe para que el frontend genere el PDF
      return ctx.send({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error downloading report:', error);
      return ctx.internalServerError('Error al descargar el informe');
    }
  },

  /**
   * Eliminar un informe
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;

      // Obtener el informe usando documentId
      const report = await strapi.entityService.findOne('api::report.report', id);

      if (!report) {
        return ctx.notFound('Informe no encontrado');
      }

      // Eliminar el informe usando documentId
      await strapi.entityService.delete('api::report.report', id);

      return ctx.send({
        success: true,
        message: 'Informe eliminado correctamente'
      });

    } catch (error) {
      console.error('Error deleting report:', error);
      return ctx.internalServerError('Error al eliminar el informe');
    }
  },

  /**
   * Obtener estadísticas de informes
   */
  async getStats(ctx) {
    try {
      const { user } = ctx.state;

      console.log('🔍 getStats - Usuario:', user);
      console.log('🔍 getStats - User ID:', user.id);

      // El admin puede ver estadísticas de todos los informes
      const stats = await strapi.service('api::report.report').getReportStats();

      return ctx.send({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting report stats:', error);
      return ctx.internalServerError('Error al obtener las estadísticas');
    }
  }
}));
