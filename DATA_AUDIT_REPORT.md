# Shadow-Bees V52 数据联动审计报告

**审计日期**: 2024年  
**审计范围**: 全系统所有页面和组件  
**严重程度**: 🔴高 | 🟡中 | 🟢低

---

## 📊 问题汇总统计

| 页面/模块 | 死数/静态数据 | 逻辑错误 | 未联动数据 | 总计 |
|-----------|--------------|----------|------------|------|
| TodayOverview | 3 | 4 | 2 | 9 |
| MarketIntelligence | 8 | 3 | 3 | 14 |
| OrderManagement | 7 | 3 | 3 | 13 |
| FinanceCompliance | 6 | 4 | 2 | 12 |
| ContentFactory | 18 | 2 | 5 | 25 |
| PublishStatus | 1 | 3 | 2 | 6 |
| PricingDecision | 5 | 5 | 4 | 14 |
| HumanService | 15 | 2 | 5 | 22 |
| InventoryAndRoomStatus | 5 | 4 | 5 | 14 |
| **总计** | **68** | **30** | **31** | **129** |

---

## 🔴 高优先级问题（必须立即修复）

### 1. TodayOverview.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **317** | `todayCount = transactions.length` 未过滤日期 | 显示"今日X单"为假数据 |
| **817** | 趋势值硬编码"基准¥380" | 未从酒店配置读取真实底价 |

### 2. MarketIntelligence.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **844,847,850** | 运算符优先级错误 | 默认价格计算错误（应为(200+300)/2=250，实际可能为500/2=250） |
| **681** | 最高涨幅显示错误 | 显示价格而非涨幅百分比 |

### 3. OrderManagement.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **186-187** | 服务费率硬编码6% | 各平台实际费率不同（闲鱼/小红书/抖音费率不一致） |
| **205-230** | 入住率计算逻辑错误 | 时间范围筛选下计算失真（如本周50单/20间=250%） |
| **963** | 房间数量硬编码"1间" | 应从order.roomCount读取 |

### 4. FinanceCompliance.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **122-123** | 开票统计用固定0.9系数 | **核心业务数据造假**！开票数和金额不真实 |

### 5. ContentFactory.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **155-156,163,170** | 库存数量硬编码"最后X间" | 应从实时库存获取，可能误导用户造成超售 |
| **160,168,207** | 步行时间硬编码"5分钟" | 应从currentHotel.distanceToVenue获取 |
| **716-718** | 小红书预览假互动数据 | **违反广告法**，点赞/收藏/评论数为假 |

### 6. PublishStatus.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **309-312** | 漏斗数据源时间范围不一致 | 曝光/点击/咨询用历史累积，成交用过滤数据，转化率失真 |
| **614-617** | 内容明细GMV未过滤时间 | 显示所有历史成交而非选定时间范围 |

### 7. PricingDecision.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **124** | 置信度随机生成 | `70 + Math.random() * 20` 严重影响产品专业度信任 |
| **710** | 除零风险 | `currentPrice`可能为0导致NaN |
| **110-111** | anchorLow/High逻辑矛盾 | 最低价×1.2可能>最高价×0.9，范围倒置 |

### 8. HumanService.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **52-133** | 全部模拟请求数据 | 整个客服工作台是演示数据，非真实业务数据 |
| **242-244** | 转人工率计算错误 | 使用硬编码50作为AI处理数 |

### 9. InventoryAndRoomStatus.tsx
| 行号 | 问题 | 影响 |
|------|------|------|
| **385** | 房间维修状态随机生成 | `Math.random() > 0.95` 完全无真实数据支撑 |
| **217-221,304-308** | 销量按比例估算 | 应从交易记录直接统计OTA销量 |

---

## 🟡 中优先级问题（建议修复）

