export default ({ env }: { env: any }) => ({
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
        // FORZAR el remitente personalizado
        from: `"WaaZaar" <${env('SMTP_USER')}>`,
      },
      settings: {
        defaultFrom: `"WaaZaar" <${env('SMTP_USER')}>`,
        defaultReplyTo: env('SMTP_USER'),
        // FORZAR configuración adicional
        from: `"WaaZaar" <${env('SMTP_USER')}>`,
        replyTo: env('SMTP_USER'),
      },
    },
  },
  // SOBRESCRIBIR configuración global del plugin
  providers: {
    email: {
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
        from: `"WaaZaar" <${env('SMTP_USER')}>`,
      },
      settings: {
        defaultFrom: `"WaaZaar" <${env('SMTP_USER')}>`,
        defaultReplyTo: env('SMTP_USER'),
      },
    },
  },
});
