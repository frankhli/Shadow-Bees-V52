#!/bin/bash
# Shadow-Bees 后端服务镜像构建脚本

set -e

echo "=========================================="
echo "Shadow-Bees 后端镜像构建脚本"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

IMAGE_PREFIX="shadow-bees"
VERSION="v52"
OUTPUT_DIR="/Users/frank/Desktop/shadow-bees-separate-images"

mkdir -p "${OUTPUT_DIR}"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -e "${BLUE}工作目录: ${BASE_DIR}${NC}"
echo -e "${BLUE}输出目录: ${OUTPUT_DIR}${NC}"
echo ""

# 构建单个服务
build_service() {
    local service_name=$1
    local service_path=$2
    local has_prisma=$3
    local full_image_name="${IMAGE_PREFIX}/${service_name}:${VERSION}"
    
    echo -e "${YELLOW}==========================================${NC}"
    echo -e "${YELLOW}构建: ${service_name}${NC}"
    echo -e "${YELLOW}==========================================${NC}"
    
    cd "${service_path}"
    
    # 如果需要 prisma，先复制
    if [ "$has_prisma" = "true" ]; then
        echo "复制 prisma schema..."
        cp -r "${BASE_DIR}/packages/shared/prisma" ./prisma 2>/dev/null || true
    fi
    
    # 构建镜像
    if docker build -f Dockerfile -t "${full_image_name}" .; then
        echo -e "${GREEN}✓ ${service_name} 构建成功${NC}"
        
        # 保存镜像
        local tar_file="${OUTPUT_DIR}/${IMAGE_PREFIX}-${service_name}-${VERSION}.tar"
        docker save "${full_image_name}" -o "${tar_file}"
        local file_size=$(du -h "${tar_file}" | cut -f1)
        echo -e "${GREEN}✓ 已保存 (${file_size})${NC}"
        
        # 清理复制的 prisma
        if [ "$has_prisma" = "true" ]; then
            rm -rf ./prisma 2>/dev/null || true
        fi
        
        cd - > /dev/null
        return 0
    else
        echo -e "${RED}✗ ${service_name} 构建失败${NC}"
        cd - > /dev/null
        return 1
    fi
}

START_TIME=$(date +%s)

# 1. Gateway (无 prisma)
build_service "gateway" "${BASE_DIR}/packages/gateway" "false"

# 2. Hotel Service (有 prisma)
build_service "hotel-service" "${BASE_DIR}/packages/services/hotel-service" "true"

# 3. Order Service (有 prisma)
build_service "order-service" "${BASE_DIR}/packages/services/order-service" "true"

# 4. Inventory Service (有 prisma)
build_service "inventory-service" "${BASE_DIR}/packages/services/inventory-service" "true"

# 5. Pricing Service (有 prisma)
build_service "pricing-service" "${BASE_DIR}/packages/services/pricing-service" "true"

# 6. Content Service (有 prisma)
build_service "content-service" "${BASE_DIR}/packages/services/content-service" "true"

# 7. AI Service (无 prisma)
build_service "ai-service" "${BASE_DIR}/packages/ai-service" "false"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}构建完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${BLUE}总耗时: ${ELAPSED}秒${NC}"
echo ""
ls -lh "${OUTPUT_DIR}"

# 生成 Podman 加载脚本
cat > "${OUTPUT_DIR}/load-images-podman.sh" << 'EOF'
#!/bin/bash
set -e
echo "Shadow-Bees 镜像加载脚本 (Podman)"
echo ""
for tar_file in shadow-bees-*.tar; do
    [ -f "$tar_file" ] && podman load -i "$tar_file" && echo "✓ $tar_file"
done
echo ""
echo "已加载的镜像:"
podman images | grep shadow-bees
EOF
chmod +x "${OUTPUT_DIR}/load-images-podman.sh"
