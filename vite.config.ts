import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => ({
  cacheDir: mode === 'mock-preview' ? 'node_modules/.vite-mock-preview' : undefined,
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    ...(mode === 'mock-preview'
      ? []
      : [
          cloudflare({
            // Keep local secrets out of production bundles.
            config:
              command === 'build' && mode === 'production'
                ? { secrets: { required: [] } }
                : undefined,
          }),
        ]),
  ],
  optimizeDeps: {
    entries: [
      'src/main.tsx',
      'src/pages/*.tsx',
      ...(mode === 'mock-preview' ? ['src/mocks/*.tsx'] : []),
    ],
  },
}));
