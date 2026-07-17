import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Shared with Node spa-server (plain ESM, no types).
// @ts-expect-error -- .mjs helper has no TS types
import { renderConfigJs } from './server/runtime-config.mjs'

/** Serve /config.js in `vite` / `vite preview` from .env + process.env. */
function runtimeConfigPlugin(env: Record<string, string>): Plugin {
  const handle = (
    req: { url?: string },
    res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },
    next: () => void,
  ) => {
    if (req.url?.split('?')[0] !== '/config.js') {
      next()
      return
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(renderConfigJs({ ...process.env, ...env }))
  }

  return {
    name: 'runtime-config',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react(), runtimeConfigPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
