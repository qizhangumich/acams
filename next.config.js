/** @type {import('next').NextConfig} */
console.log('🔥 NEXT CONFIG LOADED 🔥', Date.now())

const nextConfig = {
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
