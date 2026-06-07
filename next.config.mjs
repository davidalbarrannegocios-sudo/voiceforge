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
      {
        // Redirect /studio to Sanity's hosted studio
        source: "/studio/:path*",
        destination: "https://zrb45klt.sanity.studio/:path*",
        permanent: false,
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
