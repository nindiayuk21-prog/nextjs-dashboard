import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Izinkan gambar lokal dari /public/customers/
    // Tambahkan domain eksternal di sini jika diperlukan, contoh:
    // remotePatterns: [{ protocol: 'https', hostname: 'example.com' }],
  },
};

export default nextConfig;
