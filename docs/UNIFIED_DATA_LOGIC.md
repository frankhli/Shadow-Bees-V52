# Shadow-Bees V52 - 三端数据逻辑统一

## 概述

管理端、集团端、酒店端现在使用一致的数据逻辑：**预设历史数据 + 实时推演数据**

## 数据逻辑

### 酒店端（已存在）
```
总数据 = 预设历史数据 + 实时推演数据
```

- **预设历史数据**: `defaultTransactions`, `defaultContents`, `presetStats`
- **实时推演数据**: 每15-50秒生成的新订单和内容
- **时间范围**: 今日/本周/本月/本年都有对应的预设数据

### 管理端（本次修改）
```
总数据 = presetStats[timeRange] + realtimeMetrics[timeRange]
```

- **presetStats**: 预设历史数据（今日/本周/本月/本年）
- **realtimeMetrics**: 实时推演数据累加
- **时间切换**: 切换时间范围时显示对应的历史数据+实时数据

## 关键数据结构

### AdminStore 新增字段

```typescript
// 预设历史数据
presetStats: {
  today: { revenue: number; orders: number; contentCount: number };
  thisWeek: { revenue: number; orders: number; contentCount: number };
  thisMonth: { revenue: number; orders: number; contentCount: number };
  thisYear: { revenue: number; orders: number; contentCount: number };
}

// 实时推演数据累加
realtimeMetrics: {
  today: { gmv: number; orders: number; lastUpdate: number };
  thisWeek: { gmv: number; orders: number; lastUpdate: number };
  thisMonth: { gmv: number; orders: number; lastUpdate: number };
  thisYear: { gmv: number; orders: number; lastUpdate: number };
}
```

### 新增 Actions

```typescript
// 接收实时推演数据
addRealtimeMetrics(metrics: {
  gmv: number;
  orders: number;
  timeRange: 'today' | 'week' | 'month' | 'year';
}): void

// 根据时间范围获取统计数据
getPlatformStatsByTimeRange(range: TimeRange): PlatformStats
```

## 数据流向

```
酒店端实时推演
    ↓ (BroadcastChannel: REALTIME_METRICS)
管理端接收
    ↓ addRealtimeMetrics()
累加到对应时间范围
    ↓ getPlatformStatsByTimeRange()
Dashboard 显示 (历史+实时)
```

## 时间范围数据关系

| 时间范围 | 预设数据 | 实时数据 | 说明 |
|---------|---------|---------|------|
| 今日 | presetStats.today | realtimeMetrics.today | 基础数据 |
| 本周 | presetStats.thisWeek | realtimeMetrics.thisWeek | 包含今日 |
| 本月 | presetStats.thisMonth | realtimeMetrics.thisMonth | 包含本周 |
| 本年 | presetStats.thisYear | realtimeMetrics.thisYear | 包含本月 |

## 使用示例

### 1. 切换时间范围
```typescript
// Dashboard.tsx
const currentTimeRange = (searchParams.get('range') as TimeRange) || 'today';
const currentPlatformStats = getPlatformStatsByTimeRange(currentTimeRange);

// 显示的是：presetStats[currentRange] + realtimeMetrics[currentRange]
```

### 2. 接收实时数据
```typescript
// 监听酒店端数据
useChannelMessage<RealtimeMetricsPayload>('REALTIME_METRICS', (payload) => {
  addRealtimeMetrics({
    gmv: payload.metrics.gmv,
    orders: payload.metrics.orders,
    timeRange: currentTimeRange,
  });
});
```

### 3. 显示统计数据
```typescript
// GMV 卡片显示
value: currentPlatformStats.todayRevenue  // 历史+实时

// 订单卡片显示  
value: currentPlatformStats.todayOrders    // 历史+实时
```

## 文件修改

| 文件 | 修改内容 |
|-----|---------|
| `adminStore.ts` | 添加 presetStats, realtimeMetrics, addRealtimeMetrics, getPlatformStatsByTimeRange |
| `Dashboard.tsx` | 使用 getPlatformStatsByTimeRange 获取数据，移除本地状态 |
| `AdminLayout.tsx` | 使用 store 中的 realtimeMetrics，按时间范围显示 |

## 效果

1. **打开管理端 Dashboard** - 显示预设历史数据
2. **打开酒店端实时推演** - 开始生成新数据
3. **管理端实时更新** - GMV和订单数随酒店端数据增长
4. **切换时间范围** - 显示对应时间范围的历史+实时数据
5. **顶部指示器** - 显示当前时间范围的实时数据状态

## 注意事项

1. **数据持久化**: 实时数据仅在内存中，刷新页面后重置
2. **时间范围关联**: 今日数据计入本周/本月/本年，以此类推
3. **BroadcastChannel**: 需要同源才能通信（同域名+端口）
4. **调试**: 查看控制台日志 `[Dashboard] Received realtime metrics`
