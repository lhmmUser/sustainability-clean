import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'export',
  basePath: '/chat',
  eslint: {
    ignoreDuringBuilds: true,  // Ignore ESLint errors during builds
  },
  typescript: {
    ignoreBuildErrors: true,  // Ignore TypeScript build errors
  },
  trailingSlash: true,
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;
