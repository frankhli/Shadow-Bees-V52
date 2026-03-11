/**
 * Lighthouse CI 配置
 * 性能预算和自动检测
 * 
 * 使用:
 * npm install -g @lhci/cli
 * lhci autorun
 */

module.exports = {
  ci: {
    // 收集配置
    collect: {
      // 静态站点直接收集
      staticDistDir: './dist',
      
      // URL列表
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/market',
        'http://localhost:5173/pricing',
      ],
      
      // 收集次数（取中位数）
      numberOfRuns: 3,
      
      // 使用Chrome headless
      headful: false,
    },
    
    // 断言（性能预算）
    assert: {
      assertions: {
        // 性能分数
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.90 }],
        
        // 核心指标
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        
        // 资源预算
        'resource-summary:document:size': ['error', { maxNumericValue: 20000 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 1000000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 2000000 }],
        
        // 请求数量
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
      },
    },
    
    // 上传配置
    upload: {
      target: 'temporary-public-storage',
    },
    
    // 服务器配置
    server: {
      // 存储历史数据
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './.lighthouseci/db.sql',
      },
    },
  },
};
