import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // 多入口路由支持
    {
      name: 'multi-entry-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 如果请求路径以 /enterprise 开头，返回 enterprise.html
          if (req.url?.startsWith('/enterprise')) {
            req.url = '/enterprise.html'
          }
          // 如果请求路径以 /group 开头，返回 group.html
          else if (req.url?.startsWith('/group')) {
            req.url = '/group.html'
          }
          // 如果请求路径以 /admin 开头，返回 admin.html
          else if (req.url?.startsWith('/admin')) {
            req.url = '/admin.html'
          }
          // 否则返回默认的 index.html
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        group: path.resolve(__dirname, 'group.html'),
        enterprise: path.resolve(__dirname, 'enterprise.html'),
      },
    },
  },
})
