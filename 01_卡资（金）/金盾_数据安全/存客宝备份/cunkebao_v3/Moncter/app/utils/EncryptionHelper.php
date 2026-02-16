<?php

namespace app\utils;

/**
 * 加密工具类
 *
 * 提供身份证等敏感数据的加密、解密和哈希功能
 */
class EncryptionHelper
{
    /**
     * 加密字符串（使用 AES-256-CBC）
     *
     * @param string $plaintext 明文
     * @return string 加密后的密文（base64编码，包含IV）
     * @throws \RuntimeException
     */
    public static function encrypt(string $plaintext): string
    {
        if (empty($plaintext)) {
            return '';
        }

        $config = config('encryption', []);
        $keyString = $config['aes']['key'] ?? '';
        $cipher = $config['aes']['cipher'] ?? 'AES-256-CBC';
        $ivLength = $config['aes']['iv_length'] ?? 16;

        if (empty($keyString)) {
            throw new \InvalidArgumentException('加密密钥配置错误，密钥不能为空');
        }

        // 使用 SHA256 哈希处理密钥，确保密钥长度为32字节（AES-256需要256位密钥）
        // 即使原始密钥长度不够，哈希后也会得到固定长度的密钥
        $key = substr(hash('sha256', $keyString), 0, 32);

        // 生成随机IV
        $iv = openssl_random_pseudo_bytes($ivLength);
        if ($iv === false) {
            throw new \RuntimeException('无法生成随机IV');
        }

        // 加密
        $encrypted = openssl_encrypt($plaintext, $cipher, $key, OPENSSL_RAW_DATA, $iv);
        if ($encrypted === false) {
            throw new \RuntimeException('加密失败: ' . openssl_error_string());
        }

        // 将IV和密文组合，然后base64编码
        return base64_encode($iv . $encrypted);
    }

    /**
     * 解密字符串
     *
     * @param string $ciphertext 密文（base64编码，包含IV）
     * @return string 解密后的明文
     * @throws \RuntimeException
     */
    public static function decrypt(string $ciphertext): string
    {
        if (empty($ciphertext)) {
            return '';
        }

        $config = config('encryption', []);
        $keyString = $config['aes']['key'] ?? '';
        $cipher = $config['aes']['cipher'] ?? 'AES-256-CBC';
        $ivLength = $config['aes']['iv_length'] ?? 16;

        if (empty($keyString)) {
            throw new \InvalidArgumentException('加密密钥配置错误，密钥不能为空');
        }

        // 使用 SHA256 哈希处理密钥，确保密钥长度为32字节
        // 即使原始密钥长度不够，哈希后也会得到固定长度的密钥
        $key = substr(hash('sha256', $keyString), 0, 32);

        // 解码base64
        $data = base64_decode($ciphertext, true);
        if ($data === false) {
            throw new \RuntimeException('密文格式错误（base64解码失败）');
        }

        // 提取IV和密文
        if (strlen($data) < $ivLength) {
            throw new \RuntimeException('密文格式错误（长度不足）');
        }

        $iv = substr($data, 0, $ivLength);
        $encrypted = substr($data, $ivLength);

        // 解密
        $decrypted = openssl_decrypt($encrypted, $cipher, $key, OPENSSL_RAW_DATA, $iv);
        if ($decrypted === false) {
            throw new \RuntimeException('解密失败: ' . openssl_error_string());
        }

        return $decrypted;
    }

    /**
     * 计算字符串的哈希值（用于身份证匹配）
     *
     * @param string $plaintext 明文
     * @return string 哈希值（hex编码）
     */
    public static function hash(string $plaintext): string
    {
        if (empty($plaintext)) {
            return '';
        }

        $config = config('encryption', []);
        $algorithm = $config['hash']['algorithm'] ?? 'sha256';
        $useSalt = $config['hash']['use_salt'] ?? false;
        $salt = $config['hash']['salt'] ?? '';

        $data = $plaintext;
        if ($useSalt && !empty($salt)) {
            $data = $salt . $plaintext;
        }

        return hash($algorithm, $data);
    }

    /**
     * 验证明文是否匹配哈希值
     *
     * @param string $plaintext 明文
     * @param string $hash 哈希值
     * @return bool
     */
    public static function verifyHash(string $plaintext, string $hash): bool
    {
        $calculatedHash = self::hash($plaintext);
        return hash_equals($calculatedHash, $hash);
    }
}

