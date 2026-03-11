#!/bin/bash
# Shadow-Bees 后端服务镜像构建脚本 (自动重试版)

set -e

echo "=========================================="
echo "Shadow-Bees 后端镜像构建脚本 (自动重试)"
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
MAX_RETRIES=10
RETRY_DELAY=10

mkdir -p "${OUTPUT_DIR}"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -e "${BLUE}工作目录: ${BASE_DIR}${NC}"
echo -e "${BLUE}输出目录: ${OUTPUT_DIR}${NC}"
echo -e "${YELLOW}最大重试次数: ${MAX_RETRIES}${NC}"
echo ""

# 构建函数（带重试）
build_with_retry() {
    local service_name=$1
    local service_path=$2
    local dockerfile=$3
    local full_image_name="${IMAGE_PREFIX}/${service_name}:${VERSION}"
    local attempt=1
    
    echo -e "${YELLOW}==========================================${NC}"
    echo -e "${YELLOW}开始构建: ${service_name}${NC}"
    echo -e "${YELLOW}==========================================${NC}"
    
    cd "${service_path}"
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo ""
        echo -e "${BLUE}第 ${attempt}/${MAX_RETRIES} 次尝试...${NC}"
        
        if docker build -f "${dockerfile}" -t "${full_image_name}" . 2>&1; then
            echo ""
            echo -e "${GREEN}✓ ${service_name} 构建成功${NC}"
            
            # 保存为 tar 文件
            local tar_file="${OUTPUT_DIR}/${IMAGE_PREFIX}-${service_name}-${VERSION}.tar"
            echo -e "${BLUE}正在保存镜像到: ${tar_file}${NC}"
            
            if docker save "${full_image_name}" -o "${tar_file}"; then
                local file_size=$(du -h "${tar_file}" | cut -f1)
                echo -e "${GREEN}✓ ${service_name} 镜像保存成功 (${file_size})${NC}"
                cd - > /dev/null
                return 0
            else
                echo -e "${RED}✗ 保存失败${NC}"
                cd - > /dev/null
                return 1
            fi
        else
            echo -e "${RED}✗ 第 ${attempt} 次构建失败${NC}"
            if [ $attempt -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}等待 ${RETRY_DELAY} 秒后重试...${NC}"
                sleep $RETRY_DELAY
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}${service_name} 构建失败，已达最大重试次数${NC}"
    echo -e "${RED}==========================================${NC}"
    cd - > /dev/null
    return 1
}

START_TIME=$(date +%s)
FAILED_SERVICES=()

# 需要构建的服务
services=(
    "hotel-service:${BASE_DIR}/packages/services/hotel-service:Dockerfile"
    "order-service:${BASE_DIR}/packages/services/order-service:Dockerfile"
    "inventory-service:${BASE_DIR}/packages/services/inventory-service:Dockerfile"
    "pricing-service:${BASE_DIR}/packages/services/pricing-service:Dockerfile"
    "content-service:${BASE_DIR}/packages/services/content-service:Dockerfile"
    "ai-service:${BASE_DIR}/packages/ai-service:Dockerfile"
)

# gateway 已经构建成功，跳过
if docker inspect "${IMAGE_PREFIX}/gateway:${VERSION}" &>/dev/null; then
    echo -e "${GREEN}gateway:v52 已存在，跳过构建${NC}"
    # 保存 gateway
    if [ ! -f "${OUTPUT_DIR}/${IMAGE_PREFIX}-gateway-${VERSION}.tar" ]; then
        docker save "${IMAGE_PREFIX}/gateway:${VERSION}" -o "${OUTPUT_DIR}/${IMAGE_PREFIX}-gateway-${VERSION}.tar"
        echo -e "${GREEN}✓ gateway 已导出${NC}"
    fi
else
    services+=("gateway:${BASE_DIR}/packages/gateway:Dockerfile")
fi

echo -e "${YELLOW}共需构建 ${#services[@]} 个服务${NC}"
echo ""

# 构建每个服务
for service_info in "${services[@]}"; do
    IFS=':' read -r name path dockerfile <<< "$service_info"
    
    if ! build_with_retry "$name" "$path" "$dockerfile"; then
        FAILED_SERVICES+=("$name")
    fi
    echo ""
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}构建流程完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${BLUE}总耗时: ${MINUTES}分 ${SECONDS}秒${NC}"
echo ""

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}所有服务构建成功！${NC}"
else
    echo -e "${RED}以下服务构建失败:${NC}"
    for svc in "${FAILED_SERVICES[@]}"; do
        echo -e "${RED}  - $svc${NC}"
    done
fi

echo ""
echo -e "${YELLOW}输出目录: ${OUTPUT_DIR}${NC}"
echo ""
echo -e "${BLUE}生成的镜像文件:${NC}"
ls -lh "${OUTPUT_DIR}"

# 生成 Podman 加载脚本
cat > "${OUTPUT_DIR}/load-images-podman.sh" << 'EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "Shadow-Bees 镜像加载脚本 (Podman)"
echo "=========================================="
echo ""

for tar_file in shadow-bees-*.tar; do
    if [ -f "$tar_file" ]; then
        echo "加载: $tar_file"
        podman load -i "$tar_file" && echo "  ✓ 成功" || echo "  ✗ 失败"
    fi
done

echo ""
echo "已加载的镜像:"
podman images | grep shadow-bees || echo "无"
EOF

chmod +x "${OUTPUT_DIR}/load-images-podman.sh"
echo ""
echo -e "${GREEN}已生成加载脚本: load-images-podman.sh${NC}"
