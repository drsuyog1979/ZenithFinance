import type { NextConfig } from "next";
// @ts-expect-error next-pwa doesn't have official types.
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  /* eslint: {
    ignoreDuringBuilds: true,
  }, */
};

export default withPWA(nextConfig);
