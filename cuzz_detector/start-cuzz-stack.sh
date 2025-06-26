#!/bin/bash
set -e

cd "$(dirname "$0")"

# 首先终止所有已运行的服务
echo "杀死 cuzz_detector_server.py ..."
pkill -f cuzz_detector_server.py || true

echo "杀死 sse_server.js ..."
pkill -f sse_server.js || true

echo "杀死 Next.js ..."
pkill -f "npm run dev" || true
pkill -f "bun run dev" || true  # 增加对bun进程的终止

echo "等待端口释放（3秒）..."
sleep 3

# 自动创建 uv 虚拟环境
if [ ! -d ".venv" ]; then
  echo "未找到 .venv，正在用 uv 创建..."
  uv venv
fi

# 用 uv pip 安装 Python 依赖（如果有 requirements.txt）
if [ -f requirements.txt ]; then
  echo "安装 Python 依赖..."
  uv pip install -r requirements.txt
fi

# 启动 cuzz_detector_server（用 uv 启动，保证在 uv 环境下）
echo "启动 cuzz_detector_server.py ..."
uv run cuzz_detector_server.py --host 0.0.0.0 --port 10086 &

# 安装 Node SSE 服务依赖
if [ -f sse_server.js ]; then
  if [ ! -d node_modules ]; then
    echo "安装 Node SSE 服务依赖..."
    bun install express
  fi
  nohup bun sse_server.js > sse_server.log 2>&1 &
  echo "sse_server.js 已启动"
fi

# 启动 Next.js 前端
if [ -d nextjs-cuzz ]; then
  cd nextjs-cuzz
  if [ ! -d node_modules ]; then
    echo "安装 Next.js 前端依赖..."
    bun install
  fi
  
  # 安装 kill-port 包
  echo "安装 kill-port 包..."
  bun add -d kill-port
  
  bunx kill-port 3000 || true
  nohup bun run dev -- -p 3000 > ../nextjs-cuzz.log 2>&1 &
  echo "Next.js 前端已启动 (端口:3000)"
  cd ..
fi

echo "全部服务已启动！" 