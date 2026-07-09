import { defineConfig } from 'vite'
import { resolve } from 'path'

const entries = [
  'index',
  'auth/index',
  'map/index',
  'add-memory/index',
  'place/index',
  'memory/index',
  'my-places/index',
  'neighbors/index',
  'family/index',
  'profile/index',
]

const input = {}
for (const e of entries) {
  input[e] = resolve(__dirname, e + '.html')
}

export default defineConfig({
  root: __dirname,
  base: '/',
  build: {
    outDir: resolve(__dirname, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: { input },
  },
})