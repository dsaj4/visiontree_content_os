# VisionTree Content OS 部署说明

目标服务器：Alibaba Cloud Linux 3.2104 LTS 64 位。

本项目是一个 React/Vite 前端 + Node.js HTTP API + SQLite 的单体应用。生产环境建议先构建前端，再用 `npm run serve` 启动后端，由后端同时托管 `dist` 静态文件和 `/api/*` 接口。

## 1. 运行要求

- Node.js：`>= 22.5.0`，建议使用 Node.js 22 LTS 或 24 LTS，因为服务端使用了 `node:sqlite`。
- npm：随 Node.js 安装即可。
- Git：用于拉取仓库。
- Nginx：建议作为公网入口和反向代理。
- SQLite 数据文件：默认位于项目内 `data/content-system.sqlite`。

## 2. 安装基础依赖

```bash
sudo dnf update -y
sudo dnf install -y git curl nginx
```

安装 Node.js。若系统源里的 Node 版本低于 22.5，请使用 NodeSource 或服务器已有的 Node 版本管理方案：

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

node -v
npm -v
```

如果 `node -v` 低于 `v22.5.0`，不要继续部署，先升级 Node。

## 3. 拉取项目

```bash
sudo mkdir -p /opt/visiontree
sudo chown -R $USER:$USER /opt/visiontree
cd /opt/visiontree
git clone https://github.com/dsaj4/visiontree_content_os.git
cd visiontree_content_os
```

## 4. 安装依赖并构建

```bash
npm ci
npm run build
```

构建完成后应生成 `dist/`。生产服务使用：

```bash
API_PORT=8787 npm run serve
```

第一次启动时，服务会自动创建 `data/content-system.sqlite` 并写入演示数据。

## 5. 使用 systemd 托管服务

创建服务文件：

```bash
sudo tee /etc/systemd/system/visiontree-content-os.service >/dev/null <<'EOF'
[Unit]
Description=VisionTree Content OS
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/visiontree/visiontree_content_os
Environment=NODE_ENV=production
Environment=API_PORT=8787
ExecStart=/usr/bin/npm run serve
Restart=always
RestartSec=5
User=ecs-user
Group=ecs-user

[Install]
WantedBy=multi-user.target
EOF
```

如果服务器登录用户不是 `ecs-user`，把 `User` 和 `Group` 改成实际部署用户。

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now visiontree-content-os
sudo systemctl status visiontree-content-os --no-pager
```

查看日志：

```bash
journalctl -u visiontree-content-os -f
```

本机健康检查：

```bash
curl -I http://127.0.0.1:8787/
curl http://127.0.0.1:8787/api/accounts
```

## 6. 配置 Nginx 反向代理

创建配置：

```bash
sudo tee /etc/nginx/conf.d/visiontree-content-os.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

检查并启动：

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

阿里云安全组需要放行公网入口端口。HTTP 放行 `80`，如果配置 HTTPS，还需要放行 `443`。

## 7. 更新发布

```bash
cd /opt/visiontree/visiontree_content_os
git pull --ff-only
npm ci
npm run build
sudo systemctl restart visiontree-content-os
sudo systemctl status visiontree-content-os --no-pager
```

## 8. 数据库和备份

SQLite 数据库默认在：

```bash
/opt/visiontree/visiontree_content_os/data/content-system.sqlite
```

更新代码前建议备份：

```bash
mkdir -p ~/visiontree-backups
cp /opt/visiontree/visiontree_content_os/data/content-system.sqlite \
  ~/visiontree-backups/content-system-$(date +%F-%H%M%S).sqlite
```

如果需要迁移真实生产数据，不要删除 `data/` 目录。

## 9. 当前演示登录账号

当前版本仍是无密码演示登录，只允许以下 persona 账号名：

- `milo`
- `ai-doubt`
- `nora`
- `franc`
- `thinking-lab`
- `thinking-tree`
- `visiontree`

生产环境上线前应替换为正式认证方案。

## 10. 常见问题

- `Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite`：Node 版本太低，升级到 22.5 以上。
- 页面能打开但 API 失败：确认 systemd 服务是否监听 `8787`，并检查 Nginx 是否代理到 `127.0.0.1:8787`。
- 重新部署后数据丢失：检查是否误删了 `data/content-system.sqlite`，并从备份恢复。
- 跨域问题：当前推荐同域部署，即 Nginx 把所有路径代理给 Node 服务。如果未来拆分前端域名和 API 域名，需要在 `server/api.mjs` 的 `allowedOrigins` 中加入真实前端域名。
