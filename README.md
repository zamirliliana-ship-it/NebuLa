# Nébula

Monorepo: `backend/` (Express + TypeScript), `frontend/` (React + Vite), `database/migrations/`, `apps-script/`.

## Flujo de seguridad
1. El backend genera el código de 6 dígitos (CSPRNG), guarda solo su HMAC con pepper y vence en 10 min.
2. Lo envía a Apps Script con una petición firmada (HMAC + marca de tiempo + nonce).
3. Verificación atómica en SQL: máx. 5 intentos, un solo uso, bloqueo al agotarlos.
4. Respuestas genéricas en registro, reenvío y recuperación (no revelan si un correo existe).
5. Al restablecer la contraseña se cierran todas las sesiones de la cuenta.

## Puesta en marcha
1. **Supabase** (proyecto nuevo): ejecuta `database/migrations/001_auth_otps.sql`.
   En *Authentication > Sign In / Providers*: desactiva **Allow new users to sign up** y deja **Confirm email** activo.
2. **Apps Script**: crea un proyecto en script.google.com, pega `apps-script/Code.gs`, agrega la propiedad
   `SHARED_SECRET`, y en *Implementar > Nueva implementación > Aplicación web* usa "Ejecutar como: Yo" y
   "Acceso: Cualquier persona". Copia la URL `/exec`.
3. **Secretos** (genera cada uno por separado):
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. **Backend**: `cd backend && cp .env.example .env`, completa y ejecuta `npm install && npm run dev`.
5. **Frontend**: `cd frontend && cp .env.example .env && npm install && npm run dev`.

## Límites conocidos
- Cuota de Apps Script: ~100 correos/día con Gmail personal, ~1500 con Google Workspace.
- La sesión vive en memoria del navegador (se pierde al recargar). Siguiente paso: refresh token en cookie httpOnly.
- Sin 2FA ni verificación de contraseñas filtradas (HIBP está en el plan Pro de Supabase).
