<?php

namespace app\common\util;



/**
 * 支付工具类
 * 用于处理第三方支付相关功能
 * 仅限内部调用
 */
class PaymentUtil
{
    /**
     * 签名算法类型
     */
    const SIGN_TYPE_MD5 = 'MD5';
    const SIGN_TYPE_RSA_1_256 = 'RSA_1_256';
    const SIGN_TYPE_RSA_1_1 = 'RSA_1_1';

    /**
     * 生成支付签名
     * 
     * @param array $params 待签名参数
     * @param string $secretKey 签名密钥
     * @param string $signType 签名类型 MD5/RSA_1_256/RSA_1_1
     * @return string 签名结果
     */
    public static function generateSign(array $params, string $secretKey, string $signType = self::SIGN_TYPE_MD5): string
    {
        // 1. 移除sign字段
        unset($params['sign']);
        
        // 2. 过滤空值
        $params = array_filter($params, function($value) {
            return $value !== '' && $value !== null;
        });
        
        // 3. 按字段名ASCII码从小到大排序
        ksort($params);
        
        // 4. 拼接成QueryString格式
        $queryString = self::buildQueryString($params);
        
        // 5. 根据签名类型生成签名
        switch (strtoupper($signType)) {
            case self::SIGN_TYPE_MD5:
                return self::generateMd5Sign($queryString, $secretKey);
            case self::SIGN_TYPE_RSA_1_256:
                return self::generateRsa256Sign($queryString, $secretKey);
            case self::SIGN_TYPE_RSA_1_1:
                return self::generateRsa1Sign($queryString, $secretKey);
            default:
                throw new \InvalidArgumentException('不支持的签名类型: ' . $signType);
        }
    }

    /**
     * 验证支付签名
     * 
     * @param array $params 待验证参数（包含sign字段）
     * @param string $secretKey 签名密钥
     * @param string $signType 签名类型
     * @return bool 验证结果
     */
    public static function verifySign(array $params, string $secretKey, string $signType = self::SIGN_TYPE_MD5): bool
    {
        if (!isset($params['sign'])) {
            return false;
        }
        
        $receivedSign = $params['sign'];
        $generatedSign = self::generateSign($params, $secretKey, $signType);
        
        return $receivedSign === $generatedSign;
    }

    /**
     * 构建QueryString
     * 
     * @param array $params 参数数组
     * @return string QueryString
     */
    private static function buildQueryString(array $params): string
    {
        $pairs = [];
        foreach ($params as $key => $value) {
            $pairs[] = $key . '=' . $value;
        }
        return implode('&', $pairs);
    }

    /**
     * 生成MD5签名
     * 
     * @param string $queryString 待签名字符串
     * @param string $secretKey 密钥
     * @return string MD5签名
     */
    private static function generateMd5Sign(string $queryString, string $secretKey): string
    {
        $signString = $queryString . '&key=' . $secretKey;
        return strtoupper(md5($signString));
    }

    /**
     * 生成RSA256签名
     * 
     * @param string $queryString 待签名字符串
     * @param string $privateKey 私钥
     * @return string RSA256签名
     */
    private static function generateRsa256Sign(string $queryString, string $privateKey): string
    {
        $privateKey = self::formatPrivateKey($privateKey);
        $key = openssl_pkey_get_private($privateKey);
        if (!$key) {
            throw new \Exception('RSA私钥格式错误');
        }
        
        $signature = '';
        $result = openssl_sign($queryString, $signature, $key, OPENSSL_ALGO_SHA256);
        openssl_pkey_free($key);
        
        if (!$result) {
            throw new \Exception('RSA256签名失败');
        }
        
        return base64_encode($signature);
    }

    /**
     * 生成RSA1签名
     * 
     * @param string $queryString 待签名字符串
     * @param string $privateKey 私钥
     * @return string RSA1签名
     */
    private static function generateRsa1Sign(string $queryString, string $privateKey): string
    {
        $privateKey = self::formatPrivateKey($privateKey);
        $key = openssl_pkey_get_private($privateKey);
        if (!$key) {
            throw new \Exception('RSA私钥格式错误');
        }
        
        $signature = '';
        $result = openssl_sign($queryString, $signature, $key, OPENSSL_ALGO_SHA1);
        openssl_pkey_free($key);
        
        if (!$result) {
            throw new \Exception('RSA1签名失败');
        }
        
        return base64_encode($signature);
    }

    /**
     * 格式化私钥
     * 
     * @param string $privateKey 原始私钥
     * @return string 格式化后的私钥
     */
    private static function formatPrivateKey(string $privateKey): string
    {
        $privateKey = str_replace(['-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----', "\n", "\r"], '', $privateKey);
        $privateKey = chunk_split($privateKey, 64, "\n");
        return "-----BEGIN PRIVATE KEY-----\n" . $privateKey . "-----END PRIVATE KEY-----";
    }

    /**
     * 格式化公钥
     * 
     * @param string $publicKey 原始公钥
     * @return string 格式化后的公钥
     */
    private static function formatPublicKey(string $publicKey): string
    {
        $publicKey = str_replace(['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----', "\n", "\r"], '', $publicKey);
        $publicKey = chunk_split($publicKey, 64, "\n");
        return "-----BEGIN PUBLIC KEY-----\n" . $publicKey . "-----END PUBLIC KEY-----";
    }

    /**
     * 验证RSA签名
     * 
     * @param string $queryString 原始字符串
     * @param string $signature 签名
     * @param string $publicKey 公钥
     * @param string $signType 签名类型
     * @return bool 验证结果
     */
    public static function verifyRsaSign(string $queryString, string $signature, string $publicKey, string $signType = self::SIGN_TYPE_RSA_1_256): bool
    {
        $publicKey = self::formatPublicKey($publicKey);
        $key = openssl_pkey_get_public($publicKey);
        if (!$key) {
            return false;
        }
        
        $algorithm = $signType === self::SIGN_TYPE_RSA_1_1 ? OPENSSL_ALGO_SHA1 : OPENSSL_ALGO_SHA256;
        $result = openssl_verify($queryString, base64_decode($signature), $key, $algorithm);
        openssl_pkey_free($key);
        
        return $result === 1;
    }

    /**
     * 生成随机字符串
     * 
     * @param int $length 长度
     * @return string 随机字符串
     */
    public static function generateNonceStr(int $length = 32): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $str = '';
        for ($i = 0; $i < $length; $i++) {
            $str .= $chars[mt_rand(0, strlen($chars) - 1)];
        }
        return $str;
    }

    /**
     * 生成时间戳
     * 
     * @return int 时间戳
     */
    public static function generateTimestamp(): int
    {
        return time();
    }

    /**
     * 格式化金额（分转元）
     * 
     * @param int $amount 金额（分）
     * @return string 格式化后的金额（元）
     */
    public static function formatAmount(int $amount): string
    {
        return number_format($amount / 100, 2, '.', '');
    }

    /**
     * 解析金额（元转分）
     * 
     * @param string $amount 金额（元）
     * @return int 金额（分）
     */
    public static function parseAmount(string $amount): int
    {
        return (int) round(floatval($amount) * 100);
    }
}
