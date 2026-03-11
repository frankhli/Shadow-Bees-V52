# Enterprise UI 组件库

Shadow-Bees Enterprise 全局通用 UI 组件，提供统一的用户体验。

## 组件列表

### 1. Toast 通知组件

路径: `/src/enterprise/components/Toast.tsx`

#### 基础用法

```tsx
import { ToastContainer, toast } from '@/enterprise/components';

// 在 App.tsx 根组件中添加容器
function App() {
  return (
    <>
      <Router />
      <ToastContainer position="top-right" />
    </>
  );
}

// 在组件中使用
toast.success('操作成功', '数据已保存');
toast.error('操作失败', '请稍后重试');
toast.info('提示信息', '您有新的消息');
toast.warning('警告', '请注意检查');
toast.loading('加载中...', '正在获取数据');
```

#### Promise 方式

```tsx
import { toast } from '@/enterprise/components';

await toast.promise(
  fetchData(),
  { 
    loading: '加载中...', 
    success: '加载完成', 
    error: '加载失败' 
  }
);
```

#### 撤销操作

```tsx
const id = toast.undo('订单已删除', () => {
  // 撤销操作
  restoreOrder();
}, 5000); // 5秒内可撤销
```

#### Hook 使用

```tsx
import { useToast } from '@/enterprise/components';

function MyComponent() {
  const { success, error, remove } = useToast();
  
  const handleSave = async () => {
    const id = success('保存成功');
    // 3秒后自动关闭，或手动关闭
    setTimeout(() => remove(id), 1000);
  };
}
```

---

### 2. Loading 加载组件

路径: `/src/enterprise/components/Loading.tsx`

#### 全屏加载

```tsx
import { Loading } from '@/enterprise/components';

// 全屏加载
<Loading.FullScreen text="正在加载..." subText="正在加载酒店数据" />

// 遮罩加载（在内容上方）
<Loading.Overlay text="保存中...">
  <YourContent />
</Loading.Overlay>

// 区域加载
<Loading.Section text="加载中..." minHeight="200px" />
```

#### Spinner 加载

```tsx
import { Spinner } from '@/enterprise/components';

// 基础用法
<Spinner />

// 带文字
<Spinner text="加载中..." />

// 居中显示
<Spinner text="加载中..." centered />

// 不同尺寸和颜色
<Spinner size="sm" color="white" />
<Spinner size="lg" color="muted" />
```

#### 骨架屏

```tsx
import { Skeleton, CardSkeleton, TableSkeleton, DashboardSkeleton } from '@/enterprise/components';

// 基础骨架
<Skeleton width={200} height={20} />
<Skeleton width="100%" height={100} circle /> // 圆形

// 卡片骨架
<CardSkeleton rows={3} />

// 表格骨架
<TableSkeleton rows={5} columns={4} />

// 仪表盘骨架（完整页面）
<DashboardSkeleton />
```

#### 按钮加载

```tsx
import { ButtonLoading, Inline, Dots, Pulse } from '@/enterprise/components';

// 按钮内加载
<button disabled={loading}>
  {loading ? <ButtonLoading text="保存中..." /> : '保存'}
</button>

// 内联加载
<span>正在处理 <Inline /></span>

// 点状动画
<span>加载中 <Dots /></span>

// 脉冲动画
<Pulse />
```

---

### 3. EmptyState 空状态组件

路径: `/src/frank/Desktop/shadow-bees-v52/src/enterprise/components/EmptyState.tsx`

#### 基础用法

```tsx
import { EmptyState } from '@/enterprise/components';

// 使用预设类型
<EmptyState type="data" />
<EmptyState type="search" />
<EmptyState type="error" />
<EmptyState type="create" />
<EmptyState type="notification" />
<EmptyState type="chart" />
<EmptyState type="404" />
<EmptyState type="403" />
<EmptyState type="offline" />
```

#### 带操作按钮

