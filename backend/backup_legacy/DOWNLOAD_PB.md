# PocketBase 手动下载指南

由于网络原因自动下载失败，请手动下载：

## 方法1：浏览器下载（推荐）

1. 访问 https://github.com/pocketbase/pocketbase/releases
2. 下载 `pocketbase_0.22.14_darwin_amd64.zip`
3. 解压后将 `pocketbase` 可执行文件放到 `backend/pocketbase/` 目录

## 方法2：使用镜像加速

```bash
# 使用 ghproxy 镜像
cd backend/pocketbase
curl -L -o pb.zip "https://ghproxy.com/https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_darwin_amd64.zip"
unzip pb.zip
rm pb.zip
chmod +x pocketbase
```

## 方法3：Homebrew 安装（Mac）

```bash
brew install pocketbase
```

然后修改 `backend/scripts/start.sh`：
```bash
# 将这一行
"$PB_DIR/pocketbase" serve --dir="$DATA_DIR" --http="127.0.0.1:8090"
# 改为
pocketbase serve --dir="$DATA_DIR" --http="127.0.0.1:8090"
```

## 验证安装

```bash
./backend/pocketbase/pocketbase --version
# 应显示: pocketbase version 0.22.14
```

## 启动后端

安装完成后：
```bash
bash backend/scripts/start.sh
```
