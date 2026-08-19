import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /<repo>/ rather than the domain root. That base is
  // passed by the `build:pages` script instead of being set here, so local dev
  // and any other host keep serving from '/' with no extra config or types.
  server: { port: 5173 },
})
