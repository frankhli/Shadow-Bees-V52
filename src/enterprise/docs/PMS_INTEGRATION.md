# PMS 集成指南

## 概述

本文档说明如何将 Shadow-Bees 企业版集成到华美会 PMS 系统中。

## 集成方式

Shadow-Bees 企业版通过 **iframe 嵌入** + **postMessage 通信** 与 PMS 系统集成。

## 快速开始

### 1. 在 PMS 中嵌入 Shadow-Bees

```html
<iframe 
  id="shadowBeesFrame"
  src="https://shadowbees.yourdomain.com/enterprise"
  style="width: 100%; border: none; min-height: 600px;"
/>
```

### 2. PMS 初始化代码

```javascript
// 等待 iframe 加载完成
document.getElementById('shadowBeesFrame').onload = function() {
  const frame = this;
  
  // 1. 发送 PMS 配置
  frame.contentWindow.postMessage({
    type: 'PMS_CONFIG',
    payload: {
      apiUrl: 'https://pms.huameihuihotel.com/api',
      apiKey: 'your_api_key',
      features: ['pricing', 'inventory', 'orders']
    }
  }, '*');
  
  // 2. 发送 SSO token
  frame.contentWindow.postMessage({
    type: 'PMS_LOGIN_TOKEN',
    payload: {
      token: 'jwt_token_from_pms',
      userInfo: {
        id: 'user_001',
        name: '管理员',
        role: 'group_admin',
        hotelIds: ['all']
      }
    }
  }, '*');
};
```

### 3. 接收 Shadow-Bees 消息

```javascript
window.addEventListener('message', (event) => {
  if (!event.data?.source === 'shadow-bees-enterprise') return;
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SHADOW_BEES_READY':
      console.log('Shadow-Bees 加载完成');
      break;
    case 'SHADOW_BEES_RESIZE':
      document.getElementById('shadowBeesFrame').style.height = payload.height + 'px';
      break;
  }
});
```

## 消息协议

### PMS → Shadow-Bees

| 消息类型 | 说明 | payload |
|---------|------|---------|
| `PMS_CONFIG` | 发送 PMS 配置 | `{ apiUrl, apiKey, features }` |
| `PMS_LOGIN_TOKEN` | SSO 登录 | `{ token, userInfo }` |
| `PMS_NAVIGATE` | 导航指令 | `{ path }` |
| `PMS_HOTEL_SWITCH` | 切换酒店 | `{ hotelId }` |

### Shadow-Bees → PMS

| 消息类型 | 说明 | payload |
|---------|------|---------|
| `SHADOW_BEES_READY` | 加载完成 | - |
| `SHADOW_BEES_RESIZE` | 高度变化 | `{ height }` |
| `SHADOW_BEES_NAVIGATE` | 页面跳转 | `{ path }` |

## 构建测试

```bash
npm run build
```

构建成功后，访问 `http://localhost:5173/enterprise` 测试。
