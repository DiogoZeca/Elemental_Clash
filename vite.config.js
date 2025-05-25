import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Elemental_Clash/',
  resolve: {
    alias: {
      crypto: 'crypto-browserify'
    }
  },
  define: {
    'process.env': {},
    global: {}
  }
});