import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { assertPreviewEnv } from './envGuard.mjs'
import { PRODUCTION_HOSTS } from './src/hosts.js'

// 미리보기 빌드에서 운영 백엔드 연결·설정 누락이면 여기서 빌드를 중단한다.
assertPreviewEnv(process.env)

export default defineConfig({
  plugins: [
    react(),
    // index.html 의 분석 도구 허용 도메인을 src/hosts.js 에서 채운다.
    { name: 'inject-production-hosts', transformIndexHtml: (html) => html.replace('__PRODUCTION_HOSTS__', JSON.stringify(PRODUCTION_HOSTS)) },
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
