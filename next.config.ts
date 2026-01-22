import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '163.192.5.200',
        port: '8888',
        pathname: '/images/**',
      },
      {
        protocol: 'http',
        hostname: '163.192.5.200',
        port: '7860',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
