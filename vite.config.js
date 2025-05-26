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
  },
  assetsInclude: ['**/*.gltf', '**/*.bin', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.txt'],
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});