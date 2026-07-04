/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from any domain for MVP (taxi profile pictures)
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
