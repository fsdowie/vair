import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const now = new Date();
const releaseDate = now.toLocaleString('en-US', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
  timeZone: 'UTC'
}) + ' UTC';

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
