/**
 * 错误边界组件
 * 捕获 React 错误，防止页面白屏
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 自定义 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F19]"
        >
          <div className="max-w-lg w-full text-center">
            {/* 错误图标 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <AlertTriangle size={48} className="text-red-400" />
            </motion.div>

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-white mb-2">
              页面出现了错误
            </h1>
            <p className="text-gray-400 mb-6">
              抱歉，页面加载时遇到了问题。请尝试刷新或返回上一页。
            </p>

            {/* 错误详情（开发模式显示） */}
            {this.state.error && (
              <div className="mb-6 text-left">
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-gray-500 text-xs overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                variant="primary"
                icon={<RefreshCw size={16} />}
                onClick={this.handleReset}
              >
                重新加载
              </Button>
              <Button
                variant="secondary"
                icon={<ArrowLeft size={16} />}
                onClick={this.handleGoBack}
              >
                返回上一页
              </Button>
              <Button
                variant="ghost"
                icon={<Home size={16} />}
                onClick={this.handleGoHome}
              >
                回到首页
              </Button>
            </div>

            {/* 提示 */}
            <p className="text-gray-500 text-sm mt-8">
              如果问题持续存在，请联系技术支持
            </p>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// 高阶组件版本
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
