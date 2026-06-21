# Elite Labs — CLAUDE.md

## Stack
- Next.js 15, TypeScript, Tailwind CSS
- Prisma + Supabase/PostgreSQL
- Clerk (auth), Stripe (payments), Fish Audio API (TTS), ElevenLabs via ai33.pro (Turbo TTS)
- Hetzner Object Storage (audio files), Hetzner CPX22 VPS (IP: 167.233.53.68)
- Nginx + PM2, Cloudflare (DDoS), GitHub Actions (CI/CD)

## Deploy command (ALWAYS use this exactly)
cd /var/www/elitelabs && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && cp .env.local .next/standalone/.env.local && echo "BUILD_ID=$(date +%s)" >> .next/standalone/.env.local && pm2 restart elitelabs --update-env

## CRITICAL rules
- NEVER use `prisma db push --accept-data-loss`
- NEVER mix server-side edits with local Claude Code edits (causes Git conflicts)
- The ANTHROPIC_API_KEY must ALWAYS be restored after deploy (copy from .env.local)
- standalone/.env.local is overwritten on every deploy — always restore ANTHROPIC_API_KEY after

## Architecture
- Audio files stored in Hetzner Object Storage bucket: elitelabs-audio
- Public URL: https://elitelabs-audio.fsn1.your-objectstorage.com
- Nginx config: /etc/nginx/sites-available/elitelabs
- PM2 process name: elitelabs
- App runs on localhost:3000

## Key files
- /var/www/elitelabs/app/dashboard/page.tsx — main dashboard (TTS, history, clone)
- /var/www/elitelabs/app/admin/page.tsx — admin panel
- /var/www/elitelabs/app/pricing/page.tsx — pricing page
- /var/www/elitelabs/app/page.tsx — landing page
- /var/www/elitelabs/components/VoiceAvatarGenerative.tsx — colored voice avatars
- /var/www/elitelabs/lib/voice-gradient.ts — gradient generator
- /var/www/elitelabs/app/api/tts/auto-tag/route.ts — auto-tag with Anthropic
- /var/www/elitelabs/app/api/download-audio/route.ts — audio download proxy

## Nginx special config
location /api/download-audio has proxy_buffering off and 600s timeouts for large file downloads.

## Plans & pricing
- free, creator ($8), plus ($26), pro ($49), elite ($315), starter, enterprise, lifetime
- Referral commissions: 5% of plan price, 7-day pending period

## Admin user
- albarranjimenezd@gmail.com (plan: creator, 250k credits)

# Seguridad
Este proyecto debe seguir las mejores prácticas de seguridad web en todo momento. Aplica estas reglas en cada archivo y endpoint que generes:

## 1. Rate Limiting
- Implementa rate limiting en TODOS los endpoints de la API.
- Usa un middleware de rate limiting (como @upstash/ratelimit o el equivalente en Next.js).
- Límites recomendados:
  - API general: 100 peticiones por IP cada 15 minutos.
  - Auth (login/registro): 5 intentos por IP cada 15 minutos.
  - Endpoints sensibles (pagos, admin): 10 peticiones por IP cada 15 minutos.
- Devuelve un error 429 (Too Many Requests) con un mensaje claro cuando se exceda el límite.

## 2. Variables de Entorno y Secretos
- NUNCA escribas API keys, tokens, contraseñas o secretos directamente en el código.
- Usa SIEMPRE variables de entorno (.env.local) para cualquier credencial.
- Asegúrate de que .env.local está en el .gitignore.
- Si necesitas una API key nueva, documéntala solo como nombre de variable, nunca con el valor real.

## 3. Validación de Inputs (Anti-Inyección)
- Valida y sanitiza TODOS los inputs del usuario antes de procesarlos.
- Usa zod para definir schemas estrictos en los endpoints.
- Nunca construyas queries SQL concatenando strings. Usa SIEMPRE Prisma (ya configurado).
- Rechaza y loguea cualquier input que no pase la validación.

## 4. Headers de Seguridad
- Configura headers de seguridad HTTP en next.config.js: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security.

## 5. Autenticación y Sesiones
- La autenticación usa Clerk — no implementar auth custom.
- Usar siempre auth() de @clerk/nextjs/server para verificar sesión en API routes.
- Las cookies de sesión de Clerk ya son httpOnly y secure.

## 6. Logging de Seguridad
- Loguea intentos fallidos de autenticación.
- Loguea peticiones que excedan el rate limit.
- Loguea inputs rechazados por validación (posibles intentos de inyección).
- NUNCA loguees datos sensibles (contraseñas, tokens, datos personales completos).
