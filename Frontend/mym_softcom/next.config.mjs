/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  experimental: {
    appDir: true, // Usa el App Router
  }
};

export default nextConfig;
