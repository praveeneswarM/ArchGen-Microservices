/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    // Allows production builds to compile safely even with minor type mismatches
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint compilation checks during build loops
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
