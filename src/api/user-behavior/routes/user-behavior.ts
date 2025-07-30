export default {
  routes: [
    {
      method: 'GET',
      path: '/user-behaviors',
      handler: 'index.find',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'POST',
      path: '/user-behaviors',
      handler: 'index.create',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
}; 