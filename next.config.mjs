/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["sanity", "@sanity/ui", "@sanity/vision", "@sanity/code-input", "next-sanity"],
  async redirects() {
    return [
      {
        source: "/dashboard/mi-cuenta",
        destination: "/dashboard/account",
        permanent: true,
      },
    ];
  },
  experimental: {
    proxyTimeout: 300000,
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_Y2xlcmsuZWxpdGVsYWJzLmVzJA",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_51SfT270R6kPOy9LAsoLDipJhUS39SPIR0F38XModa22G81rqUlcbApO5PU8cNbPrOU2TkSMDr9wTULIRfM3FTEkI001jG3aTrj",
  },
  serverExternalPackages: ["@prisma/client"],
  webpack(config) {
    // Sanity v5.30 imports `useEffectEvent` from 'react' in ESM chunks.
    // React 19 exports it in CJS at runtime, but webpack's static analysis of
    // react/index.js (conditional CJS require) can't enumerate named exports.
    // Downgrade the check from error to warn in all JS module parsers.
    const warn = { exportsPresence: 'warn' }
    config.module.parser = {
      ...config.module.parser,
      'javascript/auto': { ...(config.module.parser?.['javascript/auto'] ?? {}), ...warn },
      'javascript/esm':  { ...(config.module.parser?.['javascript/esm']  ?? {}), ...warn },
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
};

export default nextConfig;
