#!/bin/bash
# Shadow-Bees 后端服务 - 服务器端构建脚本
# 在 CentOS 7.9+ 服务器上执行，自动构建所有 Docker/Podman 镜像

set -e

echo "=========================================="
echo "Shadow-Bees V52 后端服务构建脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查容器运行时
if command -v docker &> /dev/null; then
    RUNTIME="docker"
    COMPOSE="docker-compose"
elif command -v podman &> /dev/null; then
    RUNTIME="podman"
    if command -v podman-compose &> /dev/null; then
        COMPOSE="podman-compose"
    else
        echo -e "${YELLOW}警告: 未找到 podman-compose，将使用 podman 命令直接构建${NC}"
        COMPOSE=""
    fi
else
    echo -e "${RED}错误: 未找到 Docker 或 Podman，请先安装容器运行时${NC}"
    exit 1
fi

echo -e "使用容器运行时: ${GREEN}$RUNTIME${NC}"
echo ""

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

echo "工作目录: $BACKEND_DIR"
echo ""

# ==========================================
# 构建函数
# ==========================================

build_gateway() {
    echo -e "${YELLOW}[1/7] 构建 API Gateway...${NC}"
    cd "$BACKEND_DIR/packages/gateway"
    
    # 安装依赖并构建
    npm ci
    npm run build
    
    # 构建镜像
    $RUNTIME build -t shadow-bees/gateway:v52 .
    
    echo -e "${GREEN}✓ Gateway 构建完成${NC}"
    echo ""
}

build_hotel_service() {
    echo -e "${YELLOW}[2/7] 构建 Hotel Service...${NC}"
    cd "$BACKEND_DIR/packages/services/hotel-service"
    
    # 安装依赖并构建
    npm ci
    
    # 生成 Prisma Client
    npx prisma generate --schema=../../shared/prisma/schema.prisma
    
    npm run build
    
    # 构建镜像
    $RUNTIME build -t shadow-bees/hotel-service:v52 .
    
    echo -e "${GREEN}✓ Hotel Service 构建完成${NC}"
    echo ""
}

build_order_service() {
    echo -e "${YELLOW}[3/7] 构建 Order Service...${NC}"
    cd "$BACKEND_DIR/packages/services/order-service"
    
    npm ci
    npx prisma generate --schema=../../shared/prisma/schema.prisma
    npm run build
    
    $RUNTIME build -t shadow-bees/order-service:v52 .
    
    echo -e "${GREEN}✓ Order Service 构建完成${NC}"
    echo ""
}

build_inventory_service() {
    echo -e "${YELLOW}[4/7] 构建 Inventory Service...${NC}"
    cd "$BACKEND_DIR/packages/services/inventory-service"
    
    npm ci
    npx prisma generate --schema=../../shared/prisma/schema.prisma
    npm run build
    
    $RUNTIME build -t shadow-bees/inventory-service:v52 .
    
    echo -e "${GREEN}✓ Inventory Service 构建完成${NC}"
    echo ""
}

build_pricing_service() {
    echo -e "${YELLOW}[5/7] 构建 Pricing Service...${NC}"
    cd "$BACKEND_DIR/packages/services/pricing-service"
    
    npm ci
    npx prisma generate --schema=../../shared/prisma/schema.prisma
    npm run build
    
    $RUNTIME build -t shadow-bees/pricing-service:v52 .
    
    echo -e "${GREEN}✓ Pricing Service 构建完成${NC}"
    echo ""
}

build_content_service() {
    echo -e "${YELLOW}[6/7] 构建 Content Service...${NC}"
    cd "$BACKEND_DIR/packages/services/content-service"
    
    npm ci
    npx prisma generate --schema=../../shared/prisma/schema.prisma
    npm run build
    
    $RUNTIME build -t shadow-bees/content-service:v52 .
    
    echo -e "${GREEN}✓ Content Service 构建完成${NC}"
    echo ""
}

build_ai_service() {
    echo -e "${YELLOW}[7/7] 构建 AI Service...${NC}"
    cd "$BACKEND_DIR/packages/ai-service"
    
    $RUNTIME build -t shadow-bees/ai-service:v52 .
    
    echo -e "${GREEN}✓ AI Service 构建完成${NC}"
    echo ""
}

# ==========================================
# 主流程
# ==========================================

main() {
    # 检查 Node.js 版本（如果在宿主机构建）
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}警告: 未找到 Node.js，将完全依赖容器内构建${NC}"
        echo "如果使用 Dockerfile 多阶段构建，这是正常的"
    else
        NODE_VERSION=$(node --version)
        echo "Node.js 版本: $NODE_VERSION"
    fi
    
    echo ""
    echo "开始构建所有服务..."
    echo ""
    
    # 记录开始时间
    START_TIME=$(date +%s)
    
    # 依次构建各服务
    build_gateway
    build_hotel_service
    build_order_service
    build_inventory_service
    build_pricing_service
    build_content_service
    build_ai_service
    
    # 计算耗时
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    echo "=========================================="
    echo -e "${GREEN}所有服务构建完成！${NC}"
    echo "总耗时: ${MINUTES}分${SECONDS}秒"
    echo "=========================================="
    echo ""
    
    # 显示构建的镜像
    echo "已构建的镜像:"
    $RUNTIME images | grep shadow-bees || echo "无"
    echo ""
    
    echo "下一步操作:"
    echo "1. 确认 .env 文件已正确配置"
    if [ -n "$COMPOSE" ]; then
        echo "2. 执行: $COMPOSE up -d"
    else
        echo "2. 使用 podman 命令手动启动各服务"
    fi
    echo ""
}

# 如果传入了参数，执行指定函数
if [ $# -eq 0 ]; then
    main
else
    case $1 in
        gateway)
            build_gateway
            ;;
        hotel)
            build_hotel_service
            ;;
        order)
            build_order_service
            ;;
        inventory)
            build_inventory_service
            ;;
        pricing)
            build_pricing_service
            ;;
        content)
            build_content_service
            ;;
        ai)
            build_ai_service
            ;;
        *)
            echo "未知服务: $1"
            echo "可用服务: gateway, hotel, order, inventory, pricing, content, ai"
            exit 1
            ;;
    esac
fi
