/**
 * 错误边界组件
 * 
 * 捕获子组件的JavaScript错误，防止整个应用崩溃
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('组件渲染错误', error, { 
      componentStack: errorInfo.componentStack 
    });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
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
      // 自定义fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">页面出错了</h2>
                <p className="text-sm text-gray-500">我们遇到了意外问题</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600 font-medium">
                {this.state.error?.message || '未知错误'}
              </p>
              {import.meta.env.DEV && this.state.errorInfo && (
                <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
            </div>

            <button
              onClick={this.handleGoHome}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-violet-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 页面级错误边界（用于包裹单个页面）
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">该页面加载失败</span>
            </div>
            <p className="mt-2 text-sm text-red-600">
              请刷新页面或联系技术支持
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
