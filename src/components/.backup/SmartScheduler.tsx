/**
 * 智能排期组件
 * 根据平台规则推荐最佳发布时间
 */

import { useState, useEffect, useCallback } from 'react';
import { Clock, Sparkles, TrendingUp, Users, Target } from 'lucide-react';
import type { SmartSchedule, Platform } from '@/types/risk';

interface SmartSchedulerProps {
  platform: Platform;
  contentType: 'moments' | 'group' | 'private' | 'channels';
  onSelect?: (time: Date) => void;
  className?: string;
}

// 平台最佳发布时间段
const PLATFORM_BEST_TIMES: Record<string, Array<{ time: string; score: number; reason: string }>> = {
  'xiaohongshu-morning': [
    { time: '08:00', score: 85, reason: '通勤时间浏览高峰' },
    { time: '09:30', score: 90, reason: '上班摸鱼时段' },
    { time: '11:00', score: 75, reason: '午饭前浏览' },
  ],
  'xiaohongshu-afternoon': [
    { time: '12:30', score: 80, reason: '午休时间' },
    { time: '15:00', score: 85, reason: '下午茶时间' },
    { time: '17:30', score: 70, reason: '下班前浏览' },
  ],
  'xiaohongshu-evening': [
    { time: '19:00', score: 95, reason: '黄金时段-晚饭后' },
    { time: '21:00', score: 90, reason: '黄金时段-睡前' },
    { time: '22:30', score: 70, reason: '深夜浏览' },
  ],
  'xianyu-morning': [
    { time: '09:00', score: 80, reason: '上班后活跃时段' },
    { time: '11:00', score: 75, reason: '上午购物决策时间' },
  ],
  'xianyu-afternoon': [
    { time: '14:00', score: 85, reason: '下午搜索高峰' },
    { time: '16:00', score: 80, reason: '下班前交易活跃' },
  ],
  'xianyu-evening': [
    { time: '20:00', score: 90, reason: '晚间交易高峰' },
    { time: '21:30', score: 85, reason: '夜间捡漏时段' },
    { time: '22:00', score: 75, reason: '深夜交易' },
  ],
  'wechat-morning': [
    { time: '07:30', score: 90, reason: '早起朋友圈' },
    { time: '09:00', score: 80, reason: '上班途中' },
  ],
  'wechat-afternoon': [
    { time: '12:00', score: 85, reason: '午休朋友圈' },
    { time: '15:00', score: 60, reason: '下午茶时间' },
  ],
  'wechat-evening': [
    { time: '18:00', score: 85, reason: '下班通勤' },
    { time: '20:00', score: 95, reason: '黄金时段-晚饭后' },
    { time: '21:30', score: 90, reason: '睡前朋友圈' },
  ],
};

export function SmartScheduler({
  platform,
  contentType: _contentType,
  onSelect,
  className = ''
}: SmartSchedulerProps) {
  const [schedules, setSchedules] = useState<SmartSchedule[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const generateSchedules = useCallback((): SmartSchedule[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let timeSlots: SmartSchedule[] = [];

    // 获取当前时间段
    const getPeriod = (hour: number) => {
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      return 'evening';
    };

    // 今天剩余时段
    const currentPeriod = getPeriod(currentHour);
    const key = `${platform}-${currentPeriod}`;
    const todaySlots = PLATFORM_BEST_TIMES[key] || [];
    
    todaySlots.forEach(slot => {
      const [hour, minute] = slot.time.split(':').map(Number);
      if (hour > currentHour || (hour === currentHour && minute > now.getMinutes())) {
        timeSlots.push({
          time: new Date(`${today}T${slot.time}:00`),
          score: slot.score,
          reason: slot.reason,
          isToday: true
        });
      }
    });

    // 明天时段
    ['morning', 'afternoon', 'evening'].forEach(period => {
      const nextKey = `${platform}-${period}`;
      const nextSlots = PLATFORM_BEST_TIMES[nextKey] || [];
      
      nextSlots.forEach(slot => {
        timeSlots.push({
          time: new Date(`${tomorrow}T${slot.time}:00`),
          score: slot.score,
          reason: slot.reason,
          isToday: false
        });
      });
    });

    // 按分数排序，取前6个
    return timeSlots.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [platform]);

  useEffect(() => {
    const schedules = generateSchedules();
    setSchedules(schedules);
  }, [generateSchedules]);

  const handleSelect = (schedule: SmartSchedule) => {
    setSelectedTime(schedule.time.toISOString());
    onSelect?.(schedule.time);
  };

  if (schedules.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-neon-cyan" />
        <span className="text-sm font-medium text-text-primary">
          智能推荐发布时间
        </span>
      </div>

      {/* 时间推荐列表 */}
      <div className="grid grid-cols-2 gap-2">
        {schedules.map((schedule, index) => (
          <button
            key={index}
            onClick={() => handleSelect(schedule)}
            className={`p-2.5 rounded-lg text-left transition-all ${
              selectedTime === schedule.time.toISOString()
                ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                : 'bg-bg-tertiary border border-border-color hover:border-neon-cyan/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-text-primary">
                {schedule.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {schedule.isToday && (
                <span className="text-xs px-1.5 py-0.5 bg-neon-cyan/20 text-neon-cyan rounded">
                  今天
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <TrendingUp size={10} />
              <span>推荐度 {schedule.score}%</span>
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {schedule.reason}
            </div>
          </button>
        ))}
      </div>

      {/* 平台特性提示 */}
      <div className="p-2 bg-bg-tertiary rounded text-xs text-text-secondary">
        {platform === 'xiaohongshu' && (
          <div className="flex items-start gap-2">
            <Target size={12} className="flex-shrink-0 mt-0.5 text-neon-pink" />
            <span>小红书用户活跃度在晚上19-22点最高，建议此时段发布</span>
          </div>
        )}
        {platform === 'xianyu' && (
          <div className="flex items-start gap-2">
            <Users size={12} className="flex-shrink-0 mt-0.5 text-neon-yellow" />
            <span>闲鱼交易集中在晚间20-22点，尾房适合此时段发布</span>
          </div>
        )}
        {platform === 'wechat' && (
          <div className="flex items-start gap-2">
            <Clock size={12} className="flex-shrink-0 mt-0.5 text-neon-green" />
            <span>微信朋友圈黄金时段：早7-8点、晚20-21点</span>
          </div>
        )}
      </div>
    </div>
  );
}
