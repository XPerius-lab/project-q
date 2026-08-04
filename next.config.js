/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cloudflare R2 public bucket domain eklenecek (deploy sonrası)
    remotePatterns: [],
  },
};

module.exports = nextConfig;
