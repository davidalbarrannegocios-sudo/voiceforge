# VoiceForge

Plataforma web de generación de voz con IA usando Chatterbox TTS (MIT), RunPod Serverless, Next.js 14 y Stripe.

---

## Stack

- **Frontend/Backend**: Next.js 14 App Router + TypeScript
- **Base de datos**: PostgreSQL (Railway) + Prisma ORM
- **Auth**: Clerk
- **Pagos**: Stripe Checkout + Webhooks
- **Almacenamiento de audio**: Cloudflare R2
- **IA TTS**: Chatterbox TTS corriendo en RunPod Serverless
- **Deploy**: Railway

---

## Configuración paso a paso

### 1. Crear las cuentas necesarias

- **Clerk** → https://dashboard.clerk.com — crea una nueva aplicación
- **Stripe** → https://dashboard.stripe.com — activa el modo test
- **Cloudflare R2** → https://dash.cloudflare.com — crea un bucket
- **RunPod** → https://runpod.io — crea una cuenta Serverless
- **Railway** → https://railway.app — crea un nuevo proyecto

---

### 2. Instalar dependencias

```bash
git clone <tu-repo>
cd voiceforge
npm install
```

---

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena cada variable:

#### Clerk
1. Ve a https://dashboard.clerk.com → tu app → **API Keys**
2. Copia `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`

#### Base de datos (Railway)
1. En Railway, añade el plugin **PostgreSQL** a tu proyecto
2. Ve a la pestaña **Connect** del plugin de PostgreSQL
3. Copia la `DATABASE_URL` (formato: `postgresql://...`)

#### Stripe
1. Ve a https://dashboard.stripe.com → **Developers** → **API keys**
2. Copia `STRIPE_SECRET_KEY` (empieza por `sk_test_...`) y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`)
3. Para el webhook secret, ve al paso 8

#### RunPod
1. Ve a https://runpod.io/console/user/settings → **API Keys** → crea una clave
2. El `RUNPOD_ENDPOINT_ID` lo obtienes en el paso 6

#### Cloudflare R2
1. En Cloudflare Dashboard → **R2 Object Storage** → crea un bucket llamado `voiceforge`
2. Ve a **Manage R2 API Tokens** → crea un token con permisos de lectura/escritura
3. Copia `R2_ACCOUNT_ID` (aparece en la sidebar de R2), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
4. `R2_BUCKET_NAME`: `voiceforge`
5. `R2_PUBLIC_URL`: activa el acceso público en el bucket y copia la URL pública (ej: `https://pub-xxx.r2.dev`)

---

### 4. Base de datos

```bash
npx prisma migrate dev --name init
```

---

### 5. Crear productos en Stripe

1. Ve a https://dashboard.stripe.com → **Products** → **Add product**
2. Crea 3 productos:

| Nombre | Precio | Variable |
|--------|--------|----------|
| Starter | 9 EUR (pago único) | `STRIPE_PRICE_STARTER` |
| Pro | 29 EUR (pago único) | `STRIPE_PRICE_PRO` |
| Studio | 79 EUR (pago único) | `STRIPE_PRICE_STUDIO` |

3. Copia los **Price IDs** (formato: `price_xxx`) a tu `.env.local`

---

### 6. Desplegar el handler en RunPod

```bash
cd runpod-handler/
```

1. Ve a https://runpod.io/console/serverless
2. Haz clic en **New Endpoint** → **Custom**
3. Sube el Dockerfile de `runpod-handler/`:
   - **Opción A** (recomendada): Build y sube a Docker Hub:
     ```bash
     docker build -t tu-usuario/voiceforge-handler:latest .
     docker push tu-usuario/voiceforge-handler:latest
     ```
     Usa esa imagen en RunPod
   - **Opción B**: Conecta tu repositorio de GitHub y apunta a `runpod-handler/`
4. Configura las variables de entorno en el panel de RunPod:
   ```
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET_NAME=voiceforge
   R2_PUBLIC_URL=
   ```
5. Guarda y copia el **Endpoint ID** → `RUNPOD_ENDPOINT_ID` en tu `.env.local`

---

### 7. Deploy en Railway

1. Ve a https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Conecta tu repositorio
3. Railway detectará automáticamente que es Next.js
4. Añade el plugin **PostgreSQL** si aún no lo tienes
5. En **Variables**, añade todas las variables de `.env.local`
6. Añade también `NEXT_PUBLIC_APP_URL=https://tu-dominio.railway.app`
7. Railway hará el deploy automáticamente

---

### 8. Configurar webhook de Stripe

1. Ve a https://dashboard.stripe.com → **Developers** → **Webhooks**
2. Haz clic en **Add endpoint**
3. URL: `https://tu-dominio.railway.app/api/webhooks/stripe`
4. Selecciona el evento: `checkout.session.completed`
5. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET` en Railway

Para desarrollo local, usa Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

### 9. Verificación final

```bash
# Desarrollo local
npm run dev
```

1. Visita http://localhost:3000
2. Crea una cuenta con Clerk
3. Ve a `/dashboard`
4. Compra créditos con Stripe (usa tarjeta de test: `4242 4242 4242 4242`)
5. Genera tu primer audio

---

## Estructura del proyecto

```
voiceforge/
├── app/
│   ├── api/
│   │   ├── generate/        # POST - generar audio
│   │   ├── clone/           # POST - clonar voz
│   │   ├── voices/          # GET - listar voces
│   │   │   └── [voiceId]/   # DELETE - eliminar voz
│   │   ├── history/         # GET - historial paginado
│   │   ├── credits/         # GET - créditos del usuario
│   │   ├── create-checkout/ # POST - crear sesión Stripe
│   │   └── webhooks/stripe/ # POST - webhook Stripe
│   ├── dashboard/           # Dashboard (requiere auth)
│   ├── pricing/             # Página de precios
│   ├── sign-in/             # Clerk auth
│   └── sign-up/             # Clerk auth
├── components/ui/           # Componentes base (Button, Badge)
├── lib/
│   ├── prisma.ts            # Cliente Prisma singleton
│   ├── stripe.ts            # Cliente Stripe + planes
│   ├── r2.ts                # Cliente Cloudflare R2
│   ├── runpod.ts            # Cliente RunPod API con polling
│   └── utils.ts             # Utilidades
├── prisma/
│   └── schema.prisma        # Schema de base de datos
├── runpod-handler/
│   ├── handler.py           # Handler RunPod con Chatterbox TTS
│   ├── requirements.txt     # Dependencias Python
│   └── Dockerfile           # Imagen Docker para RunPod
└── middleware.ts             # Clerk middleware (rutas protegidas)
```

---

## Créditos

- **Chatterbox TTS** — Modelo TTS open source (MIT) por Resemble AI
- **RunPod** — Infraestructura de GPU serverless
- **Clerk** — Autenticación moderna para Next.js
- **Stripe** — Pagos seguros
- **Cloudflare R2** — Almacenamiento de objetos compatible con S3
- **Railway** — Hosting y base de datos PostgreSQL
