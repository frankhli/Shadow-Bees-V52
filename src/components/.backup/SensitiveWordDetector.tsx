/**
 * 敏感词检测组件
 * 实时检测输入内容中的敏感词
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import type { SensitiveWordCheckResult, Platform } from '@/types/risk';

interface SensitiveWordDetectorProps {
  content: string;
  platform: Platform;
  onResult?: (result: SensitiveWordCheckResult) => void;
  className?: string;
}

// 模拟敏感词库（实际应从后端获取）
const MOCK_SENSITIVE_WORDS: Record<string, { word: string; replacement: string; severity: 'high' | 'medium' | 'low' }[]> = {
  xiaohongshu: [
    { word: '微信', replacement: '丝❤', severity: 'high' },
    { word: 'VX', replacement: '联系', severity: 'high' },
    { word: '二维码', replacement: '扫码', severity: 'high' },
    { word: '最低价', replacement: '内部价', severity: 'medium' },
    { word: '全网最低', replacement: '优惠价', severity: 'medium' },
    { word: '最便宜', replacement: '很划算', severity: 'low' },
    { word: '第一', replacement: '优质', severity: 'medium' },
    { word: '顶级', replacement: '高端', severity: 'low' },
  ],
  xianyu: [
    { word: '加V', replacement: '联系', severity: 'high' },
    { word: '券', replacement: '优惠', severity: 'medium' },
    { word: '转让', replacement: '代订', severity: 'medium' },
    { word: '票', replacement: '房间', severity: 'low' },
  ],
  wechat: [
    { word: '转账', replacement: '付款', severity: 'medium' },
    { word: '支付宝', replacement: '支付', severity: 'low' },
  ],
};

export function SensitiveWordDetector({
  content,
  platform,
  onResult,
  className = ''
}: SensitiveWordDetectorProps) {
  const [result, setResult] = useState<SensitiveWordCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkSensitiveWords = useCallback((text: string, targetPlatform: Platform): SensitiveWordCheckResult => {
    const violations: SensitiveWordCheckResult['violations'] = [];
    let processedContent = text;
    
    // 获取当前平台的敏感词 + 通用敏感词
    const platformWords = MOCK_SENSITIVE_WORDS[targetPlatform] || [];
    const allWords = [...platformWords, ...(MOCK_SENSITIVE_WORDS['all'] || [])];
    
    // 检测敏感词
    allWords.forEach(({ word, replacement, severity }) => {
      const regex = new RegExp(word, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          word: match[0],
          position: [match.index, match.index + match[0].length],
          severity,
          suggestion: replacement
        });
        
        // 自动替换（仅对非高危词）
        if (severity !== 'high') {
          processedContent = processedContent.replace(regex, replacement);
        }
      }
    });

    return {
      hasViolation: violations.length > 0,
      violations: violations.sort((a, b) => b.severity.localeCompare(a.severity)),
      processedContent
    };
  }, []);

  useEffect(() => {
    if (!content) {
      setResult(null);
      return;
    }

    setIsChecking(true);
    
    // 模拟异步检测
    const timer = setTimeout(() => {
      const checkResult = checkSensitiveWords(content, platform);
      setResult(checkResult);
      onResult?.(checkResult);
      setIsChecking(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [content, platform, checkSensitiveWords, onResult]);

  if (!content) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <Shield size={16} />
        <span>输入内容后将自动检测敏感词</span>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        <span>检测中...</span>
      </div>
    );
  }

  if (!result) return null;

  const { hasViolation, violations } = result;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 总体状态 */}
      {hasViolation ? (
        <div className="flex items-start gap-2 p-3 bg-neon-red/10 border border-neon-red/30 rounded-lg">
          <AlertTriangle size={18} className="text-neon-red flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neon-red">
              检测到 {violations.length} 个敏感词
            </div>
            <div className="text-xs text-text-secondary mt-1">
              高风险的敏感词请手动修改，中低风险已自动建议替换
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-neon-green/10 border border-neon-green/30 rounded-lg">
          <CheckCircle size={16} className="text-neon-green" />
          <span className="text-sm text-neon-green">未检测到敏感词</span>
        </div>
      )}

      {/* 详细违规列表 */}
      {hasViolation && violations.length > 0 && (
        <div className="space-y-1.5">
          {violations.slice(0, 5).map((violation, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded text-sm ${
                violation.severity === 'high'
                  ? 'bg-neon-red/5 border border-neon-red/20'
                  : violation.severity === 'medium'
                  ? 'bg-neon-amber/5 border border-neon-amber/20'
                  : 'bg-blue-500/5 border border-blue-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${
                    violation.severity === 'high'
                      ? 'bg-neon-red/20 text-neon-red'
                      : violation.severity === 'medium'
                      ? 'bg-neon-amber/20 text-neon-amber'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {violation.severity === 'high' ? '高风险' : violation.severity === 'medium' ? '中风险' : '低风险'}
                </span>
                <span className="text-text-primary">"{violation.word}"</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span>→</span>
                <span className="text-neon-green">{violation.suggestion}</span>
              </div>
            </div>
          ))}
          {violations.length > 5 && (
            <div className="text-xs text-text-secondary text-center">
              还有 {violations.length - 5} 个敏感词未显示
            </div>
          )}
        </div>
      )}
    </div>
  );
}
