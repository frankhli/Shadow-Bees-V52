#!/bin/bash
# 导出已存在的镜像为单独 tar 包

set -e

IMAGE_PREFIX="shadow-bees"
VERSION="v52"
OUTPUT_DIR="/Users/frank/Desktop/shadow-bees-separate-images"

mkdir -p "${OUTPUT_DIR}"

echo "=========================================="
echo "导出已有镜像为单独 tar 包"
echo "=========================================="
echo ""

# 镜像列表
images=(
    "gateway"
    "hotel-service"
    "order-service"
    "inventory-service"
    "pricing-service"
    "content-service"
    "ai-service"
)

for img in "${images[@]}"; do
    old_tag="${IMAGE_PREFIX}/${img}:latest"
    new_tag="${IMAGE_PREFIX}/${img}:${VERSION}"
    tar_file="${OUTPUT_DIR}/${IMAGE_PREFIX}-${img}-${VERSION}.tar"
    
    echo "处理: ${img}"
    
    # 检查镜像是否存在
    if docker inspect "${old_tag}" &>/dev/null; then
        # 重新打标签
        docker tag "${old_tag}" "${new_tag}"
        echo "  ✓ 已打标签: ${new_tag}"
        
        # 导出为 tar
        docker save "${new_tag}" -o "${tar_file}"
        file_size=$(du -h "${tar_file}" | cut -f1)
        echo "  ✓ 已导出: ${tar_file} (${file_size})"
    else
        echo "  ✗ 镜像不存在: ${old_tag}"
    fi
    echo ""
done

echo "=========================================="
echo "导出完成！"
echo "=========================================="
echo ""
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
        podman load -i "$tar_file" && echo "  ✓ 成功"
    fi
done

echo ""
echo "已加载的镜像:"
podman images | grep shadow-bees
EOF

chmod +x "${OUTPUT_DIR}/load-images-podman.sh"
echo ""
echo "已生成加载脚本: load-images-podman.sh"
