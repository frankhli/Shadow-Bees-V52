# Shadow-Bees V52 备份信息

## 备份时间
2026-02-24 09:32:58

## 备份版本
wechat-private-domain-v1.0

## 主要修改内容

### 1. 核心类型定义 (src/types/index.ts)
- Platform 类型: 'douyin' → 'wechat'
- ContentItem.performance 扩展私域指标: touches, replies, privateConversions
- 新增 publishMethod 字段标记发布方式

### 2. Hotel 端 (src/)

#### ContentFactory.tsx
- 私域内容生成后保存为 draft 状态
- 公域内容直接 published 并广播
- 保存完整私域脚本 (groupScript, privateScript, videoScript)

#### PrivateDomain.tsx (新增页面)
- 草稿箱视图: 显示所有 draft 状态私域内容
- 发布功能: 复制内容 + 标记为 published
- 私域专属指标: 触达/回复/成交 (替代曝光/点击)
- 支持 4 种私域子类型: moments/group/private/channels

#### unifiedStore.ts
- addContent(): 私域草稿不广播, 公域内容立即广播
- publishContent(): 更新状态并广播到 Admin

### 3. Admin 端 (src/admin/)

#### stores/adminStore.ts
- ContentItem 扩展 stats 字段 (兼容 performance)
- 添加私域指标: touches, replies, privateConversions
- initContentSyncSubscription(): 接收广播并转换字段

#### pages/content/index.tsx
- 内容列表区分显示:
  - 微信: 触达/回复/成交 + 子类型标签
  - 其他: 曝光/点击/转化

#### ContentManageModal.tsx
- 显示私域脚本详情 (群运营/私聊话术/视频脚本)
- 私域内容隐藏"下架"按钮

#### warehouse/index.tsx
- 表格显示子类型标签
- 平台筛选 + 子类型筛选 (微信)

#### channels/ChannelCompare.tsx
- 添加微信私域运营分布分析卡片
- 4 种子类型统计: 朋友圈/微信群/私聊/视频号

#### channels/index.tsx
- 内容排行榜显示子类型标签

### 4. Group 端 (src/group/)

#### stores/groupStore.ts
- HotelInGroup.contentPerformance 扩展 privateDomain
- ChannelData 扩展 privateMetrics 和 subtypeDistribution
- generateChannels(): 生成私域模拟数据

#### stores/mockData.ts
- generateHotelData(): 生成私域指标数据

#### pages/ChannelAnalysis.tsx
- 微信渠道卡片显示私域指标:
  - 触达客户/客户回复/回复率/私域成交
  - 内容分布标签 (朋友圈/群/私聊)

#### pages/ContentGovernance.tsx
- 爆款内容卡片区分显示:
  - 微信: 触达/回复/成交
  - 其他: 浏览/点赞/评论/分享

### 5. 数据联动逻辑

```
ContentFactory (生成)
  ├─ 私域(draft) → addContent() → ❌不广播
  └─ 公域(published) → addContent() → ✅广播

PrivateDomain (发布)
  └─ publishContent() → 状态更新 → ✅广播

Admin (接收)
  └─ performance → stats 字段转换
```

## 备份位置
/Users/frank/Desktop/backups/shadow-bees-v52-backup-20260224-093258

## 恢复方法
```bash
cp -r /Users/frank/Desktop/backups/shadow-bees-v52-backup-20260224-093258 \
      /Users/frank/Desktop/shadow-bees-v52
```
