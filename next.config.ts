import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy pour les cookies CSRF de Sanctum
      { source: '/sanctum/:path*', destination: 'http://127.0.0.1:8000/sanctum/:path*' },
      // Proxy pour toutes les routes API (login, register, etc.)
      { source: '/api/:path*',      destination: 'http://127.0.0.1:8000/api/:path*' },
    ];
  },
};

export default nextConfig;
