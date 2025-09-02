/**
 * Admin Dashboard Routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/dashboard/metrics',
      handler: 'admin-dashboard.getDashboardMetrics',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/admin/dashboard/user-registration-data',
      handler: 'admin-dashboard.getUserRegistrationData',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};
