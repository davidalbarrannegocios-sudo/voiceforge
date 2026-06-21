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
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "CDN-Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/((?!_next/static).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  experimental: {
    proxyTimeout: 300000,
    middlewareClientMaxBodySize: "60mb",
    serverActions: {
      bodySizeLimit: "60mb",
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
