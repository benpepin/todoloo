import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Remove experimental turbo config for static export
  distDir: 'out'
};

export default nextConfig;
