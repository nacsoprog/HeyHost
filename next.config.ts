import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/rss',
        destination: 'https://lexfridman.com/feed/podcast/',
      },
    ]
  },
};

export default nextConfig;
