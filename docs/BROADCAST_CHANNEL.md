# Shadow-Bees V52 - BroadcastChannel 跨端通信方案

## 概述

本项目使用 `BroadcastChannel API` 实现管理端 ↔ 集团端的实时数据联动，为未来 WebSocket 实时通信做准备。

## 架构设计

```
┌─────────────┐      BroadcastChannel      ┌─────────────┐
│   Admin     │ ◄────────────────────────► │   Group     │
│  (管理端)    │   Channel: 'shadow-bees'   │  (集团端)    │
└─────────────┘                            └─────────────┘
       │                                          │
       ▼                                          ▼
GROUP_SELECT ──────────────────────────────► 自动切换视图
HOTEL_SELECT ──────────────────────────────► 聚焦门店
DATA_UPDATE  ◄───────────────────────────── 数据变更通知
```

## 文件结构

```
src/
├── shared/
│   └── channel.ts              # 核心通信模块
├── admin/
│   └── components/
│       └── GroupBroadcastBridge.tsx   # 管理端桥接组件
└── group/
    └── components/
        └── GroupChannelReceiver.tsx    # 集团端接收组件
```

## 使用方法

### 1. 管理端发送消息

```tsx
import { useGroupBroadcast } from '@/admin/components/GroupBroadcastBridge';

function MyComponent() {
  const { syncGroup } = useGroupBroadcast();
  
  const handleClick = () => {
    syncGroup(customer, 'focus'); // view | edit | focus
  };
  
  return <button onClick={handleClick}>同步到集团端</button>;
}
```

### 2. 管理端自动同步 (已集成到 GroupDetailDrawer)

```tsx
// GroupDetailDrawer 已自动集成
<GroupBroadcastBridge 
  customer={customer} 
  enabled={isOpen} 
  mode="auto"  // auto | manual | focus
/>
```

点击抽屉顶部的「同步到集团」按钮可手动触发同步。

### 3. 集团端接收消息 (已集成到 Layout)

```tsx
// Layout.tsx 已自动集成
<GroupChannelReceiver 
  enabled={true}
  autoNavigate={true}
  showNotification={true}
/>
```

当管理端查看集团时，集团端右上角会显示「管理端同步中」指示器。

### 4. 使用 Hook 监听消息

```tsx
import { useChannelMessage } from '@/shared/channel';

function MyComponent() {
  useChannelMessage<GroupSelectPayload>('GROUP_SELECT', (payload, meta) => {
    console.log('收到集团选择消息:', payload);
  });
}
```

## 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `GROUP_SELECT` | Admin → Group | 管理端选择集团 |
| `GROUP_FOCUS` | Group → Admin | 集团端响应确认 |
| `HOTEL_SELECT` | Admin → Group | 管理端选择酒店 |
| `DATA_UPDATE` | Bidirectional | 数据变更通知 |
| `STRATEGY_APPLY` | Admin → Group | 策略应用通知 |
| `REALTIME_METRICS` | Group → Admin | 实时指标推送 |
| `PING/PONG` | Bidirectional | 心跳检测 |

## 数据结构

```typescript
interface ChannelMessage<T> {
  id: string;                    // 消息唯一ID
  type: ChannelMessageType;      // 消息类型
  source: 'admin' | 'group' | 'hotel';
  timestamp: number;
  payload: T;
  meta?: {
    groupId?: string;
    hotelId?: string;
    userId?: string;
    correlationId?: string;
  };
}

interface GroupSelectPayload {
  groupId: string;
  groupName: string;
  action: 'view' | 'edit' | 'focus';
  sourcePage?: string;
  context?: {
    customerId?: string;
    regionCount?: number;
    hotelCount?: number;
  };
}
```

## 降级方案

当浏览器不支持 `BroadcastChannel` 时，自动降级为 `localStorage` 方案：

```typescript
// 使用 storage 事件模拟广播
window.addEventListener('storage', (e) => {
  if (e.key === 'shadow-bees-v52') {
    handleMessage(JSON.parse(e.newValue));
  }
});
```

## 未来 WebSocket 迁移

当前架构已预留 WebSocket 迁移接口：

```typescript
// 只需替换 channelManager 的实现
class WebSocketChannelManager {
  private ws: WebSocket;
  
  send(message: ChannelMessage) {
    this.ws.send(JSON.stringify(message));
  }
  
  onMessage(callback: (msg: ChannelMessage) => void) {
    this.ws.onmessage = (e) => callback(JSON.parse(e.data));
  }
}
```

## 调试

在浏览器控制台查看通信日志：

```javascript
// 查看频道统计
channelManager.getStats();
// { sent: 10, received: 5, errors: 0, lastPing: 1708321234567 }

// 手动发送测试消息
channelManager.send('GROUP_SELECT', {
  groupId: 'test',
  groupName: '测试集团',
  action: 'view'
});
```

## 注意事项

1. **同源限制**: BroadcastChannel 只在同源页面间通信
2. **兼容性**: Chrome 54+, Firefox 38+, Safari 15.4+
3. **隐私模式**: 部分浏览器隐私模式可能不可用，已提供 localStorage 降级
4. **消息大小**: 建议单条消息不超过 1MB

## 备份信息

当前备份已创建于: `backups/admin_20260219_104650/`
