#!/bin/bash
# Shadow-Bees PocketBase 下载脚本（使用镜像加速）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PB_DIR="$(dirname "$SCRIPT_DIR")/pocketbase"
PB_VERSION="0.22.14"

# 检测操作系统和架构
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
fi

echo "📦 PocketBase 下载脚本"
echo "   版本: v${PB_VERSION}"
echo "   系统: ${OS}_${ARCH}"
echo ""

# 创建目录
mkdir -p "$PB_DIR"
cd "$PB_DIR"

# 文件名校验
FILENAME="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"

# 镜像源列表（按优先级）
MIRRORS=(
    "https://gh.ddlc.top/https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILENAME}"
    "https://github.moeyy.xyz/https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILENAME}"
    "https://mirror.ghproxy.com/https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILENAME}"
    "https://hub.fastgit.xyz/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILENAME}"
    "https://raw.githubusercontent.com/pocketbase/pocketbase/master/dist/${FILENAME}"
)

# 尝试每个镜像源
download_success=false
for mirror in "${MIRRORS[@]}"; do
    echo "🔽 尝试下载: ${mirror%%/*}//..."
    
    if curl -L --max-time 60 -o "pb.zip" "$mirror" 2>/dev/null; then
        # 验证文件大小（至少 10MB）
        FILE_SIZE=$(stat -f%z "pb.zip" 2>/dev/null || stat -c%s "pb.zip" 2>/dev/null || echo 0)
        
        if [ "$FILE_SIZE" -gt 10000000 ]; then
            echo "✅ 下载成功 (${FILE_SIZE} bytes)"
            download_success=true
            break
        else
            echo "⚠️  文件不完整，尝试下一个源..."
            rm -f "pb.zip"
        fi
    else
        echo "❌ 下载失败，尝试下一个源..."
    fi
done

if [ "$download_success" = false ]; then
    echo ""
    echo "❌ 所有镜像源都下载失败"
    echo ""
    echo "请手动下载:"
    echo "1. 访问 https://github.com/pocketbase/pocketbase/releases"
    echo "2. 下载 ${FILENAME}"
    echo "3. 解压后将 pocketbase 文件放到: ${PB_DIR}/"
    exit 1
fi

# 解压
echo ""
echo "📂 解压中..."
unzip -o "pb.zip"
rm "pb.zip"
chmod +x pocketbase

# 验证
echo ""
echo "✅ PocketBase 安装成功!"
"$PB_DIR/pocketbase" --version

echo ""
echo "现在可以启动后端服务:"
echo "   bash ${SCRIPT_DIR}/start.sh"
