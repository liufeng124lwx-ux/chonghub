import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@chonghub/core'],
  // Keep production builds out of the dev server's .next directory. Running
  // `pnpm build` must not invalidate CSS/JS manifests used by `pnpm dev`.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

export default nextConfig;
