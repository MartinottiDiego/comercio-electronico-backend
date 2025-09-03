export default {
  routes: [
    {
      method: 'PUT',
      path: '/users/:id/restore',
      handler: 'user.restore',
      config: {
        auth: {
          scope: ['authenticated']
        }
      }
    },
    {
      method: 'GET',
      path: '/users/deleted',
      handler: 'user.findDeleted',
      config: {
        auth: {
          scope: ['authenticated']
        }
      }
    }
  ]
};

