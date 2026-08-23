import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://onfkbvqifvkltelkomgo.supabase.co; connect-src 'self' https://onfkbvqifvkltelkomgo.supabase.co https://www.google-analytics.com; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ]
  },
  experimental: {
    viewTransition: true, // nativní page transitions
    serverActions: {
      bodySizeLimit: "24mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "onfkbvqifvkltelkomgo.supabase.co",
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
