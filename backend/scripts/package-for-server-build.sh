#!/bin/bash
# 打包后端源码，用于在服务器上构建

set -e

echo "=========================================="
echo "Shadow-Bees V52 后端源码打包脚本"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

cd "$PROJECT_ROOT"

# 创建输出目录
OUTPUT_DIR="$PROJECT_ROOT/dist"
mkdir -p "$OUTPUT_DIR"

# 版本号
VERSION="v52"
OUTPUT_FILE="shadow-bees-backend-src-${VERSION}.tar.gz"

echo "打包内容:"
echo "  - backend/packages/gateway/"
echo "  - backend/packages/ai-service/"
echo "  - backend/packages/services/"
echo "  - backend/shared/"
echo "  - backend/scripts/build-on-server.sh"
echo "  - backend/docker-compose.yml"
echo "  - backend/.env.example"
echo ""

# 创建临时目录
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# 复制文件
mkdir -p "$TMP_DIR/shadow-bees-v52/backend"

# 复制主要目录（排除 node_modules）
echo "  - 复制 packages (排除 node_modules)..."
mkdir -p "$TMP_DIR/shadow-bees-v52/backend/packages"

# 复制 gateway
cp -r "$BACKEND_DIR/packages/gateway" "$TMP_DIR/shadow-bees-v52/backend/packages/"
rm -rf "$TMP_DIR/shadow-bees-v52/backend/packages/gateway/node_modules"
rm -rf "$TMP_DIR/shadow-bees-v52/backend/packages/gateway/dist"

# 复制 ai-service
cp -r "$BACKEND_DIR/packages/ai-service" "$TMP_DIR/shadow-bees-v52/backend/packages/"

# 复制 services
mkdir -p "$TMP_DIR/shadow-bees-v52/backend/packages/services"
for service in hotel-service order-service inventory-service pricing-service content-service; do
    if [ -d "$BACKEND_DIR/packages/services/$service" ]; then
        cp -r "$BACKEND_DIR/packages/services/$service" "$TMP_DIR/shadow-bees-v52/backend/packages/services/"
        rm -rf "$TMP_DIR/shadow-bees-v52/backend/packages/services/$service/node_modules"
        rm -rf "$TMP_DIR/shadow-bees-v52/backend/packages/services/$service/dist"
    fi
done

# 复制 shared
cp -r "$BACKEND_DIR/packages/shared" "$TMP_DIR/shadow-bees-v52/backend/packages/"
rm -rf "$TMP_DIR/shadow-bees-v52/backend/packages/shared/node_modules"
cp -r "$BACKEND_DIR/scripts" "$TMP_DIR/shadow-bees-v52/backend/"

# 复制配置文件
cp "$BACKEND_DIR/docker-compose.yml" "$TMP_DIR/shadow-bees-v52/backend/" 2>/dev/null || true
cp "$BACKEND_DIR/.env.example" "$TMP_DIR/shadow-bees-v52/backend/" 2>/dev/null || true
cp "$BACKEND_DIR/.env.production" "$TMP_DIR/shadow-bees-v52/backend/" 2>/dev/null || true

# 创建部署说明
cat > "$TMP_DIR/shadow-bees-v52/部署说明.md" << 'EOF'
# Shadow-Bees V52 后端服务部署说明

## 📦 文件清单

```
shadow-bees-v52/
└── backend/
    ├── packages/
    │   ├── gateway/              # API 网关 (Node.js/NestJS)
    │   ├── ai-service/           # AI 服务 (Python/FastAPI)
    │   └── services/
    │       ├── hotel-service/    # 酒店服务
    │       ├── order-service/    # 订单服务
    │       ├── inventory-service/# 库存服务
    │       ├── pricing-service/  # 定价服务
    │       └── content-service/  # 内容服务
    ├── shared/                   # 共享代码 (Prisma Schema)
    ├── scripts/
    │   └── build-on-server.sh    # 服务器端构建脚本
    ├── docker-compose.yml        # 部署配置
    └── .env.example              # 环境变量模板
```

## 🚀 快速开始

### 1. 环境要求

- **操作系统**: CentOS 7.9+
- **容器运行时**: Docker 或 Podman
- **内存**: 建议 4GB+
- **磁盘**: 至少 20GB 可用空间
- **网络**: 能访问 npm registry 和 PyPI

### 2. 配置环境变量

```bash
cd shadow-bees-v52/backend
cp .env.example .env
vim .env  # 编辑配置
```

关键配置项：
```bash
# 数据库
DATABASE_URL="postgresql://用户名:密码@localhost:5432/shadow_bees"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
```

### 3. 执行构建

```bash
chmod +x scripts/build-on-server.sh
./scripts/build-on-server.sh
```

构建过程约 15-30 分钟，取决于服务器性能和网络。

### 4. 启动服务

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 Podman
podman-compose up -d
```

### 5. 验证部署

```bash
# 检查所有服务健康状态
curl http://localhost:3000/api/health  # Gateway
curl http://localhost:3001/api/health  # Hotel Service
curl http://localhost:3002/api/health  # Order Service
curl http://localhost:3003/api/health  # Inventory Service
curl http://localhost:3004/api/health  # Pricing Service
curl http://localhost:3005/api/health  # Content Service
curl http://localhost:5000/health      # AI Service
```

## 🔧 单独构建某个服务

```bash
# 只构建 Gateway
./scripts/build-on-server.sh gateway

# 只构建 Hotel Service
./scripts/build-on-server.sh hotel

# 可用服务: gateway, hotel, order, inventory, pricing, content, ai
```

## 📝 注意事项

1. **首次构建较慢**：需要下载基础镜像和依赖包
2. **网络问题**：如果 npm/pip 下载慢，可配置国内镜像源
3. **磁盘空间**：构建过程中会生成大量临时文件，确保有足够空间
4. **Prisma**：各服务共享同一个 schema.prisma，位于 `backend/shared/prisma/`

## 🐛 常见问题

### 1. 构建失败：找不到 prisma schema

确保 `backend/shared/prisma/schema.prisma` 存在。

### 2. 端口冲突

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "3001:3001"  # 改为 "30001:3001" 等
```

### 3. 数据库连接失败

检查 `.env` 中的 `DATABASE_URL` 是否正确，以及数据库是否允许容器访问。
EOF

# 打包
echo "正在打包..."
cd "$TMP_DIR"
tar czvf "$OUTPUT_DIR/$OUTPUT_FILE" shadow-bees-v52/

echo ""
echo "=========================================="
echo "打包完成！"
echo "=========================================="
echo ""
echo "输出文件: $OUTPUT_DIR/$OUTPUT_FILE"
echo "文件大小: $(ls -lh "$OUTPUT_DIR/$OUTPUT_FILE" | awk '{print $5}')"
echo ""
echo "使用方法:"
echo "1. 将文件上传到服务器:"
echo "   scp $OUTPUT_DIR/$OUTPUT_FILE user@server:/opt/"
echo ""
echo "2. 在服务器上解压并部署:"
echo "   cd /opt && tar xzvf $OUTPUT_FILE"
echo "   cd shadow-bees-v52/backend"
echo "   ./scripts/build-on-server.sh"
echo ""
