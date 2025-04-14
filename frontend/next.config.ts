import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  basePath: '/prompt',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,  // Ignore ESLint errors during builds
  },
  typescript: {
    ignoreBuildErrors: true,  // Ignore TypeScript build errors
  },
  trailingSlash: true,
  images: {
    unoptimized: true, // Necessary if you're using Next.js Image optimization in static exports
  },
};

export default nextConfig;
