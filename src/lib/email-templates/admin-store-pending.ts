export function generateAdminStorePendingEmail(storeName: string, ownerName: string, ownerEmail: string, specialty: string, location: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva tienda pendiente de aprobación - WaaZaar Admin</title>
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
            text-align: center;
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
        .info-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-title {
            color: #166534;
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 15px 0;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #dcfce7;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #166534;
            font-weight: 500;
        }
        .info-value {
            color: #15803d;
            font-weight: 600;
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
            margin: 5px;
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
            .info-item {
                flex-direction: column;
                align-items: flex-start;
            }
            .info-value {
                margin-top: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WaaZaar Admin</h1>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <h3 class="alert-title">Nueva tienda pendiente de aprobación</h3>
                <p class="alert-text">Se ha recibido una nueva solicitud de tienda que requiere tu revisión.</p>
            </div>
            
            <div class="info-box">
                <h4 class="info-title">Información de la tienda</h4>
                <div class="info-item">
                    <span class="info-label">Nombre de la tienda:</span>
                    <span class="info-value">${storeName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Especialidad:</span>
                    <span class="info-value">${specialty || 'No especificada'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ubicación:</span>
                    <span class="info-value">${location || 'No especificada'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Estado:</span>
                    <span class="info-value">Pendiente de aprobación</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha de solicitud:</span>
                    <span class="info-value">${new Date().toLocaleDateString('es-ES')}</span>
                </div>
            </div>
            
            <div class="info-box">
                <h4 class="info-title">Información del propietario</h4>
                <div class="info-item">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${ownerName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${ownerEmail}</span>
                </div>
            </div>
            
            <div class="action-box">
                <h4 class="action-title">Acción requerida</h4>
                <p class="action-text">
                    Revisa la tienda y decide si aprobarla o rechazarla. 
                    Si la rechazas, proporciona un motivo claro al propietario.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tiendas" class="btn">
                    Revisar tienda
                </a>
            </div>
            
            <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 12px;">
                <strong>Nota:</strong> Las tiendas pendientes deben ser revisadas en un plazo máximo de 3 días hábiles.
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Panel de Administración WaaZaar</strong></p>
            <p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin">Dashboard Admin</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
