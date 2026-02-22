# www.lytiao.com Docker 镜像
# PHP 7.1 + Apache，与宝塔原环境一致
FROM php:7.1-apache

# 启用 Apache mod_rewrite
RUN a2enmod rewrite

# 常用 PHP 扩展（按需可追加）
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \
    && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 网站文件挂载到 /var/www/html
# 容器内 Apache DocumentRoot
WORKDIR /var/www/html

EXPOSE 80
