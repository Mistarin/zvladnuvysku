import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true, // nativní page transitions
  },
  turbopack: {
    root: path.resolve(__dirname), // silence workspace root warning
  },
};

export default nextConfig;
