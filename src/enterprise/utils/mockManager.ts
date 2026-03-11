/**
 * Mock数据管理器
 * 
 * 功能：
 * 1. 统一控制Mock数据的开关
 * 2. 模拟网络延迟
 * 3. 模拟错误率
 * 4. 记录Mock调用日志
 * 
 * 控制台快捷方式：
 * - mockControl.enable()    // 启用Mock
 * - mockControl.disable()   // 禁用Mock
 * - mockControl.status()    // 查看状态
 * - mockControl.setDelay(500)  // 设置延迟
 */

interface MockConfig {
  enabled: boolean;
  delay: number;
  errorRate: number;
  logCalls: boolean;
}

const DEFAULT_CONFIG: MockConfig = {
  enabled: import.meta.env.DEV,
  delay: 300,
  errorRate: 0,
  logCalls: true,
};

const getConfig = (): MockConfig => {
  try {
    const stored = localStorage.getItem('mock_config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
};

export const setMockConfig = (config: Partial<MockConfig>) => {
  const newConfig = { ...getConfig(), ...config };
  localStorage.setItem('mock_config', JSON.stringify(newConfig));
};

export const getMockConfig = getConfig;

export function mockWrapper<T>(
  mockFn: () => T | Promise<T>,
  options?: {
    name?: string;
    delay?: number;
    errorRate?: number;
  }
): Promise<T> {
  const config = getConfig();
  
  return new Promise((resolve, reject) => {
    if (!config.enabled) {
      reject(new Error('Mock模式已禁用，请配置真实API'));
      return;
    }

    const delay = options?.delay ?? config.delay;
    const errorRate = options?.errorRate ?? config.errorRate;
    
    setTimeout(async () => {
      if (Math.random() < errorRate) {
        reject(new Error(`Mock随机错误: ${options?.name || 'unknown'}`));
        return;
      }

      try {
        const result = await mockFn();
        if (config.logCalls) {
          console.log(`[Mock] ${options?.name || 'unknown'}:`, result);
        }
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

// 控制台快捷方式
if (typeof window !== 'undefined') {
  (window as any).mockControl = {
    enable: () => { setMockConfig({ enabled: true }); console.log('Mock已启用'); },
    disable: () => { setMockConfig({ enabled: false }); console.log('Mock已禁用'); },
    setDelay: (ms: number) => { setMockConfig({ delay: ms }); console.log(`延迟设置为${ms}ms`); },
    setErrorRate: (rate: number) => { setMockConfig({ errorRate: rate }); console.log(`错误率设置为${rate * 100}%`); },
    status: () => {
      const config = getConfig();
      console.table(config);
      return config;
    },
  };
  
  console.log('[MockManager] 可用命令: mockControl.enable() / disable() / status() / setDelay(ms) / setErrorRate(0-1)');
}
