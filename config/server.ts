export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  admin: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'b3b1b45a0716.ngrok-free.app' // dominio ngrok permitido
    ],
  },
});
