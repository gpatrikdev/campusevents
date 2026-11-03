import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  // Scan lazy page imports up front so first visits do not reset the in-memory demo.
  optimizeDeps: { entries: ['src/main.tsx', 'src/pages/*.tsx'] },
});
