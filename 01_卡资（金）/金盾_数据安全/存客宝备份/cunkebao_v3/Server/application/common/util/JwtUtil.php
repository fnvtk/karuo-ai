<?php
namespace app\common\util;

use think\facade\Config;
use think\facade\Request;

/**
 * JWT工具类
 * 用于生成和验证JWT令牌
 */
class JwtUtil
{
    /**
     * 密钥
     * @var string
     */
    protected static $secret = 'YiShi@2023#JWT';

    /**
     * 头部
     * @var array
     */
    protected static $header = [
        'alg' => 'HS256', // 加密算法
        'typ' => 'JWT'    // 类型
    ];

    /**
     * 创建JWT令牌
     * @param array $payload 载荷信息
     * @param int $expire 过期时间(秒)，默认2小时
     * @return string
     */
    public static function createToken($payload, $expire = 7200)
    {
        $header = self::base64UrlEncode(json_encode(self::$header, JSON_UNESCAPED_UNICODE));
        
        // 附加过期时间
        $payload['exp'] = time() + $expire;
        $payload['iat'] = time(); // 签发时间

        unset($payload['passwordMd5']);

        $payload = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
        $signature = self::signature($header . '.' . $payload, self::$secret);
        
        return $header . '.' . $payload . '.' . $signature;
    }

    /**
     * 验证令牌
     * @param string $token 令牌
     * @return array|bool 验证通过返回载荷信息，失败返回false
     */
    public static function verifyToken($token)
    {
        if (empty($token)) {
            return false;
        }

        $tokenArray = explode('.', $token);
        if (count($tokenArray) != 3) {
            return false;
        }

        list($header, $payload, $signature) = $tokenArray;
        
        // 验证签名
        if (self::signature($header . '.' . $payload, self::$secret) !== $signature) {
            return false;
        }

        // 解码载荷
        $payload = json_decode(self::base64UrlDecode($payload), true);
        
        // 验证是否过期
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    /**
     * 生成签名
     * @param string $input 输入
     * @param string $key 密钥
     * @return string
     */
    private static function signature($input, $key)
    {
        return self::base64UrlEncode(hash_hmac('sha256', $input, $key, true));
    }

    /**
     * URL安全的Base64编码
     * @param string $input
     * @return string
     */
    private static function base64UrlEncode($input)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($input));
    }

    /**
     * URL安全的Base64解码
     * @param string $input
     * @return string
     */
    private static function base64UrlDecode($input)
    {
        $remainder = strlen($input) % 4;
        if ($remainder) {
            $input .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $input));
    }

    /**
     * 从请求头中获取Token
     * @return string|null
     */
    public static function getRequestToken()
    {
        $authorization = Request::header('Authorization');
        if (!$authorization) {
            return null;
        }
        
        // 检查Bearer前缀
        if (strpos($authorization, 'Bearer ') !== 0) {
            return null;
        }
        
        return substr($authorization, 7);
    }
} 