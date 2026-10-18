import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Une instance par basePath : /comi (prod), /comi/dev (préproduction). Fixé au build.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/comi",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;