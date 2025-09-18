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
  // Ensure proper handling of rewrites and redirects in production
  async rewrites() {
    return []
  },
  async redirects() {
    return []
  },
  // Headers configuration for CORS and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig
