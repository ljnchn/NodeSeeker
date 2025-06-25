import { cloudflare } from '@cloudflare/vite-plugin'
import ssrPlugin from 'vite-ssr-components/plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin()],
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'worker',
      fileName: 'index',
      formats: ['es']
    },
    minify: true,
    rollupOptions: {
      external: ['__STATIC_CONTENT_MANIFEST']
    }
  },
  define: {
    global: 'globalThis'
  }
})
