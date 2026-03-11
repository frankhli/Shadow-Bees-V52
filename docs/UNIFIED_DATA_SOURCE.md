# Shadow-Bees V52 - 统一数据源说明

## 概述

管理端 (admin) 和集团端 (group) 现在使用统一的数据源，确保两端数据一致性。

## 统一前 vs 统一后

### 统一前
| 端 | 集团名称 | 门店数量 | 数据来源 |
|---|---|---|---|
| admin | XYZ酒店集团 | 3家 | `adminStore.ts` 内的 `mockHotelsGroup` |
| group | 希遇酒店集团 | 10家 | `groupStore.ts` 内的 `baseHotels` |

### 统一后
| 端 | 集团名称 | 门店数量 | 数据来源 |
|---|---|---|---|
| admin | 希遇酒店集团 | 10家 | `shared/groupData.ts` |
| group | 希遇酒店集团 | 10家 | `shared/groupData.ts` |

## 文件结构

```
src/
├── shared/
│   └── groupData.ts          # 统一数据源
├── admin/
│   └── stores/
│       └── adminStore.ts     # 从 shared 导入
└── group/
    └── stores/
        ├── groupStore.ts     # 从 shared 导入
        └── mockData.ts       # 从 shared 导入
```

## 共享数据结构

### Group (集团基础信息)
```typescript
{
  id: 'group_001',
  name: '希遇酒店集团',
  hotelCount: 10,
  regionCount: 4,
}
```

### SharedHotel (门店数据)
```typescript
{
  id: 'hotel_001',
  name: '北京三里屯店',
  region: '华北区',
  brand: '希遇精选',
  manager: '李明',
  roomCount: 45,
  status: 'active',
  gmv: 520000,
  revpar: 420,
  occupancy: 88,
  // ... 其他字段
}
```

### Regions (区域数据)
```typescript
[
  { id: 'region_001', name: '华北区', manager: '张伟', hotelCount: 3, ... },
  { id: 'region_002', name: '华东区', manager: '赵敏', hotelCount: 3, ... },
  { id: 'region_003', name: '华南区', manager: '李强', hotelCount: 2, ... },
  { id: 'region_004', name: '华西区', manager: '王磊', hotelCount: 2, ... },
]
```

## 门店列表 (10家)

| ID | 名称 | 区域 | 品牌 | 经理 | 房量 | 状态 |
|---|---|---|---|---|---|---|
| hotel_001 | 北京三里屯店 | 华北区 | 希遇精选 | 李明 | 45 | active |
| hotel_002 | 北京望京科技店 | 华北区 | 希遇商务 | 王芳 | 60 | active |
| hotel_003 | 北京崇礼滑雪店 | 华北区 | 希遇度假 | 张伟 | 35 | warning |
| hotel_004 | 上海外滩店 | 华东区 | 希遇精选 | 陈静 | 55 | active |
| hotel_005 | 杭州西湖店 | 华东区 | 希遇精选 | 林娜 | 40 | active |
| hotel_006 | 苏州园林店 | 华东区 | 希遇文化 | 周文 | 30 | active |
| hotel_007 | 深圳湾店 | 华南区 | 希遇商务 | 黄强 | 50 | active |
| hotel_008 | 广州天河店 | 华南区 | 希遇商务 | 吴丽 | 45 | warning |
| hotel_009 | 成都春熙路店 | 华西区 | 希遇精选 | 郑华 | 42 | active |
| hotel_010 | 西安古城墙店 | 华西区 | 希遇文化 | 马超 | 38 | inactive |

## 使用方式

### 管理端导入
```typescript
import {
  sharedGroup,
  sharedRegions,
  sharedHotels,
  sharedStrategyRules,
  sharedCustomerProfile,
  type SharedHotel,
} from '@/shared/groupData';
```

### 集团端导入
```typescript
import { sharedHotels } from '@/shared/groupData';
```

### 数据转换
管理端需要将 `SharedHotel` 转换为 `HotelData`：
```typescript
function convertSharedHotelToHotelData(shared: SharedHotel): HotelData {
  return {
    id: shared.id,
    name: shared.name,
    // ... 字段映射
  };
}
```

## 数据关联

### 客户与集团关联
```typescript
// CUST-G001 使用共享集团数据
{
  id: 'CUST-G001',
  type: 'group',
  companyName: sharedGroup.name,  // '希遇酒店集团'
  hotels: mockHotelsGroup,         // 10家门店
  groupProfile: {
    groupId: sharedGroup.id,       // 'group_001'
    regions: sharedRegions,        // 4个区域
    strategyRules: sharedStrategyRules,
    ...
  }
}
```

### 工单与门店关联
```typescript
{
  id: 'TKT-G001',
  hotelId: sharedHotels[4].id,      // 'hotel_005'
  hotelName: sharedHotels[4].name,  // '杭州西湖店'
  affectedHotelIds: sharedHotels.slice(0, 3).map(h => h.id),
  ...
}
```

## 注意事项

1. **数据来源单一**: 所有集团相关数据现在都来自 `shared/groupData.ts`
2. **实时同步**: 结合 BroadcastChannel，两端数据变更可以实时同步
3. **未来扩展**: 当接入后端 API 时，只需替换 `shared/groupData.ts` 中的数据获取逻辑

## 备份信息

修改前备份: `backups/admin_20260219_104650/`
