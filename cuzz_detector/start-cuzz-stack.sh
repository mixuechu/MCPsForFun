#!/bin/bash
set -e

cd "$(dirname "$0")"

# 配置变量
PROD_MODE=${PROD_MODE:-false}  # 默认为开发模式，通过 PROD_MODE=true ./start-cuzz-stack.sh 启用生产模式
LOG_DIR="./logs"

# 创建日志目录
mkdir -p $LOG_DIR

# 首先终止所有已运行的服务
echo "杀死 cuzz_detector_server.py ..."
pkill -f cuzz_detector_server.py 2>/dev/null || true

echo "杀死 sse_server.js ..."
pkill -f sse_server.js 2>/dev/null || true

echo "杀死 Next.js ..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "npm run start" 2>/dev/null || true
pkill -f "bun run dev" 2>/dev/null || true
pkill -f "bun run start" 2>/dev/null || true

echo "等待端口释放（3秒）..."
sleep 3

# 自动创建 uv 虚拟环境
if [ ! -d ".venv" ]; then
  echo "未找到 .venv，正在用 uv 创建..."
  uv venv || { echo "创建虚拟环境失败"; exit 1; }
fi

# 用 uv pip 安装 Python 依赖（如果有 requirements.txt）
if [ -f requirements.txt ]; then
  echo "安装 Python 依赖..."
  uv pip install -r requirements.txt || { echo "安装Python依赖失败"; exit 1; }
fi

# 启动 cuzz_detector_server（用 uv 启动，保证在 uv 环境下）
echo "启动 cuzz_detector_server.py ..."
uv run cuzz_detector_server.py --host 0.0.0.0 --port 10086 > $LOG_DIR/cuzz_detector_server.log 2>&1 &
echo $! > cuzz_detector_server.pid

# 安装 Node SSE 服务依赖
if [ -f sse_server.js ]; then
  echo "安装 Node SSE 服务依赖..."
  bun install express || { echo "安装Express依赖失败"; exit 1; }
  
  echo "启动 sse_server.js ..."
  nohup bun sse_server.js > $LOG_DIR/sse_server.log 2>&1 &
  echo $! > sse_server.pid
  echo "sse_server.js 已启动"
fi

# 启动 Next.js 前端
if [ -d nextjs-cuzz ]; then
  cd nextjs-cuzz
  echo "安装 Next.js 前端依赖..."
  bun install || { echo "安装Next.js依赖失败"; exit 1; }
  
  # 安装 kill-port 包
  echo "安装 kill-port 包..."
  bun add -d kill-port || { echo "安装kill-port失败"; exit 1; }
  
  bunx kill-port 3000 || true
  
  # 根据模式启动Next.js
  if [ "$PROD_MODE" = true ]; then
    echo "以生产模式启动 Next.js..."
    # 先构建项目
    echo "构建 Next.js 应用..."
    bun run build || { echo "构建Next.js应用失败"; exit 1; }
    
    # 启动生产服务器
    nohup bun run start > ../$LOG_DIR/nextjs-cuzz.log 2>&1 &
    echo $! > ../nextjs-cuzz.pid
    echo "Next.js 前端已启动 (生产模式, 端口:3000)"
  else
    echo "以开发模式启动 Next.js..."
    nohup bun run dev -- -p 3000 > ../$LOG_DIR/nextjs-cuzz.log 2>&1 &
    echo $! > ../nextjs-cuzz.pid
    echo "Next.js 前端已启动 (开发模式, 端口:3000)"
  fi
  cd ..
fi

echo "全部服务已启动！"
echo "日志文件位于: $LOG_DIR/"
echo "如要以生产模式启动，请使用: PROD_MODE=true $0" 