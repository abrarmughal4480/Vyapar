import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone output for Next.js 14 compatibility
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add experimental features for better compatibility
  experimental: {
    // Enable modern React features
    optimizePackageImports: ['lucide-react'],
  },
  // Handle static assets properly
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
};

export default nextConfig;