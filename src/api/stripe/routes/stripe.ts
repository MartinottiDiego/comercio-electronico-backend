export default {
  routes: [
    // Crear sesión de checkout
    {
      method: 'POST',
      path: '/stripe/create-checkout-session',
      handler: 'stripe.createCheckoutSession',
      config: {
        auth: false, // Permitir acceso sin autenticación para checkout
        policies: [],
        middlewares: [],
      },
    },
    // Crear Payment Intent
    {
      method: 'POST',
      path: '/stripe/create-payment-intent',
      handler: 'stripe.createPaymentIntent',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Recuperar sesión de checkout
    {
      method: 'GET',
      path: '/stripe/checkout-session/:sessionId',
      handler: 'stripe.retrieveCheckoutSession',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Recuperar Payment Intent
    {
      method: 'GET',
      path: '/stripe/payment-intent/:paymentIntentId',
      handler: 'stripe.retrievePaymentIntent',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Crear cliente
    {
      method: 'POST',
      path: '/stripe/create-customer',
      handler: 'stripe.createCustomer',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Crear reembolso
    {
      method: 'POST',
      path: '/stripe/create-refund',
      handler: 'stripe.createRefund',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Webhook de Stripe
    {
      method: 'POST',
      path: '/stripe/webhook',
      handler: 'stripe.webhook',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 