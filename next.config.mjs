/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
  transpilePackages: ["sanity", "@sanity/ui", "@sanity/vision", "next-sanity"],
  webpack(config) {
    config.module.parser = {
      "javascript/auto": { exportsPresence: "warn" },
      "javascript/esm": { exportsPresence: "warn" },
    }
    return config
  },
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_Y2xlcmsuZWxpdGVsYWJzLmVzJA",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_51SfT270R6kPOy9LAsoLDipJhUS39SPIR0F38XModa22G81rqUlcbApO5PU8cNbPrOU2TkSMDr9wTULIRfM3FTEkI001jG3aTrj",
  },
  serverExternalPackages: ["@prisma/client"],
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
