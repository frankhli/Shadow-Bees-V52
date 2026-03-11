#!/bin/bash
set -e

echo "=========================================="
echo "Shadow-Bees 后端镜像构建 (最终版)"
echo "=========================================="

IMAGE_PREFIX="shadow-bees"
VERSION="v52"
OUTPUT_DIR="/Users/frank/Desktop/shadow-bees-separate-images"
mkdir -p "${OUTPUT_DIR}"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY="http://192.168.0.104:9674"

echo "代理: $PROXY"
echo ""

build_service() {
    local name=$1
    local path=$2
    local has_prisma=$3
    local image="${IMAGE_PREFIX}/${name}:${VERSION}"
    local tar="${OUTPUT_DIR}/${IMAGE_PREFIX}-${name}-${VERSION}.tar"
    
    echo "=========================================="
    echo "构建: $name"
    echo "=========================================="
    
    cd "$path"
    
    # 复制 prisma
    if [ "$has_prisma" = "true" ]; then
        cp -r "${BASE_DIR}/packages/shared/prisma" ./prisma 2>/dev/null || true
    fi
    
    # 构建（使用主机网络+代理）
    if docker build \
        --network host \
        --build-arg HTTP_PROXY="$PROXY" \
        --build-arg HTTPS_PROXY="$PROXY" \
        -t "$image" \
        . ; then
        
        echo "✓ $name 构建成功"
        docker save "$image" -o "$tar"
        echo "✓ 已保存 ($(du -h "$tar" | cut -f1))"
        
        [ "$has_prisma" = "true" ] && rm -rf ./prisma 2>/dev/null || true
        cd - > /dev/null
        return 0
    else
        echo "✗ $name 构建失败"
        cd - > /dev/null
        return 1
    fi
}

# 构建所有服务
build_service "gateway" "${BASE_DIR}/packages/gateway" "false"
build_service "hotel-service" "${BASE_DIR}/packages/services/hotel-service" "true"
build_service "order-service" "${BASE_DIR}/packages/services/order-service" "true"
build_service "inventory-service" "${BASE_DIR}/packages/services/inventory-service" "true"
build_service "pricing-service" "${BASE_DIR}/packages/services/pricing-service" "true"
build_service "content-service" "${BASE_DIR}/packages/services/content-service" "true"
build_service "ai-service" "${BASE_DIR}/packages/ai-service" "false"

echo ""
echo "=========================================="
echo "构建完成！"
echo "=========================================="
ls -lh "$OUTPUT_DIR"

# 生成 Podman 加载脚本
cat > "${OUTPUT_DIR}/load-images-podman.sh" << 'EOF'
#!/bin/bash
for f in shadow-bees-*.tar; do
    [ -f "$f" ] && podman load -i "$f" && echo "Loaded: $f"
done
podman images | grep shadow-bees
EOF
chmod +x "${OUTPUT_DIR}/load-images-podman.sh"
