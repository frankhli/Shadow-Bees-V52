/**
 * 广告法合规检测组件
 * 检测内容是否符合广告法要求
 */

import { useState, useEffect, useCallback } from 'react';
import { Scale, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import type { AdLawCheckResult } from '@/types/risk';

interface AdLawCheckerProps {
  content: string;
  onResult?: (result: AdLawCheckResult) => void;
  className?: string;
}

// 广告法禁用词汇
const AD_LAW_VIOLATIONS = {
  absoluteTerms: [
    { word: '第一', reason: '禁止使用绝对化用语', suggestion: '用"优质""热门"替代' },
    { word: '最佳', reason: '禁止使用绝对化用语', suggestion: '用"优秀"替代' },
    { word: '最好', reason: '禁止使用绝对化用语', suggestion: '用"很好"替代' },
    { word: '顶级', reason: '禁止使用绝对化用语', suggestion: '用"高端"替代' },
    { word: '国家级', reason: '禁止使用绝对化用语', suggestion: '删除' },
    { word: '最高级', reason: '禁止使用绝对化用语', suggestion: '删除' },
    { word: '唯一', reason: '禁止使用绝对化用语', suggestion: '用"独特"替代' },
  ],
  priceTerms: [
    { word: '最低价', reason: '无法验证的价格承诺', suggestion: '用"优惠价"替代' },
    { word: '最便宜', reason: '无法验证的价格承诺', suggestion: '用"划算"替代' },
    { word: '全网最低', reason: '无法验证的价格承诺', suggestion: '用"超值"替代' },
    { word: '零利润', reason: '无法验证的利润承诺', suggestion: '删除' },
  ],
  promiseTerms: [
    { word: '保证', reason: '过度承诺', suggestion: '用"力求"替代' },
    { word: '永久', reason: '无法履行的时间承诺', suggestion: '用"长期"替代' },
    { word: '100%', reason: '绝对化数据承诺', suggestion: '删除具体百分比' },
  ],
  comparisonTerms: [
    { word: '秒杀', reason: '夸大宣传', suggestion: '用"特惠"替代' },
    { word: '亏本', reason: '虚假宣传', suggestion: '删除' },
    { word: '赔本', reason: '虚假宣传', suggestion: '删除' },
  ]
};

export function AdLawChecker({
  content,
  onResult,
  className = ''
}: AdLawCheckerProps) {
  const [result, setResult] = useState<AdLawCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkAdLaw = useCallback((text: string): AdLawCheckResult => {
    const violations: AdLawCheckResult['violations'] = [];
    const compliantCount = { passed: 0, total: 4 };

    // 检查各类违规
    let hasAbsoluteTerm = false;
    let hasPriceTerm = false;
    let hasPromiseTerm = false;
    let hasComparisonTerm = false;

    // 检查绝对化用语
    AD_LAW_VIOLATIONS.absoluteTerms.forEach(({ word, reason, suggestion }) => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(text)) {
        hasAbsoluteTerm = true;
        violations.push({
          rule: '绝对化用语',
          violation: `${word} - ${reason}`,
          suggestion
        });
      }
    });
    if (!hasAbsoluteTerm) compliantCount.passed++;

    // 检查价格承诺
    AD_LAW_VIOLATIONS.priceTerms.forEach(({ word, reason, suggestion }) => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(text)) {
        hasPriceTerm = true;
        violations.push({
          rule: '价格承诺',
          violation: `${word} - ${reason}`,
          suggestion
        });
      }
    });
    if (!hasPriceTerm) compliantCount.passed++;

    // 检查过度承诺
    AD_LAW_VIOLATIONS.promiseTerms.forEach(({ word, reason, suggestion }) => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(text)) {
        hasPromiseTerm = true;
        violations.push({
          rule: '过度承诺',
          violation: `${word} - ${reason}`,
          suggestion
        });
      }
    });
    if (!hasPromiseTerm) compliantCount.passed++;

    // 检查虚假宣传
    AD_LAW_VIOLATIONS.comparisonTerms.forEach(({ word, reason, suggestion }) => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(text)) {
        hasComparisonTerm = true;
        violations.push({
          rule: '虚假宣传',
          violation: `${word} - ${reason}`,
          suggestion
        });
      }
    });
    if (!hasComparisonTerm) compliantCount.passed++;

    const score = Math.round((compliantCount.passed / compliantCount.total) * 100);

    return {
      score,
      violations,
      compliant: compliantCount,
      isCompliant: violations.length === 0
    };
  }, []);

  useEffect(() => {
    if (!content) {
      setResult(null);
      return;
    }

    setIsChecking(true);
    
    const timer = setTimeout(() => {
      const checkResult = checkAdLaw(content);
      setResult(checkResult);
      onResult?.(checkResult);
      setIsChecking(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [content, checkAdLaw, onResult]);

  if (!content) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <Scale size={16} />
        <span>输入内容后将检测广告法合规性</span>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        <span>检测合规性...</span>
      </div>
    );
  }

  if (!result) return null;

  const { score, violations, compliant } = result;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 合规评分 */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${
        score >= 80
          ? 'bg-neon-green/10 border border-neon-green/30'
          : score >= 50
          ? 'bg-neon-amber/10 border border-neon-amber/30'
          : 'bg-neon-red/10 border border-neon-red/30'
      }`}>
        <div className="flex items-center gap-2">
          <Shield size={18} className={
            score >= 80 ? 'text-neon-green' : score >= 50 ? 'text-neon-amber' : 'text-neon-red'
          } />
          <span className={`text-sm font-medium ${
            score >= 80 ? 'text-neon-green' : score >= 50 ? 'text-neon-amber' : 'text-neon-red'
          }`}>
            广告法合规度 {score}%
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <CheckCircle size={12} />
          <span>{compliant.passed}/{compliant.total}</span>
        </div>
      </div>

      {/* 违规详情 */}
      {violations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-text-secondary mb-1">
            检测到的违规项：
          </div>
          {violations.map((item, index) => (
            <div
              key={index}
              className="p-2 bg-neon-red/5 border border-neon-red/20 rounded text-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-neon-red" />
                <span className="font-medium text-text-primary">{item.rule}</span>
              </div>
              <div className="text-xs text-text-secondary ml-5">
                <div className="text-neon-red/80">{item.violation}</div>
                <div className="mt-0.5 text-neon-cyan">
                  建议：{item.suggestion}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
