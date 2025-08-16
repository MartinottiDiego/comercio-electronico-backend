export default ({ env }: { env: any }) => ({
  auth: {
    secret: env('JWT_SECRET'),
  },
  jwt: {
    expiresIn: '30d',
  },
  url: env('FRONTEND_URL', 'http://localhost:3001'),
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env.int('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
        secure: false,
        tls: {
          rejectUnauthorized: false,
        },
      },
      settings: {
        defaultFrom: `"WaaZaar" <${env('SMTP_USER')}>`,
        defaultReplyTo: env('SMTP_USER'),
      },
    },
  },
  templates: {
    reset: {
      subject: 'Restablecer Contraseña - WaaZaar',
      template: 'forgot-password',
    },
    confirmation: {
      subject: 'Confirmar Cuenta - WaaZaar',
      template: 'email-confirmation',
    },
  },
});
