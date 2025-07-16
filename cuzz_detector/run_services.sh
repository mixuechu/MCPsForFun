#!/bin/bash

# 显示彩色输出的函数
print_color() {
  echo -e "\033[1;36m$1\033[0m"
}

# 错误输出
print_error() {
  echo -e "\033[1;31m$1\033[0m"
}

# 警告输出
print_warning() {
  echo -e "\033[1;33m$1\033[0m"
}

# 成功输出
print_success() {
  echo -e "\033[1;32m$1\033[0m"
}

# 切换到项目根目录
cd "$(dirname "$0")"

# 显示帮助信息
show_help() {
  echo "用法: $0 [选项]"
  echo "选项:"
  echo "  start      启动所有服务"
  echo "  stop       停止所有服务"
  echo "  restart    重启所有服务"
  echo "  status     检查服务状态"
  echo "  test TEXT  发送测试反馈 (TEXT为反馈内容)"
  echo "  install    仅安装依赖"
  echo "  help       显示帮助信息"
  echo "无参数默认为start"
}

# 检测系统类型并安装依赖
install_dependencies() {
  print_color "检查并安装必要依赖..."
  
  # 检查Python依赖
  if ! command -v python3 &> /dev/null; then
    print_error "未找到Python3。请安装Python3后再运行此脚本。"
    exit 1
  fi
  
  # 安装pip
  if ! command -v pip3 &> /dev/null; then
    print_warning "未找到pip3，尝试安装..."
    if command -v apt-get &> /dev/null; then
      sudo apt-get update
      sudo apt-get install -y python3-pip
    elif command -v yum &> /dev/null; then
      sudo yum -y install python3-pip
    elif command -v brew &> /dev/null; then
      brew install python3
    else
      print_error "无法自动安装pip3，请手动安装后再运行。"
      exit 1
    fi
  fi
  
  # 安装Python依赖包
  print_color "安装Python依赖包..."
  pip3 install fastmcp requests
  
  # 检查Node.js和npm
  if ! command -v node &> /dev/null; then
    print_warning "未找到Node.js，尝试安装..."
    if command -v apt-get &> /dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
      sudo yum install -y nodejs
    elif command -v brew &> /dev/null; then
      brew install node
    else
      print_error "无法自动安装Node.js，请手动安装后再运行。"
      exit 1
    fi
  fi
  
  # 检查NextJS前端依赖
  if [ -d "nextjs-cuzz" ]; then
    print_color "安装NextJS前端依赖..."
    cd nextjs-cuzz
    
    # 如果没有npm，尝试使用其他包管理器
    if command -v npm &> /dev/null; then
      npm install
    elif command -v yarn &> /dev/null; then
      yarn install
    elif command -v bun &> /dev/null; then
      bun install
    else
      print_error "未找到npm、yarn或bun。请安装任一包管理器后再运行。"
      cd ..
      exit 1
    fi
    
    cd ..
  fi
  
  print_success "依赖安装完成！"
}

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
  MCP_PIDS=$(ps aux | grep "python3.*cuzz_detector_server\.py" | grep -v grep | awk '{print $2}')
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
  NEXTJS_PIDS=$(ps aux | grep "node.*nextjs-cuzz" | grep -v grep | awk '{print $2}')
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
  
  # 检查包管理器并启动
  if command -v npm &> /dev/null; then
    npm run dev &
  elif command -v yarn &> /dev/null; then
    yarn dev &
  elif command -v bun &> /dev/null; then
    bun run dev &
  else
    print_error "未找到npm、yarn或bun。无法启动NextJS前端。"
    cd ..
    exit 1
  fi
  
  NEXTJS_PID=$!
  cd ..
  echo $NEXTJS_PID > .nextjs_pid
  print_color "NextJS前端已启动，进程ID: $NEXTJS_PID (http://localhost:3000/view)"
  
  print_color "\n=== 全部服务已启动 ==="
  print_color "访问地址: http://localhost:3000/view"
  print_color "按 Ctrl+C 停止所有服务\n"
}

