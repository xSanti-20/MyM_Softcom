/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Buenas prácticas
  swcMinify: true,       // Optimiza el build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'], // Reconoce archivos .jsx
};

export default nextConfig;
