# Shadow-Bees V52 - 实时推演数据同步

## 概述

酒店端实时推演模式生成的数据现在通过 BroadcastChannel 实时同步到管理端 Dashboard。

## 实现原理

### 1. 酒店端（发送方）

在 `src/stores/unifiedStore.ts` 中，`generateRealtimeTransaction` 方法在生成交易后会发送实时指标：

```typescript
channelManager.send('REALTIME_METRICS', {
  hotelId: currentHotel.id,
  hotelName: currentHotel.name,
  metrics: {
    gmv: price,
    orders: 1,
    occupancy: occupancyRate,
    timestamp: Date.now(),
  },
}, {
  hotelId: currentHotel.id,
});
```

### 2. 管理端（接收方）

在 `src/admin/pages/Dashboard.tsx` 中，使用 `useChannelMessage` 监听实时数据：

```typescript
useChannelMessage<RealtimeMetricsPayload>('REALTIME_METRICS', (payload) => {
  setRealtimeMetrics(prev => ({
    totalGMV: prev.totalGMV + (payload.metrics.gmv || 0),
    totalOrders: prev.totalOrders + (payload.metrics.orders || 0),
    lastUpdate: Date.now(),
  }));
});
```

### 3. 数据展示

管理端 Dashboard 的统计卡片会显示实时数据：

- **GMV 卡片**: 显示 `platformStats.todayRevenue + realtimeMetrics.totalGMV`
- **订单卡片**: 显示 `platformStats.todayOrders + realtimeMetrics.totalOrders`
- **实时指示器**: 当接收到实时数据时显示绿色闪烁指示器

## 使用场景

### 场景1：实时监控
1. 打开酒店端，切换到实时推演模式
2. 打开管理端 Dashboard
3. 当酒店端生成订单时，管理端 GMV 和订单数会实时增加
4. 管理端显示 "实时数据接入中" 指示器

### 场景2：时间范围切换
- 管理端的时间切换（今日/本周/本月/本年）与实时数据是独立的
- 实时数据只会在当前时间范围内累积
- 刷新页面后实时数据会重置（从0开始累积）

## 文件变更

| 文件 | 变更 |
|---|---|
| `src/stores/unifiedStore.ts` | 添加 BroadcastChannel 发送逻辑 |
| `src/admin/pages/Dashboard.tsx` | 添加 BroadcastChannel 接收逻辑 |
| `src/shared/channel.ts` | 已定义消息类型和接口 |

## 注意事项

1. **同源限制**: BroadcastChannel 只在同源页面间通信
2. **数据累积**: 管理端的实时数据是累积的，刷新页面后重置
3. **性能**: 每15秒最多生成一次数据，不会对性能造成影响
4. **兼容性**: 不支持 BroadcastChannel 的浏览器会自动降级

## 调试

在浏览器控制台查看同步日志：

```javascript
// 酒店端发送数据时
[Channel] Message sent: { type: 'REALTIME_METRICS', ... }

// 管理端接收数据时
[Dashboard] Received realtime metrics: { hotelId: '...', metrics: {...} }
```