# 函数：检查服务状态
check_status() {
  print_color "检查服务状态..."
  
  # 检查MCP服务器
  if [ -f .mcp_pid ]; then
    MCP_PID=$(cat .mcp_pid)
    if ps -p $MCP_PID > /dev/null 2>&1; then
      print_success "MCP服务器正在运行 (PID: $MCP_PID)"
    else
      print_warning "MCP服务器已停止 (上次PID: $MCP_PID)"
    fi
  else
    MCP_PIDS=$(ps aux | grep "python3.*cuzz_detector_server\.py" | grep -v grep | awk '{print $2}')
    if [ -n "$MCP_PIDS" ]; then
      print_warning "MCP服务器在运行中，但没有PID文件 (PID: $MCP_PIDS)"
    else
      print_error "MCP服务器未运行"
    fi
  fi
  
  # 检查NextJS前端
  if [ -f .nextjs_pid ]; then
    NEXTJS_PID=$(cat .nextjs_pid)
    if ps -p $NEXTJS_PID > /dev/null 2>&1; then
      print_success "NextJS前端正在运行 (PID: $NEXTJS_PID)"
    else
      print_warning "NextJS前端已停止 (上次PID: $NEXTJS_PID)"
    fi
  else
    NEXTJS_PIDS=$(ps aux | grep "node.*nextjs-cuzz" | grep -v grep | awk '{print $2}')
    if [ -n "$NEXTJS_PIDS" ]; then
      print_warning "NextJS前端在运行中，但没有PID文件 (PID: $NEXTJS_PIDS)"
    else
      print_error "NextJS前端未运行"
    fi
  fi
}

# 函数：发送测试反馈
send_test_feedback() {
  if [ -z "$1" ]; then
    print_error "请提供反馈文本"
    return 1
  fi
  
  TEXT="$1"
  EMOTION="${2:-愤怒}"
  INTENSITY="${3:-4}"
  CONTEXT="${4:-测试反馈}"
  
  print_color "发送测试反馈到服务器..."
  
  # 检查Python和requests
  if ! python3 -c "import requests" &> /dev/null; then
    print_warning "未找到requests模块，尝试安装..."
    pip3 install requests
  fi
  
  # 发送反馈的Python代码
  python3 -c "
import requests
import json

payload = {
    'name': 'add_feedback',
    'parameters': {
        'user_text': '$TEXT',
        'emotion_type': '$EMOTION',
        'intensity': $INTENSITY,
        'trigger_context': '$CONTEXT'
    }
}

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
}

try:
    resp = requests.post('http://localhost:10086/mcp', 
                        json=payload,
                        headers=headers)
    print('状态码:', resp.status_code)
    if resp.status_code == 200:
        print('响应:', json.dumps(resp.json(), ensure_ascii=False, indent=2))
    else:
        print('错误:', resp.text)
except Exception as e:
    print('请求异常:', e)
"

  if [ $? -eq 0 ]; then
    print_success "反馈发送成功！"
  else
    print_error "发送失败，请确保服务器正在运行。"
  fi
}

# 函数：清理并退出
cleanup() {
  print_color "\n正在停止服务..."
  if [ -f .mcp_pid ]; then
    kill $(cat .mcp_pid) 2>/dev/null
  fi
  if [ -f .nextjs_pid ]; then
    kill $(cat .nextjs_pid) 2>/dev/null
  fi
  rm -f .mcp_pid .nextjs_pid
  print_success "所有服务已停止"
  exit 0
}

# 设置Ctrl+C信号处理
trap cleanup INT TERM

# 主程序
case "${1:-start}" in
  start)
    install_dependencies
    stop_existing_services
    start_services
    # 保持脚本运行
    wait
    ;;
    
  stop)
    stop_existing_services
    print_success "所有服务已停止"
    ;;
    
  restart)
    stop_existing_services
    start_services
    # 保持脚本运行
    wait
    ;;
    
  status)
    check_status
    ;;
    
  test)
    if [ -z "$2" ]; then
      print_error "请提供反馈文本"
      echo "用法: $0 test \"反馈文本\" [情绪类型] [强度1-5] [场景描述]"
      exit 1
    fi
    send_test_feedback "$2" "$3" "$4" "$5"
    ;;
    
  install)
    install_dependencies
    ;;
    
  help|--help|-h)
    show_help
    ;;
    
  *)
    print_warning "未知选项: $1"
    show_help
    exit 1
    ;;
esac 