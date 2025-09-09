export function generateStoreApprovalEmail(storeName: string, ownerName: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Tu tienda ha sido aprobada! - WaaZaar</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .success-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .success-icon {
            color: #16a34a;
            font-size: 48px;
            margin-bottom: 15px;
        }
        .success-title {
            color: #16a34a;
            font-weight: 700;
            font-size: 24px;
            margin: 0 0 10px 0;
        }
        .success-text {
            color: #15803d;
            font-size: 16px;
            margin: 0;
        }
        .action-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .action-title {
            color: #166534;
            font-weight: 600;
            font-size: 18px;
            margin: 0 0 15px 0;
        }
        .action-text {
            color: #15803d;
            font-size: 14px;
            margin: 0 0 20px 0;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        .features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            text-align: center;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .feature-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .feature-title {
            color: #374151;
            font-weight: 600;
            font-size: 14px;
            margin: 0 0 5px 0;
        }
        .feature-text {
            color: #6b7280;
            font-size: 12px;
            margin: 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 0 0 10px 0;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
        .logo {
            width: 40px;
            height: 40px;
            background-color: white;
            border-radius: 8px;
            display: inline-block;
            margin-bottom: 15px;
        }
        .next-steps {
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .next-steps-title {
            color: #92400e;
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 15px 0;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin: 10px 0;
        }
        .step-number {
            background-color: #f59e0b;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            margin-right: 15px;
            flex-shrink: 0;
        }
        .step-text {
            color: #92400e;
            font-size: 14px;
            line-height: 1.5;
        }
        @media (max-width: 600px) {
            .features {
                grid-template-columns: 1fr;
            }
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo"></div>
            <h1>WaaZaar</h1>
            <p>Tu plataforma de comercio electrónico</p>
        </div>
        
        <div class="content">
            <h2 style="color: #374151; margin: 0 0 20px 0;">¡Hola ${ownerName}!</h2>
            
            <div class="success-box">
                <div class="success-icon">🎉</div>
                <h3 class="success-title">¡Felicitaciones!</h3>
                <p class="success-text">Tu tienda <strong>"${storeName}"</strong> ha sido aprobada y ya está activa en WaaZaar.</p>
            </div>
            
            <p style="color: #6b7280; margin: 0 0 20px 0;">
                Ahora puedes comenzar a vender tus productos y hacer crecer tu negocio en nuestra plataforma. 
                Tu tienda está lista para recibir pedidos de clientes.
            </p>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">🛍️</div>
                    <h4 class="feature-title">Gestiona Productos</h4>
                    <p class="feature-text">Agrega, edita y organiza tu catálogo de productos</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <h4 class="feature-title">Analiza Ventas</h4>
                    <p class="feature-text">Revisa estadísticas y métricas de tu tienda</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📦</div>
                    <h4 class="feature-title">Gestiona Pedidos</h4>
                    <p class="feature-text">Procesa y envía pedidos a tus clientes</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">💬</div>
                    <h4 class="feature-title">Soporte 24/7</h4>
                    <p class="feature-text">Estamos aquí para ayudarte en todo momento</p>
                </div>
            </div>
            
            <div class="next-steps">
                <h4 class="next-steps-title">Próximos pasos recomendados:</h4>
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-text">Completa el perfil de tu tienda con información detallada</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-text">Agrega productos con descripciones atractivas y fotos de calidad</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-text">Configura métodos de pago y envío</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-text">Comienza a promocionar tu tienda</div>
                </div>
            </div>
            
            <div class="action-box">
                <h4 class="action-title">¡Comienza a vender ahora!</h4>
                <p class="action-text">
                    Accede a tu panel de administración para gestionar tu tienda y productos.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tienda" class="btn">
                    Ir a mi tienda
                </a>
            </div>
            
            <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px;">
                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar con nuestro 
                equipo de soporte. ¡Estamos aquí para ayudarte a tener éxito!
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Equipo WaaZaar</strong></p>
            <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/soporte">Centro de Ayuda</a> | 
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contacto">Contacto</a>
            </p>
            <p style="font-size: 12px; color: #9ca3af;">
                Este es un mensaje automático, por favor no respondas a este correo.
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
