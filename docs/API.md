# Shadow-Bees API 文档

## 接口规范

### 基础信息
- **Base URL**: `http://localhost:8080/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token

### 通用响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1707820800000
}
```

### 错误码规范
| 错误码 | 说明 | 处理建议 |
|--------|------|---------|
| 200 | 成功 | - |
| 40001 | 参数错误 | 检查请求参数 |
| 40002 | 酒店不存在 | 确认酒店ID |
| 40003 | 房型不存在 | 确认房型ID |
| 40101 | 未授权 | 登录获取Token |
| 40301 | 权限不足 | 联系管理员 |
| 50001 | 数据库错误 | 联系开发 |
| 50002 | 第三方API超时 | 稍后重试 |

---

## 酒店相关

### 1. 获取酒店列表
```http
GET /hotels
```

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "sanlitun",
      "name": "三里屯潮流酒店",
      "type": "city",
      "tier": "comfort",
      "theme": "cyan",
      "city": "北京"
    }
  ]
}
```

---

## 订单相关

### 1. 获取订单列表
```http
GET /orders?hotelId={hotelId}&status={status}&page=1&size=20
```

### 2. 创建订单
```http
POST /orders
```

**请求体**:
```json
{
  "hotelId": "sanlitun",
  "roomTypeId": "standard-room",
  "platform": "xianyu",
  "customerName": "张三",
  "checkInDate": "2024-03-01",
  "checkOutDate": "2024-03-02",
  "price": 350
}
```
