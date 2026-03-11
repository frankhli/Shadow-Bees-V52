# Shadow-Bees V52 - 当前状态

## 已完成

### 数据联动修复
- 推演交易生成时添加 `checkInDate`/`checkOutDate`
- 交易自动占用日历库存（跨日逻辑：20%当天、30%提前1天、30%提前2-3天、20%提前7天）
- 所有数据从 transactions/contents/inventory 实时统计，无死数

### 今日概览
- 6个关键指标卡：GMV、订单、入住率、待处理、均价、库存
- 左侧：三大平台销售数据（实时）
- 中间：实时成交动态（带滑入动画）
- 右侧：7天日历（占用后真实库存）+ 快捷操作 + 房型切换

### 本周/本月/自定义视图（全新重构）
- **核心KPI**：GMV、订单、客单价、内容转化率（对比上周/上月）
- **渠道ROI**：闲鱼/小红书/抖音的单量、金额、均价、转化率
- **预订行为画像**：平均提前X天、平均入住Y晚、各渠道预订习惯
- **内容效率漏斗**：发布→咨询→成交转化率
- **库存周转**：本期售出、周转率、避免空房损失
- **定价策略效果**：尾货/黄牛/动态模式各自的单量和收益
- 所有数据实时从推演数据计算，无死数

## 数据勾稽关系
```
推演生成交易 → 更新 inventory.byRoomType（已售/可用）
           ↓
      有入住日期 → occupyInventory → 更新 inventory.calendar（7天库存）
           ↓
      关联 sourceContentId → 内容转化率统计
```

## 关键文件
- TodayView: src/components/overview/TodayView.tsx
- WeekMonthView: src/components/overview/WeekMonthView.tsx（全新）
- Store: src/stores/unifiedStore.ts（推演逻辑）
