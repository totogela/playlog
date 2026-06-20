import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.cloudflare.steamstatic.com' },
      { hostname: 'steamcdn-a.akamaihd.net' },
    ],
  },
};

export default nextConfig;
