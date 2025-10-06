import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export config for development
  // output: 'export',
  // trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
