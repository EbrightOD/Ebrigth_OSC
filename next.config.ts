import type { NextConfig } from "next";

// Validate critical env vars (NEXTAUTH_SECRET, BETTER_AUTH_SECRET,
// ENCRYPTION_KEY, DATABASE_URL, …). Crashes the boot if any are missing
// or still set to placeholder values like "replace-with-...". Imported
// here so it runs once before any route compilation.
import "./lib/env";

const nextConfig: NextConfig = {
  // serverExternalPackages covers server-component passes.
  // The webpack() function below covers the instrumentation.ts compilation pass,
  // which serverExternalPackages does NOT reach in Next.js 15.
  serverExternalPackages: ['urllib', 'nodemailer'],

  webpack(config, { isServer }) {
    if (isServer) {
      // Externalize packages that use Node built-ins (fs, stream, zlib, etc.)
      // so Webpack emits require('...') instead of trying to bundle them.
      // This covers the instrumentation.ts compilation pass which
      // serverExternalPackages does NOT reach in Next.js 15.
      const prev = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...prev, 'urllib', 'nodemailer'];
    }
    return config;
  },

  // typecheck and lint must pass for the build to succeed.
  // Override only by exception, never by default.
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: true,
  pageExtensions: ["ts", "tsx", "js", "jsx"],

  // --- ADD THIS REDIRECTS BLOCK ---
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: true,
      },
    ];
  },

  /* Configure rewrites for localhost preview */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          destination: "/:path*",
        },
      ],
    };
  },
};

export default nextConfig;