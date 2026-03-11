/**
 * 内容相似度检测组件
 * 检测新内容与历史内容的相似度，避免同质化
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, FileText, Lightbulb } from 'lucide-react';
import type { SimilarityCheckResult } from '@/types/risk';

interface SimilarityCheckerProps {
  content: string;
  hotelId: string;
  threshold?: number;  // 默认0.8
  onResult?: (result: SimilarityCheckResult) => void;
  className?: string;
}

// 模拟历史内容数据
const MOCK_HISTORY_CONTENTS = [
  {
    id: 'content-001',
    title: '三里屯精品酒店，今晚尾房特价',
    content: '三里屯附近精品酒店，今晚还有2间空房，比某程便宜80块，需要的话抓紧联系',
    createdAt: '2026-02-22T14:00:00Z'
  },
  {
    id: 'content-002',
    title: '工体演唱会住宿推荐',
    content: '工体旁舒适酒店，步行5分钟到场馆，今晚特惠价，比OTA便宜',
    createdAt: '2026-02-21T10:00:00Z'
  }
];

// 简单的文本相似度计算（余弦相似度简化版）
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export function SimilarityChecker({
  content,
  hotelId,
  threshold = 0.75,
  onResult,
  className = ''
}: SimilarityCheckerProps) {
  const [result, setResult] = useState<SimilarityCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkSimilarity = useCallback(async (text: string, _hotelId: string): Promise<SimilarityCheckResult> => {
    // 实际应从API获取该酒店的历史内容
    const historyContents = MOCK_HISTORY_CONTENTS;
    
    const similarContents: SimilarityCheckResult['similarContents'] = [];
    
    historyContents.forEach(history => {
      const similarity = calculateSimilarity(text, history.content);
      if (similarity > 0.3) {  // 只记录有一定相似度的
        similarContents.push({
          contentId: history.id,
          title: history.title,
          similarity,
          createdAt: history.createdAt
        });
      }
    });
    
    // 按相似度排序
    similarContents.sort((a, b) => b.similarity - a.similarity);
    
    const highestSimilarity = similarContents[0]?.similarity || 0;
    
    return {
      similarity: highestSimilarity,
      threshold,
      isViolation: highestSimilarity >= threshold,
      similarContents: similarContents.slice(0, 3)  // 最多返回3条
    };
  }, [threshold]);

  useEffect(() => {
    if (!content || content.length < 10) {
      setResult(null);
      return;
    }

    setIsChecking(true);
    
    const timer = setTimeout(async () => {
      const checkResult = await checkSimilarity(content, hotelId);
      setResult(checkResult);
      onResult?.(checkResult);
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [content, hotelId, checkSimilarity, onResult]);

  if (!content || content.length < 10) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <FileText size={16} />
        <span>输入10字以上将检测与历史内容的相似度</span>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        <span>检测相似度...</span>
      </div>
    );
  }

  if (!result) return null;

  const { isViolation, similarity, similarContents } = result;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 相似度指标 */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${
        isViolation 
          ? 'bg-neon-amber/10 border border-neon-amber/30' 
          : 'bg-neon-green/10 border border-neon-green/30'
      }`}>
        <div className="flex items-center gap-2">
          {isViolation ? (
            <AlertTriangle size={18} className="text-neon-amber" />
          ) : (
            <CheckCircle size={18} className="text-neon-green" />
          )}
          <span className={`text-sm font-medium ${
            isViolation ? 'text-neon-amber' : 'text-neon-green'
          }`}>
            相似度 {(similarity * 100).toFixed(0)}%
          </span>
        </div>
        <span className="text-xs text-text-secondary">
          阈值 {threshold * 100}%
        </span>
      </div>

      {/* 相似内容列表 */}
      {similarContents.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-text-secondary mb-1">
            与以下历史内容相似：
          </div>
          {similarContents.map((item, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm border ${
                item.similarity >= threshold
                  ? 'bg-neon-amber/5 border-neon-amber/20'
                  : 'bg-bg-tertiary border-border-color'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary truncate">{item.title}</span>
                <span className={`text-xs ${
                  item.similarity >= threshold ? 'text-neon-amber' : 'text-text-secondary'
                }`}>
                  {(item.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-text-secondary">
                {new Date(item.createdAt).toLocaleDateString('zh-CN')} 发布
              </div>
            </div>
          ))}
          
          {isViolation && (
            <div className="flex items-center gap-2 p-2 bg-neon-cyan/5 border border-neon-cyan/20 rounded text-sm">
              <Lightbulb size={16} className="text-neon-cyan" />
              <span className="text-text-secondary">
                建议调整文案关键词、更换角度描述，或添加真实客户评价增加差异化
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
