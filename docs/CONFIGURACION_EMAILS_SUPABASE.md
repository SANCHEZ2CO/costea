# Configuración de Emails de Confirmación en Supabase

## Objetivo
Personalizar los correos electrónicos de confirmación para que sean más humanos y profesionales cuando los usuarios se registran en COSTEA.

## Pasos para Personalizar el Email en Supabase

### 1. Acceder al Dashboard de Supabase
- Ve a: https://supabase.com/dashboard
- Selecciona el proyecto: **pvfuncpkzqibeyxxcqjx**

### 2. Navegar a la Configuración de Emails
1. En el menú lateral, haz clic en **Authentication**
2. Luego en la pestaña **Email Templates**
3. Selecciona **Confirm signup** (Confirmar registro)

### 3. Configurar la URL de Redirección
Antes de personalizar el template, asegúrate de que la URL de redirección esté configurada:

1. Ve a **Authentication** → **URL Configuration**
2. En **Redirect URLs**, agrega:
   - `https://costea.sanchez2.co` (Producción)
   - `http://localhost:5173` (Desarrollo - si aún no está)

### 4. Personalizar el Template de Email

Reemplaza el template actual con el siguiente contenido HTML personalizado:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirma tu correo - COSTEA</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                    
                    <!-- Header con gradiente -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                                ¡Bienvenido a COSTEA! 🎉
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">
                                Tu herramienta para costear como un profesional
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                                Hola <strong>{{ .Data.full_name }}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                                ¡Qué emoción tenerte aquí! 🚀 Estás a un solo paso de comenzar a crear presupuestos profesionales y llevar el control total de tus costos.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                                Solo necesitamos que confirmes tu dirección de correo electrónico para activar tu cuenta y empezar a disfrutar de todas las funcionalidades que COSTEA tiene para ti.
                            </p>
                            
                            <!-- Botón CTA -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                                            ✨ Confirmar mi correo
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                <strong>Nota:</strong> Si no creaste esta cuenta, puedes ignorar este mensaje de forma segura. 
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer con información adicional -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                <strong>¿Qué puedes hacer con COSTEA?</strong>
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 14px; line-height: 1.8;">
                                <li>Crear costeos precisos para tus proyectos</li>
                                <li>Gestionar tu inventario de insumos</li>
                                <li>Calcular automáticamente tus márgenes de ganancia</li>
                                <li>Guardar y acceder a tus recetas desde cualquier lugar</li>
                            </ul>
                        </td>
                    </tr>
                    
                    <!-- Footer con links -->
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #1e293b;">
                            <p style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 13px;">
                                © 2026 COSTEA • Hecho con ❤️ para emprendedores
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                <a href="https://costea.sanchez2.co" style="color: #94a3b8; text-decoration: none;">
                                    costea.sanchez2.co
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

### 5. Variables Disponibles en el Template

Puedes usar estas variables en el template:
- `{{ .ConfirmationURL }}` - URL de confirmación (YA INCLUIDA)
- `{{ .Token }}` - Token de confirmación
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL del sitio
- `{{ .Data.full_name }}` - Nombre completo del usuario (metadata personalizada)

### 6. Configurar el Asunto del Email

En el mismo formulario, modifica el campo **Subject** (Asunto):

```
¡Bienvenido a COSTEA! Confirma tu correo para empezar 🚀
```

### 7. Guardar y Probar

1. Haz clic en **Save** para guardar los cambios
2. Realiza una prueba creando una nueva cuenta
3. Verifica que el email llegue con el nuevo diseño

## Notas Importantes

### Configuración Adicional

1. **Verificación de Email**: Asegúrate de que en **Authentication** → **Settings** → **Email Auth** esté habilitado "Confirm email"

2. **Double Opt-in**: Si quieres que los usuarios confirmen su email antes de poder acceder:
   - Ve a **Authentication** → **Settings**
   - Activa "Enable email confirmations"

3. **Rate Limiting**: Configura límites de rate para evitar spam:
   - **Authentication** → **Rate Limits**
   - Ajusta según tus necesidades

### URLs de Producción

El código de la aplicación ya está configurado para redirigir automáticamente a:
- **Producción**: `https://costea.sanchez2.co`
- **Desarrollo**: `http://localhost:5173`

### Personalización Futura

Si necesitas personalizar más elementos:
- **Reset Password Email**: Para recuperación de contraseña
- **Magic Link Email**: Para enlaces mágicos de inicio de sesión
- **Invite User Email**: Para invitaciones de usuarios

## Solución de Problemas

### Email no llega
1. Verifica la carpeta de spam
2. Revisa que el email esté correctamente configurado en Supabase
3. Verifica los logs en **Authentication** → **Logs**

### URL de redirección no funciona
1. Asegúrate de que la URL esté en la lista de **Redirect URLs** permitidas
2. Verifica que el protocolo (http/https) sea correcto

### Cambios no se reflejan
1. Limpia la caché del navegador
2. Verifica que hayas guardado los cambios
3. Espera unos minutos para que se propaguen los cambios

---

## Estado Actual de la Configuración

✅ **Completado**:
- Código actualizado para incluir `emailRedirectTo` en `signUpWithEmail`
- Función `getAuthRedirectUrl` creada para detectar entorno
- Configuración de cliente Supabase optimizada

⏳ **Pendiente** (requiere acceso al Dashboard):
- Configurar el template de email personalizado
- Actualizar el asunto del email
- Verificar las Redirect URLs permitidas
