# Shadow-Bees 组件使用指南

> 🧩 常用组件的使用方法和最佳实践

## 目录

- [基础组件](#基础组件)
- [布局组件](#布局组件)
- [数据展示组件](#数据展示组件)
- [反馈组件](#反馈组件)
- [UX 增强组件](#ux-增强组件)

---

## 基础组件

### Button 按钮

```tsx
import { Button } from '@/components/ui';

// 基础用法
<Button>默认按钮</Button>

// 变体样式
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="danger">危险按钮</Button>

// 带图标
<Button icon={<Plus size={16} />}>新建</Button>

// 加载状态
<Button isLoading>保存中...</Button>

// 禁用状态
<Button disabled>禁用</Button>
```

### Card 卡片

```tsx
import { Card } from '@/components/ui/card';

<Card className="p-6">
  <h3 className="text-lg font-semibold">卡片标题</h3>
  <p className="text-gray-400">卡片内容</p>
</Card>
```

### Badge 徽章

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>默认</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="danger">错误</Badge>
```

---

## 布局组件

### Skeleton 骨架屏

```tsx
import { PageSkeleton, CardSkeleton, TableSkeleton } from '@/components/ux/Skeleton';

// 页面级骨架屏
<PageSkeleton />

// 卡片骨架屏
<CardSkeleton />

// 表格骨架屏
<TableSkeleton rows={5} columns={4} />
```

### SortableTable 可排序表格

```tsx
import { SortableTable } from '@/admin/components/ui/SortableTable';

interface DataItem {
  id: string;
  name: string;
  amount: number;
  status: string;
}

const columns = [
  { key: 'name', header: '名称', sortable: true },
  { key: 'amount', header: '金额', sortable: true, render: (row) => `¥${row.amount}` },
  { key: 'status', header: '状态', render: (row) => <Badge>{row.status}</Badge> },
];

<SortableTable<DataItem>
  data={data}
  columns={columns}
  keyExtractor={(row) => row.id}
  isLoading={isLoading}
  emptyMessage="暂无数据"
/>
```

---

## 数据展示组件

### EmptyState 空状态

```tsx
import { EmptyState } from '@/components/ux/EmptyState';

<EmptyState type="table" title="暂无数据" description="请添加数据后查看" />
<EmptyState type="search" title="未找到结果" description="请尝试其他搜索词" />
<EmptyState type="error" title="加载失败" description="请刷新页面重试" />
```

### AnimatedNumber 数字动画

```tsx
import { AnimatedNumber } from '@/components/ux/DataUpdateFeedback';

<AnimatedNumber value={1234} duration={500} prefix="¥" />
```

---

## 反馈组件

### Toast 轻提示

```tsx
import { useToast } from '@/components/ui';

function MyComponent() {
  const { success, error, info, warning } = useToast();

  const handleSave = () => {
    success('保存成功');
    error('保存失败');
    info('提示信息');
    warning('警告信息');
  };
}
```

### 带 Promise 的 Toast

```tsx
import { toast } from '@/components/ux';

toast.promise(
  fetchData(),
  {
    loading: '加载中...',
    success: '加载成功',
    error: '加载失败',
  }
);
```

---

## UX 增强组件

### CommandPalette 命令面板

```tsx
import { CommandPalette } from '@/components/ux';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CommandPalette
      appType="admin" // 'hotel' | 'group' | 'admin'
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onOpenShortcutHelp={() => {}}
    />
  );
}
```

快捷键：`Ctrl + K`

### ShortcutHelp 快捷键帮助

```tsx
import { ShortcutHelp } from '@/components/ux';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ShortcutHelp
      appType="admin"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
```

快捷键：`Ctrl + /`

### ShortcutSettings 快捷键设置

```tsx
import { ShortcutSettings } from '@/components/ux';

<ShortcutSettings appType="admin" />
```

---

## 最佳实践

### 1. 加载状态处理

```tsx
function MyPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <PageSkeleton />;

  return <div>页面内容</div>;
}
```

### 2. 筛选后加载动画

```tsx
function MyPage() {
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [filter]);
}
```

### 3. 错误边界

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### 4. 快捷键集成

```tsx
import { useConfiguredHotkeys } from '@/hooks';

function MyPage() {
  // 自动从 store 读取快捷键配置
  useConfiguredHotkeys({ appType: 'admin' });
}
```

---

## 样式规范

### 颜色系统

```tsx
// 品牌色
bg-neon-cyan / text-neon-cyan      // 主色调
bg-neon-purple / text-neon-purple  // 次要色

// 状态色
bg-neon-green / text-neon-green    // 成功
bg-neon-amber / text-neon-amber    // 警告
bg-neon-red / text-neon-red        // 错误

// 背景色
bg-[#0B0F19]   // 页面背景
bg-[#151B2B]   // 卡片背景
```

### 间距规范

```tsx
// 内边距
p-4   // 16px
p-6   // 24px

// 外边距
space-y-4   // 垂直间距 16px
gap-4       // flex/grid 间距 16px
```

---

## 更多组件

详细组件文档正在完善中，请参考：

- 源代码：`src/components/ui/`
- 类型定义：`src/components/ui/index.ts`

---

<p align="center">
  <sub>组件库由 Shadow-Bees Team 维护</sub>
</p>
