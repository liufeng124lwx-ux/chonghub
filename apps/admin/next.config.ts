import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@chonghub/core'],
  distDir: '.next-build',
};

export default nextConfig;
