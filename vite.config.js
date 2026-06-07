import { defineConfig } from 'vite';
import { resolve }      from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
  },
  resolve: {
    alias: {
      // Allows '@/js/constants.js' instead of '../../../js/constants.js'
      '@': resolve(__dirname, 'src'),
    },
  },
});
