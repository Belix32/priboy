import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  `${pkg.version}-dev`

const supabaseDirectUrl =
  process.env.VITE_SUPABASE_URL ||
  'https://cuuwyvhoxdyolsqvjtgh.supabase.co'

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId),
  },
  plugins: [
    react(),
    {
      name: 'version-manifest',
      closeBundle() {
        const manifestPath = 'dist/manifest.webmanifest'
        const source = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as Record<string, unknown>
        source.start_url = `/?v=${appBuildId}`
        source.id = `priboi-${appBuildId}`
        writeFileSync(manifestPath, `${JSON.stringify(source, null, 2)}\n`)
      },
    },
  ],
  server: {
    proxy: {
      '/supabase': {
        target: supabaseDirectUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
