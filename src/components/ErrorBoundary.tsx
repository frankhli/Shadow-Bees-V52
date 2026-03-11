/**
 * 错误边界组件
 * 捕获子组件的错误，防止整个应用崩溃
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // 这里可以上报错误到监控系统（如 Sentry）
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误页面
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-bg-secondary rounded-2xl border border-border-color p-8 text-center">
            {/* 错误图标 */}
            <div className="w-20 h-20 mx-auto mb-6 bg-neon-red/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={40} className="text-neon-red" />
            </div>

            {/* 错误标题 */}
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              页面出错了
            </h1>
            <p className="text-text-secondary mb-6">
              抱歉，页面发生了意外错误。我们已经记录了这个问题。
            </p>

            {/* 错误详情（开发环境显示） */}
            {this.state.error && (
              <div className="mb-6 p-4 bg-bg-primary rounded-lg text-left">
                <p className="text-sm text-neon-red font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-text-muted overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all font-medium"
              >
                <RefreshCw size={18} />
                重试
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 bg-bg-primary border border-border-color rounded-lg hover:border-gray-600 transition-all text-sm"
                >
                  刷新页面
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-bg-primary border border-border-color rounded-lg hover:border-gray-600 transition-all text-sm"
                >
                  <Home size={16} />
                  返回首页
                </button>
              </div>
            </div>

            {/* 提示信息 */}
            <p className="mt-6 text-xs text-text-muted">
              如果问题持续存在，请联系技术支持
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 简单的错误边界 Hook
 * 用于函数组件中捕获异步错误
 */
export function useErrorHandler() {
  return (error: Error) => {
    console.error('Caught error:', error);
    // 可以在这里上报错误
    // reportError(error);
  };
}

export default ErrorBoundary;
