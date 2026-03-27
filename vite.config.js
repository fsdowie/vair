import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { execSync } from 'child_process'

let releaseDate = 'unknown'
try {
  releaseDate = execSync('git log -1 --format=%cd --date=format:"%Y/%m/%d %H:%M"').toString().trim()
} catch (e) {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __RELEASE_DATE__: JSON.stringify(releaseDate),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
