/** @type {import('next').NextConfig} */
import { resolve } from 'path';            //  ⬅️ required for aliases

const nextConfig = {
  /* ------------------------------------------------------------------ */
  /* 1 · Routing                                                        */
  /* ------------------------------------------------------------------ */
  async redirects() {
    return [
      { source: '/',         destination: '/hub', permanent: true },
      { source: '/dashboard', destination: '/hub', permanent: true },
    ];
  },

  /* ------------------------------------------------------------------ */
  /* 2 · Images                                                         */
  /* ------------------------------------------------------------------ */
  images: {
    remotePatterns: [],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  /* ------------------------------------------------------------------ */
  /* 3 · Webpack aliases  (keeps TS + Webpack in sync)                  */
  /* ------------------------------------------------------------------ */
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),

      /*   tsconfig.json ➜  "@/*": ["src/*"]                */
      /*   Next already handles "@/…" via the 'baseUrl'.    */

      /*   Match the extra TS path aliases exactly          */
      '@supabase-shared': resolve(__dirname, 'supabase/functions/_shared'),
      '@ritual':          resolve(__dirname, 'supabase/functions/_shared/5dayquest'),

      /*   NEW — single-file alias for lightweight helper   */
      '@flame':           resolve(__dirname, 'src/lib/shared/firstFlame.ts'),
    };

    return config;
  },
};

export default nextConfig;
