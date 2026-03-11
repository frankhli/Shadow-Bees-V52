#!/bin/bash
# Shadow-Bees 后端服务镜像构建脚本 (适配 Podman)
# 每个服务单独打包成一个 tar 文件，方便 Podman 加载

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
NC='\033[0m' # No Color

# 镜像配置
IMAGE_PREFIX="shadow-bees"
VERSION="v52"
OUTPUT_DIR="/Users/frank/Desktop/shadow-bees-separate-images"

# 确保输出目录存在
mkdir -p "${OUTPUT_DIR}"

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装或未在 PATH 中${NC}"
    exit 1
fi

# 主目录
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -e "${BLUE}工作目录: ${BASE_DIR}${NC}"
echo -e "${BLUE}输出目录: ${OUTPUT_DIR}${NC}"
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
    echo -e "${BLUE}Dockerfile: ${dockerfile}${NC}"
    echo ""
    
    if docker build -f "${dockerfile}" -t "${full_image_name}" .; then
        echo -e "${GREEN}✓ ${service_name} 构建成功${NC}"
        
        # 保存为 tar 文件
        local tar_file="${OUTPUT_DIR}/${IMAGE_PREFIX}-${service_name}-${VERSION}.tar"
        echo -e "${BLUE}正在保存镜像到: ${tar_file}${NC}"
        
        if docker save "${full_image_name}" -o "${tar_file}"; then
            echo -e "${GREEN}✓ ${service_name} 镜像保存成功${NC}"
            # 显示文件大小
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

# 记录开始时间
START_TIME=$(date +%s)

# 构建所有服务
echo -e "${YELLOW}开始构建所有服务...${NC}"
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

# 计算耗时
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
echo ""

# 生成 Podman 加载脚本
cat > "${OUTPUT_DIR}/load-images-podman.sh" << 'EOF'
#!/bin/bash
# Podman 镜像加载脚本
# 在 CentOS 7.9 服务器上运行此脚本

set -e

echo "=========================================="
echo "Shadow-Bees 镜像加载脚本 (Podman)"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Podman 是否安装
if ! command -v podman &> /dev/null; then
    echo -e "${RED}错误: Podman 未安装${NC}"
    echo "请先安装 Podman:"
    echo "  sudo yum install -y podman"
    exit 1
fi

echo -e "${BLUE}Podman 版本: $(podman --version)${NC}"
echo ""

# 加载所有镜像
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
echo "查看已加载的镜像:"
podman images | grep shadow-bees
EOF

chmod +x "${OUTPUT_DIR}/load-images-podman.sh"

echo -e "${GREEN}已生成 Podman 加载脚本: load-images-podman.sh${NC}"
echo ""
