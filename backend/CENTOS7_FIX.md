# CentOS 7.9 兼容性修复说明

## 问题描述

在 CentOS 7.9 服务器上运行后端镜像时报错：
```
缺少 OpenSSL 库 (libssl.so / libcrypto.so)
```

## 根本原因

1. **Prisma 需要 OpenSSL** - Prisma ORM 在运行时需要 OpenSSL 库
2. **多阶段构建问题** - 原 Dockerfile 在构建阶段安装了依赖，但在生产镜像中没有正确包含 Prisma Client 和 OpenSSL
3. **Prisma Client 生成** - Prisma Client 需要在构建时针对目标平台生成

## 修复内容

### 1. 所有 Node.js 服务的 Dockerfile 修改

**网关 (Gateway) - 端口 3000**
- 添加 OpenSSL 安装
- 添加 ca-certificates（用于 HTTPS）

**各业务服务 (Hotel/Order/Inventory/Pricing/Content Service)**
- 添加 OpenSSL 安装
- 添加 ca-certificates
- 复制 Prisma schema 文件
- 在构建阶段运行 `prisma generate`
- 在生产镜像中保留 prisma 目录

**AI 服务 (Python)**
- 添加 OpenSSL 安装
- 添加必要的编译工具（gcc, python3-dev）

### 2. 关键修改点

```dockerfile
# 安装 OpenSSL（构建阶段和运行阶段都需要）
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制并生成 Prisma Client
COPY ../../shared/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma
```

## 重新构建步骤

### 方法一：使用构建脚本（推荐）

```bash
cd /Users/frank/Desktop/shadow-bees-v52/backend
./build-images.sh
```

脚本会自动：
1. 构建所有 7 个服务镜像
2. 询问是否保存为 tar 文件
3. 保存到 `dist/` 目录

### 方法二：手动构建单个服务

```bash
cd /Users/frank/Desktop/shadow-bees-v52/backend

# Gateway
cd packages/gateway
docker build -t shadow-bees-gateway:latest .

# Hotel Service  
cd ../services/hotel-service
docker build -t shadow-bees-hotel-service:latest .

# 其他服务类似...
```

### 方法三：保存为单独 tar 文件（用于传输）

```bash
# 创建输出目录
mkdir -p dist

# 保存各服务镜像
docker save shadow-bees-gateway:latest -o dist/shadow-bees-gateway.tar
docker save shadow-bees-hotel-service:latest -o dist/shadow-bees-hotel-service.tar
docker save shadow-bees-order-service:latest -o dist/shadow-bees-order-service.tar
docker save shadow-bees-inventory-service:latest -o dist/shadow-bees-inventory-service.tar
docker save shadow-bees-pricing-service:latest -o dist/shadow-bees-pricing-service.tar
docker save shadow-bees-content-service:latest -o dist/shadow-bees-content-service.tar
docker save shadow-bees-ai-service:latest -o dist/shadow-bees-ai-service.tar

# 查看文件
ls -lh dist/
```

## 部署到 CentOS 7.9

### 1. 上传镜像到服务器

```bash
# 在 Mac 上打包
tar czvf shadow-bees-images.tar.gz dist/*.tar

# 上传到 CentOS 服务器
scp shadow-bees-images.tar.gz user@centos-server:/opt/shadow-bees/
```

### 2. 在 CentOS 服务器上导入

```bash
ssh user@centos-server
cd /opt/shadow-bees
tar xzvf shadow-bees-images.tar.gz

# 使用 Docker 导入
cd dist
docker load -i shadow-bees-gateway.tar
docker load -i shadow-bees-hotel-service.tar
docker load -i shadow-bees-order-service.tar
docker load -i shadow-bees-inventory-service.tar
docker load -i shadow-bees-pricing-service.tar
docker load -i shadow-bees-content-service.tar
docker load -i shadow-bees-ai-service.tar

# 或使用 Podman 导入
podman load -i shadow-bees-gateway.tar
# ... 其他类似
```

### 3. 启动服务

```bash
# Docker
docker-compose -f docker-compose.prod.yml up -d

# Podman
podman-compose -f docker-compose.prod.yml up -d
```

## 验证修复

```bash
# 检查容器日志
docker logs sb-gateway
docker logs sb-hotel-service

# 测试健康检查接口
curl http://localhost:3000/api/health
curl http://localhost:3001/health
```

## 注意事项

1. **镜像体积增加** - 由于安装了 OpenSSL，镜像体积会增加约 50-100MB
2. **构建时间** - 首次构建需要下载基础镜像和安装依赖，时间较长
3. **Prisma 引擎** - schema.prisma 已配置 `binaryTargets = ["native", "debian-openssl-3.0.x"]`，确保使用正确的引擎

## 问题排查

如果仍然报错：

```bash
# 进入容器检查 OpenSSL
docker exec -it sb-gateway sh
openssl version

# 检查 Prisma 引擎文件
ls -la node_modules/.prisma/client/

# 查看动态库依赖
ldd node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
```
