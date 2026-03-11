# Shadow-Bees V52 - 三端时间切换统一

## 概述

管理端 (Admin)、集团端 (Group)、酒店端 (Hotel) 现在拥有统一的时间切换维度。

## 统一的时间范围配置

```typescript
const timeRangeConfig = {
  today: { label: '今日', days: 1, compareLabel: '较昨日' },
  week: { label: '本周', days: 7, compareLabel: '较上周' },
  month: { label: '本月', days: 30, compareLabel: '较上月' },
  year: { label: '本年', days: 365, compareLabel: '较上年' },
};

type TimeRange = 'today' | 'week' | 'month' | 'year';
```

## 各端实现

### 1. 管理端 (Dashboard.tsx)

**URL 参数控制**: `?range=today`

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const currentTimeRange = (searchParams.get('range') as TimeRange) || 'today';

// 时间切换 UI
<div className="flex items-center gap-1 p-1 bg-[#151B2B] rounded-xl border border-gray-800">
  {(Object.keys(timeRangeConfig) as TimeRange[]).map((range) => (
    <button
      key={range}
      onClick={() => setSearchParams({ range })}
      className={...}
    >
      {timeRangeConfig[range].label}
    </button>
  ))}
</div>
```

**状态存储**: `adminStore.ts` 中的 `selectedTimeRange`

**动态标题**: 
- 今日GMV / 本周GMV / 本月GMV / 本年GMV
- 今日订单 / 本周订单 / 本月订单 / 本年订单

### 2. 集团端 (GroupDashboard.tsx)

**URL 参数控制**: `?range=today`

```typescript
const currentRange = (searchParams.get('range') as TimeRange) || 'today';
const config = rangeConfig[currentRange];
```

**状态存储**: `groupStore.ts` 中的 `selectedTimeRange`

### 3. 酒店端 (TodayOverview.tsx)

**URL 参数控制**: `?range=today`

```typescript
const range = (searchParams.get('range') || 'today') as keyof typeof rangeConfig;
const rangeInfo = rangeConfig[range] || rangeConfig.today;
```

**特殊功能**: 保留自定义时间范围选择（日历组件）

## UI 对比

| 端 | 位置 | 样式 |
|---|---|---|
| 管理端 | 页面标题右侧 | 深色背景 + 青色高亮 |
| 集团端 | 页面标题右侧 | 深色背景 + 紫色高亮 |
| 酒店端 | 页面标题下方 | 卡片式 + 蓝色高亮 |

## 数据联动

切换时间范围后，以下数据会自动更新：

### 管理端
- 统计卡片标题 (今日GMV → 本周GMV)
- 平台统计数据
- 异常统计数据
- 客户健康度数据

### 集团端
- 门店 GMV、RevPAR、入住率
- 内容转化率
- AI 价值计算
- 区域统计数据

### 酒店端
- 交易数据
- 内容数据
- 库存数据
- 收入对比数据

## 使用示例

### 直接访问特定时间范围
```
/admin/dashboard?range=week    # 查看本周数据
/group?range=month             # 查看本月数据
/hotel/overview?range=today    # 查看今日数据
```

### 在组件中读取时间范围
```typescript
const [searchParams] = useSearchParams();
const timeRange = searchParams.get('range') || 'today';
```

### 在 Store 中更新时间范围
```typescript
// 管理端
useAdminStore.getState().setSelectedTimeRange('month');

// 集团端
useGroupStore.getState().setTimeRange('month');
```

## 注意事项

1. **URL 同步**: 三端都使用 URL 参数存储时间范围，刷新页面后保持选中状态
2. **状态持久化**: 集团端使用 zustand persist 持久化时间范围
3. **数据计算**: 切换时间范围后，所有统计数据会根据 `days` 参数重新计算
4. **自定义范围**: 酒店端保留自定义时间范围功能，通过日历组件选择

## 后续优化建议

1. 添加时间范围切换的动画过渡效果
2. 添加时间范围变化的数据对比功能（环比/同比）
3. 添加快捷时间选项（昨天、上周、上月等）
4. 添加时间范围预设（近7天、近30天等）
