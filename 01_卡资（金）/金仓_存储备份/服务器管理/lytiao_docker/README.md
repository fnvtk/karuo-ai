# www.lytiao.com Docker 部署

> 将 www.lytiao.com 全部文件容器化，可在任意服务器上 `docker compose up -d` 部署。

## 一、在存客宝上首次部署

```bash
# 本机执行（需 sshpass）
cd "/Users/karuo/Documents/个人/卡若AI"
bash 01_卡资（金）/金仓_存储备份/服务器管理/scripts/存客宝_lytiao_Docker部署.sh
```

或在 **存客宝宝塔面板 → 终端** 执行 `scripts/存客宝_lytiao_Docker部署_宝塔终端执行.sh` 内容。

## 二、多服务器复用

1. 将 `lytiao_docker/` 目录（含 `www/`）打包
2. 上传到目标服务器
3. 执行 `docker compose up -d`
4. 访问 `http://IP:8080` 或配置 Nginx 反向代理到 8080

## 三、目录结构

```
lytiao_docker/
├── Dockerfile
├── docker-compose.yml
├── www/           # 从 /www/wwwroot/www.lytiao.com 复制
└── README.md
```

## 四、环境

- PHP 7.1 + Apache
- 扩展：gd, mysqli, pdo_mysql, zip
