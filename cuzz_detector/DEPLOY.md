# 情绪收集系统部署指南

本指南将帮助您在服务器上部署情绪收集系统，包括Nginx配置和HTTPS设置。

## 前提条件

1. 已将域名 `mcp.mimimiai.com` 解析到您的服务器IP
2. 服务器运行Linux系统（推荐Ubuntu/Debian）
3. 拥有root权限或sudo权限

## 部署步骤

### 1. 将文件上传到服务器

将以下文件上传到服务器上的一个目录（例如`/opt/cuzz_detector/`）：
- `run_services.sh` - 用于启动/停止服务的脚本
- `nginx.conf` - Nginx配置文件
- `deploy_nginx.sh` - 部署脚本
- 以及其他项目文件

### 2. 部署Nginx和配置HTTPS

执行以下命令：

```bash
cd /opt/cuzz_detector/
sudo ./deploy_nginx.sh
```

脚本将自动：
1. 检查域名解析是否正确
2. 安装Nginx和Certbot（如果尚未安装）
3. 配置Nginx
4. 获取SSL证书并配置HTTPS
5. 设置证书自动更新

### 3. 启动情绪收集服务

部署成功后，启动情绪收集服务：

```bash
cd /opt/cuzz_detector/
./run_services.sh
```

## 访问服务

部署完成后，可以通过以下URL访问服务：
- https://mcp.mimimiai.com

## 常见问题排查

### SSL证书申请失败

可能原因：
- 域名未正确解析到服务器IP
- 防火墙阻止了80/443端口
- Certbot验证失败

解决方法：
```bash
sudo certbot --nginx -d mcp.mimimiai.com
```

### Nginx配置错误

如果Nginx配置有错误，可以检查错误日志：
```bash
sudo nginx -t
sudo cat /var/log/nginx/error.log
```

### 服务无法访问

检查以下几点：
1. MCP服务和NextJS前端是否正在运行
2. 防火墙是否允许80和443端口
3. Nginx是否正常运行：`systemctl status nginx`

## 重新部署

如果需要重新部署，只需重新运行部署脚本：
```bash
sudo ./deploy_nginx.sh
```

## 手动步骤

如果脚本执行失败，也可以手动执行以下步骤：

1. 安装Nginx和Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. 复制Nginx配置
```bash
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

3. 获取SSL证书
```bash
sudo certbot --nginx -d mcp.mimimiai.com
``` 