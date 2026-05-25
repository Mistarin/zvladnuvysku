import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone', // optimální pro Railway deployment
  experimental: {
    viewTransition: true, // nativní page transitions
  },
  turbopack: {
    root: path.resolve(__dirname), // silence workspace root warning
  },
};

export default nextConfig;
