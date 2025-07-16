#!/bin/bash

# 显示彩色输出的函数
print_color() {
  echo -e "\033[1;36m$1\033[0m"
}

# 错误输出
print_error() {
  echo -e "\033[1;31m$1\033[0m"
}

# 成功输出
print_success() {
  echo -e "\033[1;32m$1\033[0m"
}

# 警告输出
print_warning() {
  echo -e "\033[1;33m$1\033[0m"
}

# 检查是否为root用户
check_root() {
  if [ "$(id -u)" != "0" ]; then
    print_error "错误: 此脚本必须以root权限运行!"
    print_warning "请使用: sudo $0"
    exit 1
  fi
}

# 检查域名解析
check_domain() {
  DOMAIN="mcp.mimimiai.com"
  SERVER_IP=$(curl -s https://ipinfo.io/ip)
  DOMAIN_IP=$(dig +short $DOMAIN)

  print_color "检查域名 $DOMAIN 是否解析到当前服务器..."
  
  if [ -z "$DOMAIN_IP" ]; then
    print_error "错误: 域名 $DOMAIN 未能解析到任何IP地址!"
    print_warning "请确认已正确设置DNS解析后再运行此脚本。"
    exit 1
  fi
  
  if [[ "$DOMAIN_IP" != "$SERVER_IP" ]]; then
    print_error "错误: 域名 $DOMAIN 解析到的IP ($DOMAIN_IP) 与当前服务器IP ($SERVER_IP) 不匹配!"
    print_warning "请确认DNS解析正确后再运行此脚本。"
    exit 1
  fi
  
  print_success "域名 $DOMAIN 已正确解析到当前服务器 ($SERVER_IP)。"
}

# 检查并安装必要的软件包
install_packages() {
  print_color "检查并安装必要的软件包..."

  # 更新包列表
  apt update

  # 检查是否已安装Nginx
  if ! command -v nginx &> /dev/null; then
    print_color "安装Nginx..."
    apt install -y nginx
  else
    print_success "Nginx已安装。"
  fi

  # 检查是否已安装Certbot
  if ! command -v certbot &> /dev/null; then
    print_color "安装Certbot..."
    apt install -y certbot python3-certbot-nginx
  else
    print_success "Certbot已安装。"
  fi
}

# 配置Nginx
configure_nginx() {
  print_color "配置Nginx服务..."
  
  # 备份现有配置
  if [ -f /etc/nginx/nginx.conf ]; then
    print_color "备份现有Nginx配置..."
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak-$(date +%Y%m%d%H%M%S)
  fi
  
  # 复制新配置
  print_color "安装新的Nginx配置..."
  cp nginx.conf /etc/nginx/nginx.conf
  
  # 测试配置
  print_color "测试Nginx配置..."
  nginx -t
  
  if [ $? -ne 0 ]; then
    print_error "Nginx配置测试失败，请修复问题后重试。"
    exit 1
  fi
  
  # 重启Nginx以应用基本配置
  print_color "重新加载Nginx配置..."
  systemctl restart nginx
  
  # 确保Nginx开机启动
  print_color "设置Nginx开机启动..."
  systemctl enable nginx
}

# 配置SSL证书
setup_ssl() {
  print_color "设置SSL证书..."
  
  # 使用Certbot获取证书
  print_color "使用Certbot为mcp.mimimiai.com获取SSL证书..."
  certbot --nginx -d mcp.mimimiai.com --non-interactive --agree-tos --email admin@mimimiai.com
  
  if [ $? -ne 0 ]; then
    print_error "获取SSL证书失败，请检查错误信息。"
    exit 1
  fi
  
  print_color "设置自动续期..."
  # Certbot会自动添加一个cron作业，但我们可以测试一下
  certbot renew --dry-run
  
  # 重启Nginx以应用SSL配置
  print_color "重启Nginx以应用SSL配置..."
  systemctl restart nginx
}

# 部署完成后显示信息
show_info() {
  print_success "\n=== 部署完成! ==="
  print_color "您的情绪收集系统现在应该可以通过以下URL访问:"
  print_color "https://mcp.mimimiai.com"
  print_color "\n请确保:"
  print_color "1. 服务器上的MCP服务和NextJS前端正在运行"
  print_color "2. 防火墙已允许端口80和443"
  print_color "\n您可以使用以下命令启动MCP服务和NextJS前端:"
  print_color "cd $(pwd) && ./run_services.sh"
}

# 主函数
main() {
  print_color "=== 开始部署Nginx和SSL配置 ==="
  
  check_root
  check_domain
  install_packages
  configure_nginx
  setup_ssl
  show_info
  
  print_success "部署完成!"
}

# 执行主函数
main 