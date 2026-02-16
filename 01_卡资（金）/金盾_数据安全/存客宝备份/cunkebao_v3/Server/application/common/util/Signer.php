<?php

namespace app\common\util;

/**
 * 第三方支付签名工具（仅内部调用）
 * 规则：
 * 1. 除 sign 外的所有非空参数，按字段名 ASCII 升序，使用 QueryString 形式拼接（key1=value1&key2=value2）
 * 2. 参与签名的字段名与值均为原始值，不做 URL Encode
 * 3. 支持算法：MD5（默认）/ RSA_1_256 / RSA_1_1
 */
class Signer
{
    /**
     * 生成签名
     *
     * @param array $params 参与签名的参数（会自动剔除 sign 及空值）
     * @param string $algorithm 签名算法：md5 | RSA_1_256 | RSA_1_1
     * @param array $options 额外选项：
     *  - secret: string MD5 签名时可选的密钥，若提供则会在原串末尾以 &key=SECRET 追加
     *  - private_key: string RSA 签名所需私钥（PEM 字符串，支持带头尾）
     *  - passphrase: string 可选，RSA 私钥口令
     * @return string 返回签名串（MD5 为32位小写；RSA为base64编码）
     * @throws \InvalidArgumentException
     */
    public static function sign(array $params, $algorithm = 'md5', array $options = [])
    {
        $signString = self::buildSignString($params);

        $algo = strtolower($algorithm);
        switch ($algo) {
            case 'md5':
                return self::signMd5($signString, isset($options['secret']) ? (string)$options['secret'] : null);
            case 'rsa_1_256':
                return self::signRsa($signString, $options, 'sha256');
            case 'rsa_1_1':
                return self::signRsa($signString, $options, 'sha1');
            default:
                throw new \InvalidArgumentException('Unsupported algorithm: ' . $algorithm);
        }
    }

    /**
     * 构建签名原始串
     * - 剔除 sign 字段
     * - 过滤空值（null、''）
     * - 按键名 ASCII 升序
     * - 使用原始值拼接为 key1=value1&key2=value2
     *
     * @param array $params
     * @return string
     */
    public static function buildSignString(array $params)
    {
        $filtered = [];
        foreach ($params as $key => $value) {
            if ($key === 'sign') {
                continue;
            }
            if ($value === '' || $value === null) {
                continue;
            }
            $filtered[$key] = $value;
        }

        ksort($filtered, SORT_STRING);

        $pairs = [];
        foreach ($filtered as $key => $value) {
            // 原始值拼接，不做 urlencode
            $pairs[] = $key . '=' . (is_bool($value) ? ($value ? '1' : '0') : (string)$value);
        }

        return implode('&', $pairs);
    }

    /**
     * MD5 签名
     * - 若提供 secret，则原串末尾追加 &key=SECRET
     * - 返回 32 位小写
     *
     * @param string $signString
     * @param string|null $secret
     * @return string
     */
    protected static function signMd5($signString, $secret = null)
    {
        if ($secret !== null && $secret !== '') {
            $signString .= '&key=' . $secret;
        }
        return strtolower(md5($signString));
    }

    /**
     * RSA 签名
     *
     * @param string $signString
     * @param array $options 必填：private_key，可选：passphrase
     * @param string $hashAlgo sha256|sha1
     * @return string base64 签名
     * @throws \InvalidArgumentException
     */
    protected static function signRsa($signString, array $options, $hashAlgo = 'sha256')
    {
        if (empty($options['private_key'])) {
            throw new \InvalidArgumentException('RSA signing requires private_key.');
        }

        $privateKey = $options['private_key'];
        $passphrase = isset($options['passphrase']) ? (string)$options['passphrase'] : '';

        // 兼容无头尾私钥，自动包裹为 PEM
        if (strpos($privateKey, 'BEGIN') === false) {
            $privateKey = "-----BEGIN PRIVATE KEY-----\n" . trim(chunk_split(str_replace(["\r", "\n"], '', $privateKey), 64, "\n")) . "\n-----END PRIVATE KEY-----";
        }

        $pkeyId = openssl_pkey_get_private($privateKey, $passphrase);
        if ($pkeyId === false) {
            throw new \InvalidArgumentException('Invalid RSA private key or passphrase.');
        }

        $signature = '';
        $algoConst = $hashAlgo === 'sha1' ? OPENSSL_ALGO_SHA1 : OPENSSL_ALGO_SHA256;
        $ok = openssl_sign($signString, $signature, $pkeyId, $algoConst);
        openssl_free_key($pkeyId);

        if (!$ok) {
            throw new \InvalidArgumentException('OpenSSL sign failed.');
        }

        return base64_encode($signature);
    }
}


