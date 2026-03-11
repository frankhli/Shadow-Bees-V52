/**
 * Shadow-Bees 系统启动加载动画
 * 专为酒店端和管理端设计的系统初始化动画
 * 体现 "Shadow-Bees - 酒店AI智能管理专家" 品牌形象
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedLogo } from './AnimatedLogo';

interface SystemBootLoaderProps {
  /** 系统类型 */
  type: 'hotel' | 'admin';
  /** 加载完成回调 */
  onComplete?: () => void;
  /** 是否显示 */
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
};

export function SystemBootLoader({ 
  type, 
  onComplete, 
  isVisible 
}: SystemBootLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [phase, setPhase] = useState<'logo' | 'text' | 'complete'>('logo');
  
  // 使用 ref 存储 onComplete，避免依赖变化导致定时器被重置
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isVisible) return;

    // 阶段1: Logo 动画展示 (0-40%)
    const logoTimer = setTimeout(() => {
      setPhase('text');
    }, 800);

    // 进度条动画
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // 非线性进度增长
        const increment = prev < 40 ? 2 : prev < 70 ? 1.5 : prev < 90 ? 1 : 0.5;
        return Math.min(prev + increment, 100);
      });
    }, 30);

    // 文字轮播
    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % streamingTexts[type].length);
    }, 400);

    return () => {
      clearTimeout(logoTimer);
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, [isVisible, type]); // 只在显示状态变化时执行

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #0B0F19 0%, #050810 50%, #020408 100%)',
          }}
        >
          {/* ========== 背景特效 ========== */}
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
          {[...Array(20)].map((_, i) => (
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

          {/* ========== 中央内容 ========== */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Logo 区域 */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: 0.2 
              }}
              className="relative"
            >
              {/* Logo 外发光环 */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <div 
                  className="w-32 h-32 rounded-full border border-dashed"
                  style={{
                    borderColor: 'rgba(0, 212, 255, 0.2)',
                  }}
                />
              </motion.div>

              {/* 脉冲光环 */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              >
                <div 
                  className="w-28 h-28 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)',
                  }}
                />
              </motion.div>

              {/* 蜜蜂 Logo */}
              <div className="relative z-10">
                <AnimatedLogo size={100} animate={true} />
              </div>
            </motion.div>

            {/* Shadow-Bees 品牌名 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-8 text-center"
            >
              <h1 className="text-4xl font-bold tracking-wider">
                <span className="text-text-primary">Shadow</span>
                <span 
                  className="mx-1"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >-</span>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #FFB800 50%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Bees
                </span>
              </h1>

              {/* 版本标签 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-2 flex items-center justify-center gap-2"
              >
                <span className="px-2 py-0.5 text-[10px] rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                  {type === 'hotel' ? 'HOTEL AI SYSTEM' : 'SAAS ADMIN PLATFORM'}
                </span>
                <span className="text-[10px] text-text-secondary">
                  v2.0.0
                </span>
              </motion.div>
            </motion.div>

            {/* 标语 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-4 text-sm text-text-secondary tracking-widest"
            >
              酒店AI智能管理专家
            </motion.p>

            {/* ========== 加载状态 ========== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-10 w-80"
            >
              {/* 数据流文字 */}
              <div className="h-6 mb-4 text-center">
                <motion.p
                  key={currentTextIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-neon-cyan/70 font-mono"
                >
                  {streamingTexts[type][currentTextIndex]}
                </motion.p>
              </div>

              {/* 进度条容器 */}
              <div className="relative h-1 bg-bg-tertiary rounded-full overflow-hidden">
                {/* 进度条背景光效 */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.1), transparent)',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* 实际进度 */}
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #00D4FF 0%, #A855F7 50%, #FFB800 100%)',
                    boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />

                {/* 进度条头部光点 */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white"
                  style={{
                    boxShadow: '0 0 15px 5px rgba(0, 212, 255, 0.8)',
                  }}
                  animate={{ left: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* 进度百分比 */}
              <div className="mt-2 flex justify-between text-[10px] text-text-secondary/50 font-mono">
                <span>SYSTEM_INIT</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </motion.div>

            {/* 进入系统按钮 + 不再显示选项 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="mt-10 flex flex-col items-center gap-4"
            >
              {/* 进入系统按钮 */}
              <button
                onClick={() => onComplete?.()}
                className="group relative px-16 py-5 bg-neon-cyan text-black text-xl font-bold rounded-xl border-2 border-neon-cyan hover:bg-neon-cyan/90 hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                {/* 脉冲动画背景 */}
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                {/* 扫光效果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <span className="relative flex items-center gap-4">
                  点击进入系统
                  <motion.span
                    className="text-2xl"
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
              </button>

              {/* 不再显示选项 */}
              <label className="flex items-center gap-3 cursor-pointer group mt-2">
                <input
                  type="checkbox"
                  id="skipBootAnimation"
                  className="w-5 h-5 rounded border-2 border-gray-500 bg-black text-neon-cyan focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-black"
                />
                <span className="text-base text-text-secondary group-hover:text-text-primary transition-colors">
                  下次不再显示启动动画
                </span>
              </label>
            </motion.div>

            {/* 底部品牌信息 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-12 left-0 right-0 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 opacity-30">
                <img src="/logo.jpg" alt="" className="h-4 w-auto" />
                <span className="text-[10px] tracking-widest">DOOMESEE TECHNOLOGY</span>
              </div>
              <p className="mt-1 text-[10px] text-text-secondary/20">
                智能酒店收益管理解决方案
              </p>
            </motion.div>
          </div>

          {/* ========== 完成时的淡出效果 ========== */}
          {phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SystemBootLoader;
