# 退款实时同步功能

## 功能概述

实现了酒店端和管理端之间的退款申请和审批状态实时同步。

## 工作流程

1. **酒店端**在订单管理页面提交退款申请
2. **管理端**收到实时通知并审核退款
3. **酒店端**收到审批结果通知，订单状态自动更新

## 核心组件

### 1. 同步服务 (`src/services/refundSync.ts`)

独立的退款同步服务，使用 BroadcastChannel API 和 localStorage fallback 实现跨窗口通信。

```typescript
// 退款同步消息类型
export type RefundSyncMessage =
  | { type: 'REFUND_REQUESTED'; refund: Refund; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'REFUND_APPROVED'; refundId: string; orderId: string; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'REFUND_REJECTED'; refundId: string; orderId: string; reason: string; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'REFUND_COMPLETED'; refundId: string; orderId: string; timestamp: number; source: 'hotel' | 'admin' };
```

### 2. 同步 Hook (`src/hooks/useRefundSync.ts`)

- `useHotelRefundSync()` - 酒店端使用，监听管理端的审批结果
- `useAdminRefundSync()` - 管理端使用，监听酒店端的退款申请

### 3. 状态管理

**酒店端 (`src/stores/unifiedStore.ts`)**
- `requestRefund()` - 提交退款申请并广播
- `updateRefund()` - 更新本地退款状态
- `syncRefundFromAdmin()` - 同步管理端的退款状态

**管理端 (`src/admin/stores/adminStore.ts`)**
- `approveRefund()` - 批准退款并广播
- `rejectRefund()` - 拒绝退款并广播
- `completeRefund()` - 完成退款处理

### 4. UI 组件

**酒店端 (`src/pages/OrderManagement.tsx`)**
- `RefundRequestButton` - 订单详情中的退款申请按钮
- `RefundRequestModal` - 退款申请表单弹窗

**管理端 (`src/admin/pages/finance/index.tsx`)**
- `RefundPanel` - 退款管理面板，支持审批操作

## 使用方式

### 酒店端申请退款

```typescript
// 在组件中初始化同步
useRefundSync();

// 提交退款申请
const { requestRefund } = useUnifiedStore();
requestRefund(orderId, {
  amount: 200,
  reason: 'customer_cancel',
  reasonDetail: '客户行程变更',
  customerName: '张三',
  customerPhone: '13800138000',
});
```

### 管理端审批退款

```typescript
// 批准退款
approveRefund(refundId, '审核通过');

// 拒绝退款
rejectRefund(refundId, '不符合退款政策');
```

## 防循环机制

每个同步消息包含 `source` 字段（'hotel' | 'admin'），接收方只处理来自另一端的消息，防止消息循环。

## 消息流程

```
酒店端                    管理端
  |                          |
  |---- REFUND_REQUESTED --->|
  |                          |
  |<--- REFUND_APPROVED -----|
  |     (或 REFUND_REJECTED) |
  |                          |
```

## 注意事项

1. 同步服务使用 BroadcastChannel，需要在支持该 API 的现代浏览器中运行
2. 如果 BroadcastChannel 不可用，会自动降级到 localStorage
3. 退款状态变更会触发订单状态的自动更新
4. 同步消息包含时间戳，可用于消息排序和去重
