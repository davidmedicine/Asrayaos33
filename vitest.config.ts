import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/tests/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@supabase-shared': resolve(__dirname, 'supabase/functions/_shared'),
      '@ritual': resolve(__dirname, 'supabase/functions/_shared/5dayquest'),
      '@flame': resolve(__dirname, 'src/lib/shared/firstFlame.ts'),
    },
  },
});
