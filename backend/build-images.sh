#!/bin/bash
# Shadow-Bees 后端服务镜像构建脚本
# 用于修复 CentOS 7.9 兼容性问题

set -e

echo "=========================================="
echo "Shadow-Bees 后端镜像构建脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 镜像前缀
IMAGE_PREFIX="shadow-bees"
VERSION="latest"

# 构建函数
build_image() {
    local service_name=$1
    local service_path=$2
    local dockerfile=$3
    
    echo -e "${YELLOW}构建 ${service_name}...${NC}"
    cd "${service_path}"
    
    if docker build -f "${dockerfile}" -t "${IMAGE_PREFIX}-${service_name}:${VERSION}" .; then
        echo -e "${GREEN}✓ ${service_name} 构建成功${NC}"
    else
        echo -e "${RED}✗ ${service_name} 构建失败${NC}"
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

# 保存镜像函数
save_image() {
    local service_name=$1
    local output_file=$2
    
    echo -e "${YELLOW}保存 ${service_name} 镜像到 ${output_file}...${NC}"
    if docker save "${IMAGE_PREFIX}-${service_name}:${VERSION}" -o "${output_file}"; then
        echo -e "${GREEN}✓ ${service_name} 保存成功${NC}"
    else
        echo -e "${RED}✗ ${service_name} 保存失败${NC}"
        exit 1
    fi
}

# 主目录
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "工作目录: ${BASE_DIR}"
echo ""

# 构建所有服务
echo "=========================================="
echo "开始构建服务..."
echo "=========================================="
echo ""

# 1. Gateway
build_image "gateway" "${BASE_DIR}/packages/gateway" "Dockerfile"

# 2. Hotel Service
build_image "hotel-service" "${BASE_DIR}/packages/services/hotel-service" "Dockerfile"

# 3. Order Service
build_image "order-service" "${BASE_DIR}/packages/services/order-service" "Dockerfile"

# 4. Inventory Service
build_image "inventory-service" "${BASE_DIR}/packages/services/inventory-service" "Dockerfile"

# 5. Pricing Service
build_image "pricing-service" "${BASE_DIR}/packages/services/pricing-service" "Dockerfile"

# 6. Content Service
build_image "content-service" "${BASE_DIR}/packages/services/content-service" "Dockerfile"

# 7. AI Service
build_image "ai-service" "${BASE_DIR}/packages/ai-service" "Dockerfile"

echo ""
echo "=========================================="
echo -e "${GREEN}所有镜像构建完成！${NC}"
echo "=========================================="
echo ""

# 询问是否保存镜像
read -p "是否将镜像保存为 tar 文件? (y/n): " save_confirm
if [[ $save_confirm == "y" || $save_confirm == "Y" ]]; then
    
    # 创建输出目录
    OUTPUT_DIR="${BASE_DIR}/dist"
    mkdir -p "${OUTPUT_DIR}"
    
    echo ""
    echo "=========================================="
    echo "开始保存镜像..."
    echo "=========================================="
    echo ""
    
    save_image "gateway" "${OUTPUT_DIR}/${IMAGE_PREFIX}-gateway.tar"
    save_image "hotel-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-hotel-service.tar"
    save_image "order-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-order-service.tar"
    save_image "inventory-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-inventory-service.tar"
    save_image "pricing-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-pricing-service.tar"
    save_image "content-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-content-service.tar"
    save_image "ai-service" "${OUTPUT_DIR}/${IMAGE_PREFIX}-ai-service.tar"
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}所有镜像已保存到 ${OUTPUT_DIR}${NC}"
    echo "=========================================="
    echo ""
    ls -lh "${OUTPUT_DIR}"
fi

echo ""
echo "完成！"
