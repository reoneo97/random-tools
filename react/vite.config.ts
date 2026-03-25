import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../html',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
})
