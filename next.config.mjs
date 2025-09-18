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
  // Prevent automatic redirects that might conflict with middleware
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
}

export default nextConfig
