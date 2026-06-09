import type { NextConfig } from "next";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://onfkbvqifvkltelkomgo.supabase.co";
const supabaseOrigin = new URL(supabaseUrl).origin;
const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `connect-src 'self' ${supabaseOrigin} https://www.google-analytics.com https://region1.google-analytics.com`,
  `img-src 'self' data: blob: ${supabaseOrigin} https://www.google-analytics.com https://www.googletagmanager.com`,
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    viewTransition: true, // nativní page transitions
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
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
    root: path.resolve(__dirname), // silence workspace root warning
  },
};

export default nextConfig;
