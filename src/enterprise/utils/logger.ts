/**
 * 企业端日志工具
 * 
 * 特性：
 * - 开发环境输出到控制台
 * - 生产环境可配置上报
 * - 支持分类标签
 * - 支持上下文信息
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDev = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const prefix = `[Enterprise] [${level.toUpperCase()}] [${timestamp}]`;
    
    if (this.isDev) {
      switch (level) {
        case 'debug':
          console.debug(prefix, message, context || '');
          break;
        case 'info':
          console.info(prefix, message, context || '');
          break;
        case 'warn':
          console.warn(prefix, message, context || '');
          break;
        case 'error':
          console.error(prefix, message, context || '');
          break;
      }
    }
    
    // 这里可以添加生产环境日志上报逻辑
    // if (level === 'error') { reportToSentry(...); }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, { ...context, error: error?.message, stack: error?.stack });
  }
}

export const logger = new Logger();
