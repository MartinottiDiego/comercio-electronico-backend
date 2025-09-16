export function generateStoreRejectionEmail(storeName: string, ownerName: string, rejectionReason: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu tienda ha sido rechazada - WaaZaar</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #22c55e;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .alert-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .alert-title {
            color: #dc2626;
            font-weight: 600;
            font-size: 18px;
            margin: 0 0 10px 0;
        }
        .alert-text {
            color: #b91c1c;
            font-size: 14px;
            margin: 0;
        }
        .reason-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .reason-title {
            color: #374151;
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 10px 0;
        }
        .reason-text {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
        }
        .action-box {
            background-color: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .action-title {
            color: #374151;
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 10px 0;
        }
        .action-text {
            color: #6b7280;
            font-size: 14px;
            margin: 0 0 15px 0;
        }
        .btn {
            display: inline-block;
            background-color: #22c55e;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
        }
        .btn:hover {
            background-color: #16a34a;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #6b7280;
            font-size: 12px;
            margin: 0;
        }
        .footer a {
            color: #22c55e;
            text-decoration: none;
        }
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WaaZaar</h1>
        </div>
        
        <div class="content">
            <h2 style="color: #374151; margin: 0 0 20px 0;">Hola ${ownerName},</h2>
            
            <div class="alert-box">
                <h3 class="alert-title">Tu tienda ha sido rechazada</h3>
                <p class="alert-text">
                    Lamentamos informarte que tu tienda <strong>"${storeName}"</strong> no cumple con nuestros estándares de calidad.
                </p>
            </div>
            
            <div class="reason-box">
                <h4 class="reason-title">Motivo del rechazo:</h4>
                <p class="reason-text">${rejectionReason || 'No se especificó un motivo particular.'}</p>
            </div>
            
            <div class="action-box">
                <h4 class="action-title">¿Qué puedes hacer ahora?</h4>
                <p class="action-text">
                    Puedes corregir los problemas identificados y volver a solicitar la aprobación de tu tienda.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tienda" class="btn">
                    Ir a mi tienda
                </a>
            </div>
            
            <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px;">
                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar con nuestro 
                equipo de soporte. Estamos aquí para ayudarte a tener éxito en WaaZaar.
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Equipo WaaZaar</strong></p>
            <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Visitar WaaZaar</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}








