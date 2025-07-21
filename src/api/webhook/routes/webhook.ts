export default {
  routes: [
    // Webhook de Stripe
    {
      method: 'POST',
      path: '/webhook/stripe',
      handler: 'webhook.stripe',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 