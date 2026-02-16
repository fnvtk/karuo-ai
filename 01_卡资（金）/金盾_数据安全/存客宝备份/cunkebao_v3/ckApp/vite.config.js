import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      // 根目录别名
      '@': resolve(__dirname, '/'),
      '@root': resolve(__dirname, '/'),
      
      // 页面和组件别名
      '@pages': resolve(__dirname, 'pages'),
      '@components': resolve(__dirname, 'components'),
      
      // 工具和配置别名
      '@utils': resolve(__dirname, 'utils'),
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/uni.scss";`
      }
    }
  }
}) 