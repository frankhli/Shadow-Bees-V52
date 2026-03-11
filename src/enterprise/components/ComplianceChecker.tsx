/**
 * 合规检测组件
 * 
 * 集成到：
 * 1. 内容工厂 - 发布前检测
 * 2. AI客服 - 回复前检测
 * 
 * 功能：
 * - 实时高亮违规内容
 * - 显示修改建议
 * - 拦截严重违规
 * - 一键修复
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  XCircle,
  Wand2,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { 
  complianceService, 
  useRealtimeCompliance,
  type ComplianceViolation,
  type PlatformType,
  type ContentType,
  type RiskLevel 
} from '../services/complianceService';

interface ComplianceCheckerProps {
  content: string;
  platform: PlatformType;
  contentType?: ContentType;
  hotelId?: string;
  hotelName?: string;
  source?: 'content_factory' | 'ai_chat';
  contentId?: string;
  onViolationsChange?: (violations: ComplianceViolation[], passed: boolean) => void;
  onAutoFix?: (fixedContent: string) => void;
  className?: string;
  compact?: boolean; // 紧凑模式（用于AI客服）
}

export function ComplianceChecker({
  content,
  platform,
  contentType: _contentType,
  hotelId: _hotelId,
  hotelName: _hotelName,
  source: _source,
  contentId: _contentId,
  onViolationsChange,
  onAutoFix,
  className = '',
  compact = false,
}: ComplianceCheckerProps) {
  const { violations, isChecking, check } = useRealtimeCompliance(platform);
  const [expanded, setExpanded] = useState(false);
  const [fixedContent, setFixedContent] = useState<string>('');
  const [showFixed, setShowFixed] = useState(false);
  
  // 实时检测
  useEffect(() => {
    const timer = setTimeout(() => {
      check(content);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [content, platform, check]);
  
  // 通知父组件
  useEffect(() => {
    const hasBlock = violations.some(v => v.riskLevel === 'critical');
    onViolationsChange?.(violations, violations.length === 0 || !hasBlock);
  }, [violations, onViolationsChange]);
  
  // 自动修复
  const handleAutoFix = useCallback(async () => {
    const fixed = await complianceService.suggestFix(content, violations);
    setFixedContent(fixed);
    setShowFixed(true);
    onAutoFix?.(fixed);
  }, [content, violations, onAutoFix]);
  
  // 获取风险等级样式
  const getRiskStyles = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: AlertOctagon,
          label: '严重违规',
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          icon: AlertTriangle,
          label: '高风险',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: AlertTriangle,
          label: '中风险',
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: Shield,
          label: '低风险',
        };
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: CheckCircle2,
          label: '合规',
        };
    }
  };
  
  const overallRisk = violations.length === 0 
    ? 'pass' 
    : violations.some(v => v.riskLevel === 'critical') 
      ? 'critical' 
      : violations.some(v => v.riskLevel === 'high') 
        ? 'high' 
        : violations.some(v => v.riskLevel === 'medium') 
          ? 'medium' 
          : 'low';
  
  const overallStyles = getRiskStyles(overallRisk);
  const OverallIcon = overallStyles.icon;
  const hasBlockLevel = violations.some(v => v.riskLevel === 'critical');
  
  if (compact) {
    // 紧凑模式 - 用于AI客服输入框下方
    return (
      <div className={`${className}`}>
        {isChecking ? (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            检测中...
          </div>
        ) : violations.length > 0 ? (
          <div className={`rounded-lg border ${overallStyles.border} ${overallStyles.bg} p-2`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-xs ${overallStyles.text}`}>
                <OverallIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{overallStyles.label}</span>
                <span className="opacity-70">· 发现 {violations.length} 个问题</span>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {violations.slice(0, 3).map((v, i) => (
                  <div key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      v.riskLevel === 'critical' ? 'bg-red-500' :
                      v.riskLevel === 'high' ? 'bg-orange-500' :
                      v.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{v.ruleName}</div>
                      <div className="text-gray-400 truncate">"{v.matchedText}" → {v.suggestion}</div>
                    </div>
                  </div>
                ))}
                {violations.length > 3 && (
                  <div className="text-xs text-gray-400 pl-3">
                    还有 {violations.length - 3} 个问题...
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>内容合规</span>
          </div>
        )}
      </div>
    );
  }
  
  // 完整模式 - 用于内容工厂
  return (
    <div className={`bg-white rounded-xl border ${overallStyles.border} ${className}`}>
      {/* 头部 */}
      <div className={`px-4 py-3 ${overallStyles.bg} rounded-t-xl border-b ${overallStyles.border}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${overallStyles.text}`}>
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <OverallIcon className="w-5 h-5" />
            )}
            <span className="font-semibold">
              {isChecking ? '正在检测合规性...' : overallStyles.label}
            </span>
            {!isChecking && violations.length > 0 && (
              <span className="text-sm opacity-70">· 发现 {violations.length} 个问题</span>
            )}
          </div>
          
          {violations.length > 0 && !showFixed && (
            <button
              onClick={handleAutoFix}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              一键修复
            </button>
          )}
        </div>
      </div>
      
      {/* 内容 */}
      <div className="p-4">
        {violations.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-gray-900 font-medium">内容检测通过</p>
            <p className="text-sm text-gray-500 mt-1">未发现违规内容，可以安全发布</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 违规高亮预览 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">违规内容预览</div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 leading-relaxed">
                {showFixed ? (
                  <div className="space-y-2">
                    <div className="text-green-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      修复后内容：
                    </div>
                    <div className="text-gray-800">{fixedContent}</div>
                    <button
                      onClick={() => setShowFixed(false)}
                      className="text-sm text-violet-600 hover:text-violet-700"
                    >
                      查看原文
                    </button>
                  </div>
                ) : (
                  highlightViolations(content, violations)
                )}
              </div>
            </div>
            
            {/* 违规列表 */}
            <div className="space-y-2">
              {violations.map((v, i) => {
                const styles = getRiskStyles(v.riskLevel);
                const Icon = styles.icon;
                
                return (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg border ${styles.border} ${styles.bg}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 ${styles.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${styles.text}`}>
                          {v.ruleName}
                          {v.riskLevel === 'critical' && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              已拦截
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="text-gray-500">违规内容：</span>
                          <span className="text-red-600 font-medium">"{v.matchedText}"</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="text-gray-500">修改建议：</span>
                          {v.suggestion}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {hasBlockLevel && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">存在严重违规，已阻止发布</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  请修改标记为"已拦截"的内容后重试
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 高亮违规内容
function highlightViolations(content: string, violations: ComplianceViolation[]): React.ReactNode {
  if (violations.length === 0) return content;
  
  // 按位置排序并合并重叠区间
  const sorted = [...violations].sort((a, b) => a.position.start - b.position.start);
  const result: React.ReactNode[] = [];
  let lastEnd = 0;
  
  sorted.forEach((v, i) => {
    // 添加违规前的正常文本
    if (v.position.start > lastEnd) {
      result.push(content.substring(lastEnd, v.position.start));
    }
    
    // 添加高亮的违规文本
    const bgColor = v.riskLevel === 'critical' ? 'bg-red-200' :
                    v.riskLevel === 'high' ? 'bg-orange-200' :
                    v.riskLevel === 'medium' ? 'bg-yellow-200' : 'bg-blue-200';
    
    result.push(
      <mark 
        key={i} 
        className={`${bgColor} px-0.5 rounded font-medium`}
        title={v.ruleName}
      >
        {v.matchedText}
      </mark>
    );
    
    lastEnd = v.position.end;
  });
  
  // 添加最后一段正常文本
  if (lastEnd < content.length) {
    result.push(content.substring(lastEnd));
  }
  
  return <>{result}</>;
}

// Hook 导出完整检测方法
export function useComplianceCheck() {
  const [isChecking, setIsChecking] = useState(false);
  
  const check = useCallback(async (params: {
    content: string;
    contentId: string;
    platform: PlatformType;
    contentType: ContentType;
    hotelId?: string;
    hotelName?: string;
    source: 'content_factory' | 'ai_chat';
  }) => {
    setIsChecking(true);
    try {
      const result = await complianceService.check(params);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  return { check, isChecking };
}

export default ComplianceChecker;
