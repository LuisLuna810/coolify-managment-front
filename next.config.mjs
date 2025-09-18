/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add explicit settings for production deployment
  output: 'standalone',
  trailingSlash: false,
  // Disable automatic static optimization for middleware to work properly
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
