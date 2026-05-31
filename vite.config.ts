import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project site is served from /TeamTrials_Builder/
// (https://dualchimerra.github.io/TeamTrials_Builder/). Override with VITE_BASE for other hosts.
const base = process.env.VITE_BASE ?? '/TeamTrials_Builder/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
