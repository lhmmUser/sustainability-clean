/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/api/dashboard',
    assetPrefix: '/api/dashboard',
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,  // Ignore ESLint errors during builds
    },
    typescript: {
        ignoreBuildErrors: true,  // Ignore TypeScript build errors
    },
    trailingSlash: true,
    images: {
        unoptimized: true
    },
};

export default nextConfig;
