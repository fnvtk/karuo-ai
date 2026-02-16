<?php

namespace app\common\service;

use think\facade\Cache;
use think\facade\Log;

/**
 * 短信服务类
 */
class SmsService
{
    /**
     * 验证码有效期（秒）
     */
    const CODE_EXPIRE = 300;

    /**
     * 验证码长度
     */
    const CODE_LENGTH = 4;

    /**
     * 发送验证码
     * @param string $mobile 手机号
     * @param string $type 验证码类型 (login, register)
     * @return array
     * @throws \Exception
     */
    public function sendCode($mobile, $type)
    {
        // 检查发送频率限制
        $this->checkSendLimit($mobile, $type);

        // 生成验证码
        $code = $this->generateCode();

        // 缓存验证码
        $this->saveCode($mobile, $code, $type);

        // 发送验证码（实际项目中对接短信平台）
        $this->doSend($mobile, $code, $type);

        // 记录日志
        Log::info('发送验证码', [
            'mobile' => $mobile,
            'type' => $type,
            'code' => $code
        ]);

        return [
            'mobile' => $mobile,
            'expire' => self::CODE_EXPIRE,
            // 测试环境返回验证码，生产环境不应返回
            'code' => $code
        ];
    }

    /**
     * 验证验证码
     * @param string $mobile 手机号
     * @param string $code 验证码（可能是加密后的）
     * @param string $type 验证码类型
     * @param bool $isEncrypted 验证码是否已加密
     * @return bool
     */
    public function verifyCode($mobile, $code, $type, $isEncrypted = false)
    {
        $cacheKey = $this->getCodeCacheKey($mobile, $type);
        $cacheCode = Cache::get($cacheKey);

        if (!$cacheCode) {
            Log::info('验证码不存在或已过期', [
                'mobile' => $mobile,
                'type' => $type
            ]);
            return false;
        }

        // 验证码是否匹配
        $isValid = false;

        if ($isEncrypted) {
            // 前端已加密，需要对缓存中的验证码进行相同的加密处理
            $encryptedCacheCode = $this->encryptCode($cacheCode);
            $isValid = hash_equals($encryptedCacheCode, $code);

            // 记录日志
            Log::info('加密验证码验证', [
                'mobile' => $mobile,
                'cache_code' => $cacheCode,
                'encrypted_cache_code' => $encryptedCacheCode,
                'input_code' => $code,
                'is_valid' => $isValid
            ]);
        } else {
            // 未加密，直接比较
            $isValid = ($cacheCode === $code);

            // 记录日志
            Log::info('明文验证码验证', [
                'mobile' => $mobile,
                'cache_code' => $cacheCode,
                'input_code' => $code,
                'is_valid' => $isValid
            ]);
        }

        // 验证成功后删除缓存
        if ($isValid) {
            Cache::rm($cacheKey);
        }

        return $isValid;
    }

    /**
     * 检查发送频率限制
     * @param string $mobile 手机号
     * @param string $type 验证码类型
     * @throws \Exception
     */
    protected function checkSendLimit($mobile, $type)
    {
        $cacheKey = $this->getCodeCacheKey($mobile, $type);

        // 检查是否存在未过期的验证码
        if (Cache::has($cacheKey)) {
            throw new \Exception('验证码已发送，请稍后再试');
        }

        // 检查当日发送次数限制
        $limitKey = "sms_limit:{$mobile}:" . date('Ymd');
        $sendCount = Cache::get($limitKey, 0);

        if ($sendCount >= 10) {
            throw new \Exception('今日发送次数已达上限');
        }

        // 更新发送次数
        Cache::set($limitKey, $sendCount + 1, 86400);
    }

    /**
     * 生成随机验证码
     * @return string
     */
    protected function generateCode()
    {
        // 生成4位数字验证码
        return sprintf("%0" . self::CODE_LENGTH . "d", mt_rand(0, pow(10, self::CODE_LENGTH) - 1));
    }

    /**
     * 保存验证码到缓存
     * @param string $mobile 手机号
     * @param string $code 验证码
     * @param string $type 验证码类型
     */
    protected function saveCode($mobile, $code, $type)
    {
        $cacheKey = $this->getCodeCacheKey($mobile, $type);
        Cache::set($cacheKey, $code, self::CODE_EXPIRE);
    }

    /**
     * 执行发送验证码
     * @param string $mobile 手机号
     * @param string $code 验证码
     * @param string $type 验证码类型
     * @return bool
     */
    protected function doSend($mobile, $code, $type)
    {
        // 实际项目中对接短信平台API
        // 这里仅做模拟，返回成功
        return true;
    }

    /**
     * 获取验证码缓存键名
     * @param string $mobile 手机号
     * @param string $type 验证码类型
     * @return string
     */
    protected function getCodeCacheKey($mobile, $type)
    {
        return "sms_code:{$mobile}:{$type}";
    }

    /**
     * 加密验证码
     * 使用与前端相同的加密算法
     * @param string $code 原始验证码
     * @return string 加密后的验证码
     */
    protected function encryptCode($code)
    {
        // 使用与前端相同的加密算法
        $salt = 'yishi_salt_2024'; // 与前端相同的盐值
        return hash('sha256', $code . $salt);
    }
} 