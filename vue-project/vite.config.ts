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
    // トップ（安牌シミュレーター）と /report（振込率レポート）の2ページを出力する
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        report: fileURLToPath(new URL('./report/index.html', import.meta.url)),
      },
    },
  },
  base: '/vue-anpai/',

  // テストの設定
  test: {
    globals: true,
  }
})
