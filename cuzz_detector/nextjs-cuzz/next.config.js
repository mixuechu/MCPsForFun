/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/view',
  async rewrites() {
    return [
      {
        source: '/view/:path*',
        destination: '/:path*',
      },
      {
        // 确保API请求能够正确路由
        source: '/view/api/:path*',
        destination: '/api/:path*',
      }
    ]
  }
};
 
module.exports = nextConfig; 