```tsx
<EmptyState
  type="search"
  title="未找到相关结果"
  description="尝试使用其他关键词"
  primaryAction={{ 
    label: '清除筛选', 
    onClick: handleClear,
    icon: Filter 
  }}
  secondaryAction={{ 
    label: '查看全部', 
    onClick: handleViewAll 
  }}
/>
```

#### 快捷场景组件

```tsx
import { 
  EmptySearch, 
  EmptyTable, 
  EmptyChart, 
  ErrorState,
  NotFoundState,
  OfflineState 
} from '@/enterprise/components';

// 搜索为空
<EmptySearch query={searchQuery} onClear={handleClear} />

// 表格为空
<EmptyTable 
  onCreate={handleCreate} 
  createLabel="创建酒店"
  resourceName="酒店" 
/>

// 图表为空
<EmptyChart title="暂无销售数据" />

// 错误状态
<ErrorState onRetry={handleRetry} message="数据加载失败" />

// 404 页面
<NotFoundState onBack={() => navigate('/')} />

// 离线状态
<OfflineState onRetry={handleRetry} />
```

#### 自定义内容

```tsx
<EmptyState
  type="custom"
  title="暂无权限"
  description="请联系管理员获取访问权限"
  illustration={<CustomIcon />}
  size="lg"
  layout="horizontal"
/>
```

---

### 4. ErrorBoundary 错误边界组件

路径: `/src/enterprise/components/ErrorBoundary.tsx`

#### 基础用法

```tsx
import { ErrorBoundary } from '@/enterprise/components';

// 基础用法
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// 自定义回退 UI
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onReset={() => console.log('重试')}
>
  <YourComponent />
</ErrorBoundary>

// 显示错误详情（开发环境）
<ErrorBoundary showDetails={true}>
  <YourComponent />
</ErrorBoundary>
```

#### 自定义文案

```tsx
<ErrorBoundary
  title="组件加载失败"
  description="该模块暂时无法使用，请稍后重试"
  onReset={handleReset}
>
  <RiskyComponent />
</ErrorBoundary>
```

#### HOC 高阶组件

```tsx
import { withErrorBoundary } from '@/enterprise/components';

const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: <div>出错了</div>,
  onReset: () => console.log('重置'),
});
```

#### 内联错误

```tsx
import { InlineError } from '@/enterprise/components';

<InlineError 
  error={error} 
  onRetry={handleRetry} 
/>
```

#### 错误恢复 Hook

```tsx
import { useErrorRecovery } from '@/enterprise/components';

function MyComponent() {
  const { retry, isRetrying, canRetry, retryCount } = useErrorRecovery({
    maxRetries: 3,
    retryDelay: 1000,
    onMaxRetriesReached: () => toast.error('已达到最大重试次数'),
  });

  const handleOperation = async () => {
    await retry(async () => {
      await riskyOperation();
    });
  };
}
```

#### 异步错误处理

```tsx
import { useAsyncErrorHandler } from '@/enterprise/components';

function MyComponent() {
  const handleError = useAsyncErrorHandler();

  const handleAsync = async () => {
    try {
      await riskyAsyncOperation();
    } catch (e) {
      handleError(e as Error);
    }
  };
}
```

---

## 统一导入

所有组件都可以通过统一入口导入：

```tsx
import {
  // Toast
  ToastContainer,
  toast,
  useToast,
  
  // Loading
  Loading,
  Spinner,
  Skeleton,
  
  // EmptyState
  EmptyState,
  EmptySearch,
  EmptyTable,
  ErrorState,
  
  // ErrorBoundary
  ErrorBoundary,
  InlineError,
  withErrorBoundary,
  useErrorRecovery,
} from '@/enterprise/components';
```

## 主题适配

所有组件都支持深色/浅色主题，自动适配项目的 CSS 变量：

- `--bg-primary` - 主背景色
- `--bg-secondary` - 次背景色
- `--text-primary` - 主文字色
- `--text-secondary` - 次文字色
- `--border-color` - 边框色
- `--neon-cyan` - 主题色
- `--neon-green` - 成功色
- `--neon-amber` - 警告色
- `--neon-red` - 错误色
