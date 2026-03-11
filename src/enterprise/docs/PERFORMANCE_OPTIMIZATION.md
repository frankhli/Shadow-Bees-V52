# 性能优化指南

## 概述

当管理 1000+ 家酒店时，性能优化至关重要。本文档介绍 Shadow-Bees 企业版的性能优化策略。

## 已完成优化

### 1. 代码精简
- 文件数从 312 减少到 12 (-96%)
- 删除重复代码和占位符

### 2. 组件按需加载
- 适配器模式按需渲染
- 标签页懒加载

## 待优化项

### 1. 酒店选择器虚拟滚动

**问题**: 当前 HotelSelector 渲染所有酒店，1000+ 家时卡顿

**解决方案**: 使用 react-window 实现虚拟滚动

```typescript
import { FixedSizeList as List } from 'react-window';

// 只渲染可见区域的酒店
<List
  height={400}
  itemCount={hotels.length}
  itemSize={72}
  width="100%"
>
  {HotelRow}
</List>
```

### 2. 数据分页

**后端分页**
```typescript
// 请求参数
interface PaginationParams {
  page: number;
  pageSize: number;
  filters?: FilterState;
}

// 响应格式
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

**前端无限滚动**
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['hotels'],
  queryFn: fetchHotels,
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
});
```

### 3. WebSocket 实时推送

**减少轮询**
```typescript
// 使用 WebSocket 替代轮询
const ws = new WebSocket('wss://api.shadowbees.com/ws');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  switch (type) {
    case 'PRICE_UPDATED':
      updatePrice(data);
      break;
    case 'INVENTORY_CHANGED':
      updateInventory(data);
      break;
    case 'NEW_ORDER':
      addOrder(data);
      break;
  }
};
```

### 4. 数据缓存

**React Query 缓存**
```typescript
const { data } = useQuery({
  queryKey: ['hotels', filters],
  queryFn: fetchHotels,
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000, // 10分钟
});
```

**本地存储缓存**
```typescript
const hotelCache = {
  get: () => JSON.parse(localStorage.getItem('hotel_cache') || '{}'),
  set: (data: any) => localStorage.setItem('hotel_cache', JSON.stringify(data)),
  isValid: (timestamp: number) => Date.now() - timestamp < 5 * 60 * 1000,
};
```

## 性能指标

### 目标

| 指标 | 当前 | 目标 |
|-----|-----|-----|
| 首屏加载 | ~3s | < 2s |
| 酒店列表渲染 | O(n) | O(可见数) |
| 批量操作100家 | ~30s | < 10s |
| 内存占用 | ~200MB | < 100MB |

### 监控

```typescript
// 性能监控
const performanceMonitor = {
  measure: (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
  },
  
  logRenderTime: (componentName: string) => {
    useEffect(() => {
      const start = performance.now();
      return () => {
        const end = performance.now();
        console.log(`${componentName} render time: ${end - start}ms`);
      };
    });
  },
};
```

## 实施计划

### Phase 1: 虚拟滚动 (1-2天)
- [ ] HotelSelector 虚拟滚动
- [ ] Dashboard 酒店卡片分页

### Phase 2: 数据分页 (2-3天)
- [ ] 后端 API 分页支持
- [ ] 前端无限滚动

### Phase 3: WebSocket (3-5天)
- [ ] WebSocket 服务搭建
- [ ] 前端实时推送

### Phase 4: 缓存优化 (2-3天)
- [ ] React Query 集成
- [ ] 本地缓存策略

## 测试

```bash
# 性能测试
npm run test:performance

# 压力测试
npm run test:load -- --hotels=10000
```
