import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper to dynamically read backend port from backend/.env
const getBackendPort = () => {
  try {
    const backendEnvPath = path.resolve(__dirname, '../backend/.env')
    if (fs.existsSync(backendEnvPath)) {
      const envContent = fs.readFileSync(backendEnvPath, 'utf-8')
      const match = envContent.match(/^PORT\s*=\s*(\d+)/m)
      if (match) {
        return parseInt(match[1], 10)
      }
    }
  } catch (error) {
    console.warn('Could not parse backend port from .env, falling back to 5000:', error.message)
  }
  return 5000
}

const backendPort = getBackendPort()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/temp': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      }
    }
  }
})