### 1. 硬编码阈值（多处）
| 位置 | 数值 | 建议 |
|------|------|------|
| TodayOverview | `>= 3` 对比数据阈值 | 基于时间范围动态判断 |
| TodayOverview | `>= 85`, `< 50` 入住率判断 | 提取为配置常量 |
| FinanceCompliance | `< 10` 库存紧张阈值 | 改为百分比或配置化 |
| Inventory | `>= 3`, `<= 1` 调拨条件 | 提取为配置常量 |

### 2. 除零保护缺失
| 位置 | 行号 | 问题 |
|------|------|------|
| PricingDecision | 106, 710, 1438 | 多处除法未保护除数为零的情况 |
| MarketIntelligence | 431 | currentRoomType不存在时默认价格 |

### 3. 兜底值处理
| 位置 | 行号 | 建议 |
|------|------|------|
| PricingDecision | 1082-1083 | 显示加载状态而非硬编码兜底值 |
| OrderManagement | 186-187 | 平台费率配置化 |

### 4. 单位不匹配
| 位置 | 行号 | 问题 |
|------|------|------|
| MarketIntelligence | 681 | 最高涨幅显示价格而非百分比 |
| TodayOverview | 793-794 | 营收<1000时显示"0.0k"不友好 |

---

## 🟢 低优先级问题（代码质量）

1. **时间常量** - `60*60*1000`等毫秒转换是合理的
2. **颜色映射** - 平台颜色硬编码是可接受的配置
3. **排名颜色** - 金银铜牌颜色是业务规则
4. **动画延迟** - 0.1s, 0.2s等是交互设计参数

---

## 🔧 修复方案汇总

### 立即执行（🔴高优先级）

1. **修复开票统计** (FinanceCompliance 122-123)
```typescript
const issuedTransactions = filteredTransactions.filter(t => t.invoice?.issued === true);
const issuedCount = issuedTransactions.length;
const issuedAmount = issuedTransactions.reduce((sum, t) => sum + (t.invoice?.amount || 0), 0);
```

2. **修复今日订单统计** (TodayOverview 317)
```typescript
const todayStr = new Date().toISOString().split('T')[0];
const todayCount = transactions.filter(t => t.timestamp?.startsWith(todayStr)).length;
```

3. **移除假互动数据** (ContentFactory 716-718)
```typescript
// 改为显示模拟提示或从真实performance读取
<span>{generatedContent.performance?.likes || '...'}</span>
<span className="text-xs text-gray-400">（预览数据）</span>
```

4. **修复置信度算法** (PricingDecision 124)
```typescript
// 基于数据质量计算而非随机
const confidence = calculateConfidence(prices.length, events.length, competitorAvg);
```

5. **修复维修状态** (Inventory 385)
```typescript
status: roomInv?.maintenanceStatus || 'clean', // 从store获取
```

### 短期执行（🟡中优先级）

1. 提取所有硬编码阈值为配置常量
2. 添加除零保护
3. 统一漏斗数据源时间范围
4. 修复运算符优先级错误

### 长期规划（🟢低优先级）

1. HumanService接入真实客服系统
2. ContentFactory接入真实图片库
3. 所有mock数据添加明确标识

---

## ✅ 验证清单

修复后请验证：

- [ ] 今日成交仅统计今日（00:00-23:59）订单
- [ ] 开票统计基于真实开票状态
- [ ] 小红书预览显示"预览数据"提示
- [ ] 置信度基于数据质量而非随机
- [ ] 维修状态从真实数据获取
- [ ] 入住率计算逻辑正确（跨时间范围时）
- [ ] 除零情况下显示"--"而非NaN
- [ ] 切换酒店后所有数据正确刷新

---

## 📁 相关文件

- `/src/pages/TodayOverview.tsx`
- `/src/pages/MarketIntelligence.tsx`
- `/src/pages/OrderManagement.tsx`
- `/src/pages/FinanceCompliance.tsx`
- `/src/pages/ContentFactory.tsx`
- `/src/pages/PublishStatus.tsx`
- `/src/pages/PricingDecision.tsx`
- `/src/pages/HumanService.tsx`
- `/src/pages/InventoryAndRoomStatus.tsx`
