/// <reference types="vitest" />

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  // build時の出力先のフォルダを設定
  // Document
  // https://vitejs.dev/config/build-options.html#build-outdir
  build: {
    outDir: '../docs',
  },
  base: '/vue-anpai/',

  // テストの設定
  test: {
    globals: true,
  }
})
