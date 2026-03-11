#!/bin/bash
# Shadow-Bees 后端启动脚本（简化版）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PB_DIR="$PROJECT_DIR/pocketbase"
DATA_DIR="$PROJECT_DIR/pb_data"
SCHEMA_FILE="$PROJECT_DIR/pb_schema.json"

echo "📦 Shadow-Bees Backend 启动器"
echo ""

# 检查 PocketBase
if [ ! -f "$PB_DIR/pocketbase" ]; then
    echo "❌ PocketBase 未找到，请先运行 download-pb.sh"
    exit 1
fi

# 创建数据目录
mkdir -p "$DATA_DIR"

echo "🚀 启动 PocketBase..."
echo "   数据目录: $DATA_DIR"
echo "   管理界面: http://127.0.0.1:8090/_/"
echo "   API 地址: http://127.0.0.1:8090/api/"
echo ""
echo "   ⚠️  首次启动请手动导入 Schema:"
echo "      1. 访问 http://127.0.0.1:8090/_/"
echo "      2. 注册管理员账号"
echo "      3. Settings -> Import collections"
echo "      4. 选择文件: $SCHEMA_FILE"
echo ""
echo "   按 Ctrl+C 停止服务"
echo ""

# 启动 PocketBase
"$PB_DIR/pocketbase" serve --dir="$DATA_DIR" --http="127.0.0.1:8090"
