/** @type {import('next').NextConfig} */
// Space-separated extra origins allowed to embed this app in an iframe (e.g. staging Keco URL).
const extraFrameAncestors = (process.env.SIMULATION_FRAME_ANCESTORS ?? '').trim();
const defaultKecoDevOrigins = 'http://localhost:3000 http://127.0.0.1:3000';
const frameAncestorList = [defaultKecoDevOrigins, extraFrameAncestors].filter(Boolean).join(' ');

const nextConfig = {
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${frameAncestorList};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
