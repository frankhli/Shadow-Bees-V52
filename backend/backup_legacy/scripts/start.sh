#!/bin/bash
# Shadow-Bees Backend 启动脚本
# 使用 PocketBase 作为轻量级后端

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PB_VERSION="0.22.14"
PB_DIR="$PROJECT_DIR/pocketbase"
DATA_DIR="$PROJECT_DIR/pb_data"

# 检测操作系统和架构
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
fi

echo "📦 Shadow-Bees Backend 启动器"
echo "   OS: $OS, ARCH: $ARCH"
echo ""

# 检查 PocketBase 是否已下载
if [ ! -f "$PB_DIR/pocketbase" ]; then
    echo "🔽 首次启动，正在下载 PocketBase v$PB_VERSION..."
    mkdir -p "$PB_DIR"
    
    DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
    
    if command -v curl &> /dev/null; then
        curl -L -o "$PB_DIR/pb.zip" "$DOWNLOAD_URL"
    elif command -v wget &> /dev/null; then
        wget -O "$PB_DIR/pb.zip" "$DOWNLOAD_URL"
    else
        echo "❌ 请先安装 curl 或 wget"
        exit 1
    fi
    
    echo "📂 解压中..."
    unzip -o "$PB_DIR/pb.zip" -d "$PB_DIR"
    rm "$PB_DIR/pb.zip"
    chmod +x "$PB_DIR/pocketbase"
    
    echo "✅ PocketBase 下载完成"
    echo ""
fi

# 创建数据目录
mkdir -p "$DATA_DIR"

# 启动 PocketBase
echo "🚀 启动 PocketBase..."
echo "   数据目录: $DATA_DIR"
echo "   管理界面: http://127.0.0.1:8090/_/"
echo "   API 地址: http://127.0.0.1:8090/api/"
echo ""
echo "   默认管理员账号:"
echo "     邮箱: admin@shadowbees.com"
echo "     密码: shadowbees123"
echo ""

# 首次启动时创建初始数据
if [ ! -f "$DATA_DIR/data.db" ]; then
    echo "📝 首次启动，将自动创建数据库和初始数据..."
fi

"$PB_DIR/pocketbase" serve --dir="$DATA_DIR" --http="127.0.0.1:8090"
