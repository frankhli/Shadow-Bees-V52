# API 抽象层使用说明

## 设计目标

- **零侵入**: 不修改现有前端代码，只添加新文件
- **可切换**: 支持运行时切换模拟/真实后端
- **可复用**: 后期迁移到正式后端，前端代码 95% 保留

## 使用方法

### 基础用法

```typescript
import { api } from '@/api';

// 获取酒店列表
const hotels = await api.getHotels();

// 获取订单
const orders = await api.getOrders({ hotelId: 'sanlitun', limit: 10 });

// 创建订单
const newOrder = await api.createOrder({
  hotelId: 'sanlitun',
  platform: 'xianyu',
  price: 350,
  // ...
});
```

### 模式切换

```typescript
// 查看当前模式
console.log(api.getMode());  // 'mock' 或 'backend'

// 切换到真实后端
api.setMode('backend');

// 切换回模拟数据
api.setMode('mock');
```

### 在组件中使用

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/api';

function MyComponent() {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    api.getOrders({ hotelId: 'sanlitun' }).then(setOrders);
  }, []);
  
  // ...
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_USE_BACKEND` | `false` | 是否使用真实后端 |
| `VITE_API_URL` | `http://127.0.0.1:8090/api` | 后端地址 |

## 与现有 Store 的关系

```
┌─────────────────────────────────────┐
│           现有组件/页面              │
│    （不需要修改，保持原样）           │
└─────────────────────────────────────┘
                   │
┌─────────────────────────────────────┐
│      useUnifiedStore (Zustand)      │
│    （可逐步迁移到使用 api 层）        │
└─────────────────────────────────────┘
                   │
┌─────────────────────────────────────┐
│         API 抽象层 (@/api)          │
│  ┌──────────────┬──────────────┐   │
│  │   mock.ts    │  index.ts    │   │
│  │  (模拟数据)   │  (统一管理)   │   │
│  └──────────────┴──────────────┘   │
└─────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
   ┌──────────┐       ┌──────────┐
   │ localStorage    │  PocketBase  │
   │  (浏览器存储)   │   (真实后端)  │
   └──────────┘       └──────────┘
```

## 扩展指南

### 添加新接口

1. 在 `src/api/index.ts` 的 `APIInterface` 中添加方法签名
2. 在 `RealAPI` 类中实现真实后端调用
3. 在 `mock.ts` 中实现模拟数据版本

```typescript
// index.ts
interface APIInterface {
  // ... 现有方法
  getNewData: (id: string) => Promise<NewData>;
}

// RealAPI 类
async getNewData(id: string): Promise<NewData> {
  return this.request(`/collections/new_data/records/${id}`);
}

// mock.ts
async getNewData(id: string): Promise<NewData> {
  await delay(200);
  return { id, name: 'Mock Data' };
}
```

## 调试技巧

```typescript
// 浏览器控制台调试
api.setMode('backend');
api.getHotels().then(console.log);

// 查看 localStorage 数据
JSON.parse(localStorage.getItem('sb_orders'));

// 查看 API 日志（开发环境）
// 网络面板查看 PocketBase 请求
```
