<?php

namespace app\utils;

/**
 * 数据脱敏工具类
 *
 * 用于在接口返回和日志中脱敏敏感信息
 */
class DataMaskingHelper
{
    /**
     * 脱敏身份证号
     *
     * @param string|null $idCard 身份证号
     * @return string 脱敏后的身份证号（如：110101********1234）
     */
    public static function maskIdCard(?string $idCard): string
    {
        if (empty($idCard)) {
            return '';
        }

        $config = config('encryption.masking.id_card', []);
        $prefixLength = $config['prefix_length'] ?? 6;
        $suffixLength = $config['suffix_length'] ?? 4;
        $maskChar = $config['mask_char'] ?? '*';

        $length = mb_strlen($idCard);
        if ($length <= $prefixLength + $suffixLength) {
            // 如果长度不足以脱敏，返回全部用*替代
            return str_repeat($maskChar, $length);
        }

        $prefix = mb_substr($idCard, 0, $prefixLength);
        $suffix = mb_substr($idCard, -$suffixLength);
        $maskLength = $length - $prefixLength - $suffixLength;

        return $prefix . str_repeat($maskChar, $maskLength) . $suffix;
    }

    /**
     * 脱敏手机号
     *
     * @param string|null $phone 手机号
     * @return string 脱敏后的手机号（如：138****5678）
     */
    public static function maskPhone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        $config = config('encryption.masking.phone', []);
        $prefixLength = $config['prefix_length'] ?? 3;
        $suffixLength = $config['suffix_length'] ?? 4;
        $maskChar = $config['mask_char'] ?? '*';

        $length = mb_strlen($phone);
        if ($length <= $prefixLength + $suffixLength) {
            return str_repeat($maskChar, $length);
        }

        $prefix = mb_substr($phone, 0, $prefixLength);
        $suffix = mb_substr($phone, -$suffixLength);
        $maskLength = $length - $prefixLength - $suffixLength;

        return $prefix . str_repeat($maskChar, $maskLength) . $suffix;
    }

    /**
     * 脱敏邮箱
     *
     * @param string|null $email 邮箱
     * @return string 脱敏后的邮箱（如：ab***@example.com）
     */
    public static function maskEmail(?string $email): string
    {
        if (empty($email)) {
            return '';
        }

        $config = config('encryption.masking.email', []);
        $prefixLength = $config['prefix_length'] ?? 2;
        $maskChar = $config['mask_char'] ?? '*';

        $atPos = mb_strpos($email, '@');
        if ($atPos === false) {
            // 如果没有@符号，按普通字符串处理
            $length = mb_strlen($email);
            if ($length <= $prefixLength) {
                return str_repeat($maskChar, $length);
            }
            $prefix = mb_substr($email, 0, $prefixLength);
            return $prefix . str_repeat($maskChar, $length - $prefixLength);
        }

        $localPart = mb_substr($email, 0, $atPos);
        $domain = mb_substr($email, $atPos);

        $localLength = mb_strlen($localPart);
        if ($localLength <= $prefixLength) {
            $maskedLocal = str_repeat($maskChar, $localLength);
        } else {
            $prefix = mb_substr($localPart, 0, $prefixLength);
            $maskedLocal = $prefix . str_repeat($maskChar, $localLength - $prefixLength);
        }

        return $maskedLocal . $domain;
    }

    /**
     * 脱敏数组中的敏感字段
     *
     * @param array<string, mixed> $data 数据数组
     * @param array<string> $sensitiveFields 敏感字段列表（如：['id_card', 'phone', 'email']）
     * @return array<string, mixed> 脱敏后的数组
     */
    public static function maskArray(array $data, array $sensitiveFields = ['id_card', 'id_card_encrypted', 'phone', 'email']): array
    {
        $masked = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($masked[$field]) && is_string($masked[$field])) {
                switch ($field) {
                    case 'id_card':
                    case 'id_card_encrypted':
                        $masked[$field] = self::maskIdCard($masked[$field]);
                        break;
                    case 'phone':
                        $masked[$field] = self::maskPhone($masked[$field]);
                        break;
                    case 'email':
                        $masked[$field] = self::maskEmail($masked[$field]);
                        break;
                }
            }
        }

        return $masked;
    }
}

