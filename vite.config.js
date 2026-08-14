import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages sert ce repo sous /music_tagger_frontend/ (site de projet, pas
  // un domaine custom) : uniquement en build, pour ne pas perturber le dev server.
  base: command === 'build' ? '/music_tagger_frontend/' : '/',
}))
