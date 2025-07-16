#!/bin/bash

# 显示彩色输出的函数
print_color() {
  echo -e "\033[1;36m$1\033[0m"
}

# 切换到项目根目录
cd "$(dirname "$0")"

print_color "正在停止LLM用户情绪收集系统..."

# 检查并关闭MCP服务器
if [ -f .mcp_pid ]; then
  MCP_PID=$(cat .mcp_pid)
  if ps -p $MCP_PID > /dev/null 2>&1; then
    kill $MCP_PID
    print_color "MCP服务器已停止 (PID: $MCP_PID)"
  else
    print_color "MCP服务器已经不在运行"
  fi
  rm -f .mcp_pid
else
  # 如果PID文件不存在，尝试查找并关闭进程
  MCP_PIDS=$(ps aux | grep "python3 cuzz_detector_server.py" | grep -v grep | awk '{print $2}')
  if [ -n "$MCP_PIDS" ]; then
    kill $MCP_PIDS
    print_color "MCP服务器已停止 (PID: $MCP_PIDS)"
  else
    print_color "未找到运行中的MCP服务器"
  fi
fi

# 检查并关闭NextJS前端
if [ -f .nextjs_pid ]; then
  NEXTJS_PID=$(cat .nextjs_pid)
  if ps -p $NEXTJS_PID > /dev/null 2>&1; then
    kill $NEXTJS_PID
    print_color "NextJS前端已停止 (PID: $NEXTJS_PID)"
  else
    print_color "NextJS前端已经不在运行"
  fi
  rm -f .nextjs_pid
else
  # 如果PID文件不存在，尝试查找并关闭进程
  NEXTJS_PIDS=$(ps aux | grep "node" | grep "nextjs-cuzz" | grep -v grep | awk '{print $2}')
  if [ -n "$NEXTJS_PIDS" ]; then
    kill $NEXTJS_PIDS
    print_color "NextJS前端已停止 (PID: $NEXTJS_PIDS)"
  else
    print_color "未找到运行中的NextJS前端"
  fi
fi

print_color "所有服务已停止" 