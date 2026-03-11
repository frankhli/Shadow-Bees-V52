/**
 * Shadow-Bees 系统启动流程
 * 先显示启动动画，再显示登录页面
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedLogo } from './AnimatedLogo';

interface SystemBootSequenceProps {
  type: 'hotel' | 'admin' | 'group';
  onComplete: () => void;
  isVisible: boolean;
}

// 科技数据流文字
const streamingTexts = {
  hotel: [
    '初始化酒店数据模型...',
    '加载收益管理算法...',
    '连接市场情报网络...',
    '同步房态库存信息...',
    '启动AI定价引擎...',
    '建立安全通信通道...',
  ],
  admin: [
    '初始化SaaS运营平台...',
    '加载数据分析引擎...',
    '连接客户管理网络...',
    '同步财务审计数据...',
    '启动异常检测系统...',
    '建立多层安全认证...',
  ],
  group: [
    '初始化集团管理平台...',
    '加载多店协同引擎...',
    '连接区域数据中心...',
    '同步旗下酒店信息...',
    '启动策略下发系统...',
    '建立集团安全认证...',
  ],
};

// 颜色配置
const themeColors = {
  hotel: {
    bg: 'bg-bg-primary',
    textSecondary: 'text-text-secondary',
    border: 'border-border-color',
    bgSecondary: 'bg-bg-secondary',
    bgTertiary: 'bg-bg-tertiary',
  },
  admin: {
    bg: 'bg-bg-primary',
    textSecondary: 'text-text-secondary',
    border: 'border-gray-800',
    bgSecondary: 'bg-[#151B2B]',
    bgTertiary: 'bg-bg-primary',
  },
  group: {
    bg: 'bg-bg-primary',
    textSecondary: 'text-text-secondary',
    border: 'border-border-color',
    bgSecondary: 'bg-bg-secondary',
    bgTertiary: 'bg-bg-tertiary',
  },
};

export function SystemBootSequence({ type, onComplete, isVisible }: SystemBootSequenceProps) {
  const [progress, setProgress] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);
  
  const colors = themeColors[type];

  useEffect(() => {
    if (!isVisible) return;

    // 进度条动画
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setShowButton(true);
          return 100;
        }
        const increment = prev < 40 ? 2 : prev < 70 ? 1.5 : prev < 90 ? 1 : 0.5;
        return Math.min(prev + increment, 100);
      });
    }, 30);

    // 文字轮播
    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % streamingTexts[type].length);
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, [isVisible, type]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden ${colors.bg}`}
          style={{
            background: type === 'admin' 
              ? '#0B0F19'
              : 'radial-gradient(ellipse at center, #0B0F19 0%, #050810 50%, #020408 100%)',
          }}
        >
          {/* 网格背景 */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 212, 255, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 255, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />

          {/* 浮动粒子 */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: i % 3 === 0 ? '#00D4FF' : i % 3 === 1 ? '#A855F7' : '#FFB800',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* 光晕效果 */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* 主内容 */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              className="relative mb-8"
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              >
                <div 
                  className="w-28 h-28 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)' }}
                />
              </motion.div>

              <AnimatedLogo size={100} animate={true} />
            </motion.div>

            {/* 品牌名 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-6"
            >
              <h1 className="text-4xl font-bold tracking-wider">
                <span className="text-text-primary">Shadow</span>
                <span className="text-neon-cyan">-</span>
                <span style={{ 
                  background: 'linear-gradient(135deg, #00D4FF 0%, #FFB800 50%, #A855F7 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent' 
                }}>
                  Bees
                </span>
              </h1>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                {type === 'hotel' ? '酒店AI智能管理专家' : type === 'admin' ? 'SaaS运营后台管理系统' : '酒店集团智能管理平台'}
              </p>
            </motion.div>

            {/* 数据流文字 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="h-6 mb-4"
            >
              <motion.p
                key={currentTextIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`text-sm font-mono ${type === 'hotel' ? 'text-neon-cyan/70' : 'text-[#00D4FF]/70'}`}
              >
                {streamingTexts[type][currentTextIndex]}
              </motion.p>
            </motion.div>

            {/* 进度条 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="w-64 mb-8"
            >
              <div className={`relative h-1 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #00D4FF 0%, #A855F7 50%, #FFB800 100%)',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                    width: `${progress}%`,
                  }}
                />
              </div>
              <div className={`mt-2 flex justify-between text-[10px] font-mono ${type === 'hotel' ? 'text-text-muted' : 'text-text-secondary'}`}>
                <span>SYSTEM_INIT</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </motion.div>

            {/* 进入登录按钮 */}
            <AnimatePresence>
              {showButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <button
                    onClick={onComplete}
                    className={`group px-10 py-3 border rounded-xl transition-all ${
                      type === 'hotel' 
                        ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 hover:bg-neon-cyan/20 hover:border-neon-cyan' 
                        : 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/50 hover:bg-[#00D4FF]/20 hover:border-[#00D4FF]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      进入系统
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 底部品牌 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-12 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 opacity-30">
                <span className={`text-[10px] tracking-widest ${colors.textSecondary}`}>DOOMESEE TECHNOLOGY</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SystemBootSequence;
