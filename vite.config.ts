import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this from /<repo>/, not the domain root. Only applied in
  // the Pages workflow so local dev and other hosts keep serving from '/'.
  base: process.env.GITHUB_PAGES === 'true' ? '/designer-interview-platform/' : '/',
  server: { port: 5173 },
})
