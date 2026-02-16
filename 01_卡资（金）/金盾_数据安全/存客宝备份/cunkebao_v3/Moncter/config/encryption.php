<?php
/**
 * 加密配置
 *
 * 用于身份证等敏感数据的加密和哈希
 */

return [
    // AES 加密配置
    'aes' => [
        // 加密密钥（32字节，256位）
        // 注意：生产环境应使用环境变量或密钥管理服务，不要硬编码
        // 使用 getenv() 获取环境变量，如果不存在则使用默认值
        // 默认密钥：至少32字符（实际使用时会被 SHA256 哈希处理）
        'key' => getenv('ENCRYPTION_AES_KEY') ?: 'your-32-byte-secret-key-here-12345678',

        // 加密方法
        'cipher' => 'AES-256-CBC',

        // IV 长度（字节）
        'iv_length' => 16,
    ],

    // 哈希配置
    'hash' => [
        // 哈希算法（用于身份证哈希）
        'algorithm' => 'sha256',

        // 是否使用盐值（可选，增强安全性）
        'use_salt' => true,

        // 盐值（如果启用）
        // 使用 getenv() 获取环境变量，如果不存在则使用默认值
        'salt' => getenv('ENCRYPTION_HASH_SALT') ?: 'your-hash-salt-here',
    ],

    // 脱敏配置
    'masking' => [
        // 身份证脱敏规则：保留前6位和后4位，中间用*替代
        'id_card' => [
            'prefix_length' => 6,
            'suffix_length' => 4,
            'mask_char' => '*',
        ],

        // 手机号脱敏规则：保留前3位和后4位，中间用*替代
        'phone' => [
            'prefix_length' => 3,
            'suffix_length' => 4,
            'mask_char' => '*',
        ],

        // 邮箱脱敏规则：保留@前的前2位和@后的域名
        'email' => [
            'prefix_length' => 2,
            'mask_char' => '*',
        ],
    ],
];

