#!/bin/bash

# 显示彩色输出的函数
print_color() {
  echo -e "\033[1;36m$1\033[0m"
}

# 切换到项目根目录
cd "$(dirname "$0")"

# 显示启动信息
print_color "=== 启动LLM用户情绪收集系统 ==="
print_color "同时启动MCP服务器和NextJS前端..."

# 启动MCP服务器 (后台运行)
print_color "\n[1/2] 启动MCP服务器..."
python3 cuzz_detector_server.py &
MCP_PID=$!
print_color "MCP服务器已启动，进程ID: $MCP_PID (http://localhost:10086)"

# 等待1秒确保MCP服务器正常启动
sleep 1

# 启动NextJS前端 (后台运行)
print_color "\n[2/2] 启动NextJS前端..."
cd nextjs-cuzz
npm run dev &
NEXTJS_PID=$!
print_color "NextJS前端已启动，进程ID: $NEXTJS_PID (http://localhost:3000/view)"

# 写入进程ID到临时文件，方便关闭
cd ..
echo $MCP_PID > .mcp_pid
echo $NEXTJS_PID > .nextjs_pid

print_color "\n=== 全部服务已启动 ==="
print_color "访问地址: http://localhost:3000/view"
print_color "按 Ctrl+C 停止所有服务"

# 等待用户按Ctrl+C
trap cleanup INT TERM
function cleanup() {
  print_color "\n正在停止服务..."
  kill $MCP_PID $NEXTJS_PID 2>/dev/null
  rm -f .mcp_pid .nextjs_pid
  print_color "所有服务已停止"
  exit 0
}

# 保持脚本运行
wait 