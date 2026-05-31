import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project site is served from /uma_ttbuilder/
// (https://dualchimerra.github.io/uma_ttbuilder/). Override with VITE_BASE for other hosts.
const base = process.env.VITE_BASE ?? '/uma_ttbuilder/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
