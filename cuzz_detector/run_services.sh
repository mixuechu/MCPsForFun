#!/bin/bash

# 显示彩色输出的函数
print_color() {
  echo -e "\033[1;36m$1\033[0m"
}

# 错误输出
print_error() {
  echo -e "\033[1;31m$1\033[0m"
}

# 切换到项目根目录
cd "$(dirname "$0")"

# 函数：检查并停止已有服务
stop_existing_services() {
  print_color "检查并停止已有服务..."
  
  # 检查并关闭MCP服务器
  if [ -f .mcp_pid ]; then
    MCP_PID=$(cat .mcp_pid)
    if ps -p $MCP_PID > /dev/null 2>&1; then
      kill $MCP_PID
      print_color "已停止运行中的MCP服务器 (PID: $MCP_PID)"
      sleep 1
    fi
    rm -f .mcp_pid
  fi
  
  # 查找并关闭其他可能运行的MCP进程
  MCP_PIDS=$(ps aux | grep "python3 cuzz_detector_server.py" | grep -v grep | awk '{print $2}')
  if [ -n "$MCP_PIDS" ]; then
    kill $MCP_PIDS 2>/dev/null
    print_color "已停止其他MCP服务器进程 (PID: $MCP_PIDS)"
    sleep 1
  fi
  
  # 检查并关闭NextJS前端
  if [ -f .nextjs_pid ]; then
    NEXTJS_PID=$(cat .nextjs_pid)
    if ps -p $NEXTJS_PID > /dev/null 2>&1; then
      kill $NEXTJS_PID
      print_color "已停止运行中的NextJS前端 (PID: $NEXTJS_PID)"
      sleep 1
    fi
    rm -f .nextjs_pid
  fi
  
  # 查找并关闭其他可能运行的NextJS进程
  NEXTJS_PIDS=$(ps aux | grep "node" | grep "nextjs-cuzz" | grep -v grep | awk '{print $2}')
  if [ -n "$NEXTJS_PIDS" ]; then
    kill $NEXTJS_PIDS 2>/dev/null
    print_color "已停止其他NextJS前端进程 (PID: $NEXTJS_PIDS)"
    sleep 1
  fi
}

# 函数：启动服务
start_services() {
  print_color "\n=== 启动LLM用户情绪收集系统 ==="
  
  # 启动MCP服务器 (后台运行)
  print_color "\n[1/2] 启动MCP服务器..."
  python3 cuzz_detector_server.py &
  MCP_PID=$!
  echo $MCP_PID > .mcp_pid
  print_color "MCP服务器已启动，进程ID: $MCP_PID (http://localhost:10086)"
  
  # 等待MCP服务器启动
  sleep 2
  
  # 启动NextJS前端 (后台运行)
  print_color "\n[2/2] 启动NextJS前端..."
  cd nextjs-cuzz
  npm run dev &
  NEXTJS_PID=$!
  cd ..
  echo $NEXTJS_PID > .nextjs_pid
  print_color "NextJS前端已启动，进程ID: $NEXTJS_PID (http://localhost:3000/view)"
  
  print_color "\n=== 全部服务已启动 ==="
  print_color "访问地址: http://localhost:3000/view"
  print_color "按 Ctrl+C 停止所有服务\n"
}

# 函数：清理并退出
cleanup() {
  print_color "\n正在停止服务..."
  kill $(cat .mcp_pid) $(cat .nextjs_pid) 2>/dev/null
  rm -f .mcp_pid .nextjs_pid
  print_color "所有服务已停止"
  exit 0
}

# 主程序
# 1. 先停止已有服务
stop_existing_services

# 2. 启动新的服务
start_services

# 3. 设置Ctrl+C信号处理
trap cleanup INT TERM

# 4. 保持脚本运行
wait 