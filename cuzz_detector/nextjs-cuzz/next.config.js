/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/view',
  async rewrites() {
    return [
      {
        source: '/view/:path*',
        destination: '/:path*',
      }
    ]
  }
};
 
module.exports = nextConfig; 