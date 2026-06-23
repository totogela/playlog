/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { hostname: 'cdn.cloudflare.steamstatic.com' },
      { hostname: 'steamcdn-a.akamaihd.net' },
      { hostname: 'cdn.akamai.steamstatic.com' },
      { hostname: 'media.rawg.io' },
    ],
  },
};

module.exports = nextConfig;
