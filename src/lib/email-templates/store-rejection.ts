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
        .alert-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .alert-icon {
            color: #dc2626;
            font-size: 24px;
            margin-right: 10px;
        }
        .alert-title {
            color: #dc2626;
            font-weight: 600;
            font-size: 18px;
            margin: 0 0 10px 0;
        }
        .reason-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
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
            font-size: 16px;
            margin: 0 0 10px 0;
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
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin: 15px 0;
        }
        .step-number {
            background-color: #10b981;
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
            color: #374151;
            font-size: 14px;
            line-height: 1.5;
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
            <h2 style="color: #374151; margin: 0 0 20px 0;">Hola ${ownerName},</h2>
            
            <p style="color: #6b7280; margin: 0 0 20px 0;">
                Lamentamos informarte que tu tienda <strong>"${storeName}"</strong> ha sido rechazada 
                después de la revisión por parte de nuestro equipo de administración.
            </p>
            
            <div class="alert-box">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-title">Tienda Rechazada</span>
                </div>
                <p style="color: #dc2626; margin: 0; font-size: 14px;">
                    Tu tienda no cumple con nuestros estándares de calidad y políticas de la plataforma.
                </p>
            </div>
            
            <div class="reason-box">
                <p class="reason-title">Motivo del rechazo:</p>
                <p class="reason-text">${rejectionReason || 'No se especificó un motivo particular.'}</p>
            </div>
            
            <div class="action-box">
                <p class="action-title">¿Qué puedes hacer ahora?</p>
                <p class="action-text">
                    No te preocupes, puedes corregir los problemas y volver a solicitar la aprobación de tu tienda.
                </p>
                
                <div class="steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-text">Revisa el motivo del rechazo y los problemas identificados</div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-text">Realiza las correcciones necesarias en tu tienda</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-text">Contacta con nuestro equipo para una nueva revisión</div>
                    </div>
                </div>
                
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tienda" class="btn">
                    Ir a mi tienda
                </a>
            </div>
            
            <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px;">
                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar con nuestro 
                equipo de soporte. Estamos aquí para ayudarte a tener éxito en WaaZaar.
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




