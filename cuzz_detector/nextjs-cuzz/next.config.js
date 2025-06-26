/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 暂时移除可能导致冲突的配置
  // basePath: '/view',
  // async rewrites() {
  //   return [
  //     {
  //       source: '/view/:path*',
  //       destination: '/:path*',
  //     }
  //   ]
  // }
};
 
module.exports = nextConfig; 