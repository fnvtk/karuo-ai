<?php

namespace app\utils;

/**
 * 身份证工具类
 *
 * 职责：
 * - 从身份证号中提取出生日期
 * - 从身份证号中提取性别
 * - 验证身份证号格式
 */
class IdCardHelper
{
    /**
     * 从身份证号中提取出生日期
     *
     * @param string $idCard 身份证号（15位或18位）
     * @return \DateTimeImmutable|null 出生日期，解析失败返回null
     */
    public static function extractBirthday(string $idCard): ?\DateTimeImmutable
    {
        $idCard = trim($idCard);
        $length = strlen($idCard);
        
        if ($length === 18) {
            // 18位身份证：第7-14位是出生日期（YYYYMMDD）
            $birthDateStr = substr($idCard, 6, 8);
            $year = (int)substr($birthDateStr, 0, 4);
            $month = (int)substr($birthDateStr, 4, 2);
            $day = (int)substr($birthDateStr, 6, 2);
        } elseif ($length === 15) {
            // 15位身份证：第7-12位是出生日期（YYMMDD）
            $birthDateStr = substr($idCard, 6, 6);
            $year = (int)substr($birthDateStr, 0, 2);
            $month = (int)substr($birthDateStr, 2, 2);
            $day = (int)substr($birthDateStr, 4, 2);
            
            // 15位身份证的年份需要加上1900或2000
            // 通常出生年份在1900-2000之间，如果大于当前年份的后两位，则加1900，否则加2000
            $currentYearLastTwo = (int)date('y');
            if ($year > $currentYearLastTwo) {
                $year += 1900;
            } else {
                $year += 2000;
            }
        } else {
            return null;
        }
        
        // 验证日期是否有效
        if (!checkdate($month, $day, $year)) {
            return null;
        }
        
        try {
            return new \DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * 从身份证号中提取性别
     *
     * @param string $idCard 身份证号（15位或18位）
     * @return int 性别：1=男，2=女，0=未知
     */
    public static function extractGender(string $idCard): int
    {
        $idCard = trim($idCard);
        $length = strlen($idCard);
        
        if ($length === 18) {
            // 18位身份证：第17位（索引16）是性别码
            $genderCode = (int)substr($idCard, 16, 1);
        } elseif ($length === 15) {
            // 15位身份证：第15位（索引14）是性别码
            $genderCode = (int)substr($idCard, 14, 1);
        } else {
            return 0; // 未知
        }
        
        // 奇数表示男性，偶数表示女性
        return ($genderCode % 2 === 1) ? 1 : 2;
    }

    /**
     * 从身份证号中提取所有可解析的信息
     *
     * @param string $idCard 身份证号
     * @return array<string, mixed> 包含 birthday 和 gender 的数组
     */
    public static function extractInfo(string $idCard): array
    {
        return [
            'birthday' => self::extractBirthday($idCard),
            'gender' => self::extractGender($idCard),
        ];
    }
}

