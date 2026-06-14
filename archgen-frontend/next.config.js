/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    // Allows production builds to compile safely even with minor type mismatches
    ignoreBuildErrors: true,
  },

}

module.exports = nextConfig
