/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig