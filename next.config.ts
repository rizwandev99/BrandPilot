import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@resvg/resvg-js',
    '@resvg/resvg-js-win32-x64-msvc',
    '@resvg/resvg-js-linux-x64-gnu',
    '@resvg/resvg-js-linux-x64-musl',
    '@resvg/resvg-js-darwin-arm64',
    '@resvg/resvg-js-darwin-x64',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@resvg/resvg-js');
    }
    return config;
  },
};

export default nextConfig;
