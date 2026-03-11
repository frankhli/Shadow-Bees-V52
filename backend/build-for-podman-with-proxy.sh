#!/bin/bash
# Shadow-Bees 后端服务镜像构建脚本 (带代理支持)

set -e

echo "=========================================="
echo "Shadow-Bees 后端镜像构建脚本 (Podman 兼容)"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 镜像配置
IMAGE_PREFIX="shadow-bees"
VERSION="v52"
OUTPUT_DIR="/Users/frank/Desktop/shadow-bees-separate-images"

# 代理设置 - 使用主机 IP
PROXY_URL="http://host.docker.internal:9674"

# 确保输出目录存在
mkdir -p "${OUTPUT_DIR}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

# 主目录
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -e "${BLUE}工作目录: ${BASE_DIR}${NC}"
echo -e "${BLUE}输出目录: ${OUTPUT_DIR}${NC}"
echo -e "${BLUE}代理: ${PROXY_URL}${NC}"
echo ""

# 构建函数
build_image() {
    local service_name=$1
    local service_path=$2
    local dockerfile=$3
    
    echo -e "${YELLOW}==========================================${NC}"
    echo -e "${YELLOW}开始构建: ${service_name}${NC}"
    echo -e "${YELLOW}==========================================${NC}"
    
    cd "${service_path}"
    
    local full_image_name="${IMAGE_PREFIX}/${service_name}:${VERSION}"
    
    echo -e "${BLUE}镜像名称: ${full_image_name}${NC}"
    
    # 使用 build-arg 传递代理
    if docker build \
        --build-arg HTTP_PROXY="${PROXY_URL}" \
        --build-arg HTTPS_PROXY="${PROXY_URL}" \
        --build-arg http_proxy="${PROXY_URL}" \
        --build-arg https_proxy="${PROXY_URL}" \
        -f "${dockerfile}" \
        -t "${full_image_name}" \
        .; then
        
        echo -e "${GREEN}✓ ${service_name} 构建成功${NC}"
        
        # 保存为 tar 文件
        local tar_file="${OUTPUT_DIR}/${IMAGE_PREFIX}-${service_name}-${VERSION}.tar"
        echo -e "${BLUE}正在保存镜像到: ${tar_file}${NC}"
        
        if docker save "${full_image_name}" -o "${tar_file}"; then
            echo -e "${GREEN}✓ ${service_name} 镜像保存成功${NC}"
            local file_size=$(du -h "${tar_file}" | cut -f1)
            echo -e "${BLUE}  文件大小: ${file_size}${NC}"
        else
            echo -e "${RED}✗ ${service_name} 镜像保存失败${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ ${service_name} 构建失败${NC}"
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

START_TIME=$(date +%s)

# 构建所有服务
echo -e "${YELLOW}开始构建所有服务...${NC}"
echo ""

build_image "gateway" "${BASE_DIR}/packages/gateway" "Dockerfile"
build_image "hotel-service" "${BASE_DIR}/packages/services/hotel-service" "Dockerfile"
build_image "order-service" "${BASE_DIR}/packages/services/order-service" "Dockerfile"
build_image "inventory-service" "${BASE_DIR}/packages/services/inventory-service" "Dockerfile"
build_image "pricing-service" "${BASE_DIR}/packages/services/pricing-service" "Dockerfile"
build_image "content-service" "${BASE_DIR}/packages/services/content-service" "Dockerfile"
build_image "ai-service" "${BASE_DIR}/packages/ai-service" "Dockerfile"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}所有镜像构建完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${BLUE}总耗时: ${MINUTES}分 ${SECONDS}秒${NC}"
echo ""
echo -e "${YELLOW}输出目录: ${OUTPUT_DIR}${NC}"
echo ""
echo -e "${BLUE}生成的镜像文件:${NC}"
ls -lh "${OUTPUT_DIR}"

# 生成 Podman 加载脚本
cat > "${OUTPUT_DIR}/load-images-podman.sh" << 'EOF'
#!/bin/bash
# Podman 镜像加载脚本
set -e

echo "=========================================="
echo "Shadow-Bees 镜像加载脚本 (Podman)"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v podman &> /dev/null; then
    echo -e "${RED}错误: Podman 未安装${NC}"
    exit 1
fi

echo -e "${BLUE}Podman 版本: $(podman --version)${NC}"
echo ""

for tar_file in shadow-bees-*.tar; do
    if [ -f "$tar_file" ]; then
        echo -e "${YELLOW}加载: $tar_file${NC}"
        if podman load -i "$tar_file"; then
            echo -e "${GREEN}✓ 加载成功${NC}"
        else
            echo -e "${RED}✗ 加载失败${NC}"
        fi
        echo ""
    fi
done

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}所有镜像加载完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
podman images | grep shadow-bees
EOF

chmod +x "${OUTPUT_DIR}/load-images-podman.sh"
echo ""
echo -e "${GREEN}已生成 Podman 加载脚本: load-images-podman.sh${NC}"
