# 演示增强组件使用指南

## 概述

这套动画组件专为提升演示体验而设计，让数据展示更生动、交互更有反馈感。

## 组件清单

### 1. 数字动画 AnimatedNumber

**效果**：数字从0滚动到目标值

```tsx
import { AnimatedNumber, AnimatedCurrency, AnimatedPercentage } from '@/components/animations';

// 基础数字
<AnimatedNumber value={1234} duration={2} />

// 货币金额
<AnimatedCurrency value={50000} currency="¥" />

// 百分比
<AnimatedPercentage value={85.5} />
```

### 2. 统计卡片 AnimatedStatCard

**效果**：带入场动画的数据卡片，悬停有光效

```tsx
import { AnimatedStatCard } from '@/components/animations';

<AnimatedStatCard
  title="今日营收"
  value={125000}
  type="currency"
  trend="up"
  trendValue="+12.5%"
  icon={DollarSign}
  color="#00E396"
  delay={0.1}
/>
```

### 3. 交错动画 StaggerContainer

**效果**：列表项依次出现，有节奏感

```tsx
import { StaggerContainer, StaggerItem } from '@/components/animations';

<StaggerContainer staggerDelay={0.1}>
  {items.map((item, i) => (
    <StaggerItem key={i}>
      <div>{item.name}</div>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### 4. 骨架屏 Skeleton

**效果**：优雅的加载占位，脉冲动画

```tsx
import { Skeleton, CardSkeleton, ListSkeleton } from '@/components/animations';

// 单个骨架
<Skeleton width={200} height={24} />

// 卡片骨架
<CardSkeleton lines={3} />

// 列表骨架
<ListSkeleton count={5} />
```

### 5. 发光按钮 GlowButton

**效果**：悬停发光，点击反馈

```tsx
import { GlowButton, PulseButton } from '@/components/animations';

// 发光按钮
<GlowButton 
  onClick={handleClick}
  glowColor="#00D4FF"
>
  立即操作
</GlowButton>

// 脉冲按钮（用于重要CTA）
<PulseButton onClick={handleClick}>
  紧急处理
</PulseButton>
```

### 6. 数据揭示 DataReveal

**效果**：滚动到视口时触发动画

```tsx
import { DataReveal, TextReveal } from '@/components/animations';

// 卡片揭示
<DataReveal delay={0.2} direction="up">
  <div>内容区域</div>
</DataReveal>

// 文字逐字揭示
<TextReveal text="欢迎使用 Shadow-Bees" charDelay={0.05} />
```

## 最佳实践

### 1. 页面入场动画

```tsx
import { StaggerContainer, StaggerItem } from '@/components/animations';

function Dashboard() {
  return (
    <StaggerContainer staggerDelay={0.1} initialDelay={0.2}>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StaggerItem key={i}>
            <AnimatedStatCard {...stat} delay={i * 0.1} />
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  );
}
```

### 2. 数据加载状态

```tsx
import { Skeleton, CardSkeleton } from '@/components/animations';

function DataCard({ isLoading, data }) {
  if (isLoading) {
    return <CardSkeleton lines={3} />;
  }
  
  return (
    <AnimatedStatCard {...data} />
  );
}
```

### 3. 重要操作按钮

```tsx
import { PulseButton } from '@/components/animations';

// 用于关键CTA
<PulseButton 
  onClick={handleCriticalAction}
  className="w-full"
>
  <Zap className="inline mr-2" size={18} />
  一键优化定价
</PulseButton>
```

## 性能优化

1. **使用 `will-change`**：动画元素自动添加 `will-change: transform, opacity`
2. **GPU加速**：所有动画使用 `transform` 和 `opacity`，触发GPU加速
3. **懒加载**：`useInView` 确保只有进入视口的元素才触发动画
4. **减少重绘**：避免动画期间修改 `layout` 属性

## 自定义主题

所有组件支持自定义颜色：

```tsx
// 使用主题色
const theme = { primary: '#00D4FF', success: '#00E396' };

<AnimatedStatCard color={theme.primary} />
<GlowButton glowColor={theme.primary} />
```

## 注意事项

1. **不要过度使用**：页面动画过多会分散注意力
2. **考虑性能**：低端设备上减少动画复杂度
3. **可访问性**：尊重 `prefers-reduced-motion` 设置
4. **移动端适配**：触摸设备上适当减少悬停效果
