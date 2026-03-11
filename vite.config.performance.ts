import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { splitVendorChunkPlugin } from 'vite-plugin-split-vendor-chunk';

/**
 * 性能优化配置
 * 用于生产构建
 */

export default defineConfig({
  plugins: [
    react(),
    
    // 自动代码分割
    splitVendorChunkPlugin(),
    
    // Gzip压缩
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    
    // Brotli压缩
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    
    // 打包分析（可选）
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  
  build: {
    // 目标浏览器
    target: 'es2020',
    
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分块
        manualChunks: {
          // React生态
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI组件
          'ui-vendor': ['framer-motion', 'lucide-react'],
          
          // 图表
          'chart-vendor': ['recharts'],
          
          // 工具库
          'utils-vendor': ['zustand', 'clsx', 'tailwind-merge'],
        },
        
        // 入口文件命名
        entryFileNames: 'assets/[name]-[hash].js',
        
        // 代码块命名
        chunkFileNames: 'assets/[name]-[hash].js',
        
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]';
          }
          
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    // CSS优化
    cssMinify: true,
    cssCodeSplit: true,
    
    // 报告压缩后大小
    reportCompressedSize: true,
    
    // 源映射（生产环境关闭）
    sourcemap: false,
    
    // 清空输出目录
    emptyOutDir: true,
  },
  
  optimizeDeps: {
    // 预构建包含
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'framer-motion',
    ],
    
    // 排除
    exclude: [],
  },
  
  // 实验性功能
  experimental: {
    // 渲染优化
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { runtime: `window.__assetsPath}${JSON.stringify(filename)}` };
      }
      return { relative: true };
    },
  },
});
