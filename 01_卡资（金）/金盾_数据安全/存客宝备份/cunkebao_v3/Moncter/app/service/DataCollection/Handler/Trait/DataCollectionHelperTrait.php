<?php

namespace app\service\DataCollection\Handler\Trait;

use MongoDB\BSON\UTCDateTime;

/**
 * 数据采集辅助方法 Trait
 * 
 * 提供通用的工具方法给各个 Handler 使用
 */
trait DataCollectionHelperTrait
{
    /**
     * 将 MongoDB 文档转换为数组
     * 
     * @param mixed $document MongoDB 文档对象或数组
     * @return array<string, mixed> 数组格式的数据
     */
    protected function convertMongoDocumentToArray($document): array
    {
        if (is_array($document)) {
            return $document;
        }

        if (is_object($document) && method_exists($document, 'toArray')) {
            return $document->toArray();
        }

        return json_decode(json_encode($document), true) ?? [];
    }

    /**
     * 解析日期时间字符串
     * 
     * @param mixed $dateTimeStr 日期时间字符串或对象
     * @return \DateTimeImmutable|null 解析后的日期时间对象
     */
    protected function parseDateTime($dateTimeStr): ?\DateTimeImmutable
    {
        if (empty($dateTimeStr)) {
            return null;
        }

        // 如果是 MongoDB 的 UTCDateTime 对象
        if ($dateTimeStr instanceof UTCDateTime) {
            return \DateTimeImmutable::createFromMutable($dateTimeStr->toDateTime());
        }

        // 如果是 DateTime 对象
        if ($dateTimeStr instanceof \DateTime || $dateTimeStr instanceof \DateTimeImmutable) {
            if ($dateTimeStr instanceof \DateTime) {
                return \DateTimeImmutable::createFromMutable($dateTimeStr);
            }
            return $dateTimeStr;
        }

        // 尝试解析字符串
        try {
            return new \DateTimeImmutable((string)$dateTimeStr);
        } catch (\Exception $e) {
            \app\utils\LoggerHelper::logBusiness('datetime_parse_failed', [
                'input' => $dateTimeStr,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析金额
     * 
     * @param mixed $amount 金额字符串或数字
     * @return float 解析后的金额
     */
    protected function parseAmount($amount): float
    {
        if (is_numeric($amount)) {
            return (float)$amount;
        }

        if (is_string($amount)) {
            // 移除所有非数字字符（除了小数点）
            $cleaned = preg_replace('/[^\d.]/', '', $amount);
            return (float)$cleaned;
        }

        return 0.0;
    }

    /**
     * 过滤手机号中的非数字字符
     * 
     * @param string $phoneNumber 原始手机号
     * @return string 过滤后的手机号（只包含数字）
     */
    protected function filterPhoneNumber(string $phoneNumber): string
    {
        // 移除所有非数字字符
        return preg_replace('/\D/', '', $phoneNumber);
    }

    /**
     * 验证手机号格式
     * 
     * @param string $phone 手机号（已经过滤过非数字字符）
     * @return bool 是否有效（11位数字，1开头）
     */
    protected function isValidPhone(string $phone): bool
    {
        // 如果为空，直接返回 false
        if (empty($phone)) {
            return false;
        }
        
        // 中国大陆手机号：11位数字，以1开头
        return preg_match('/^1[3-9]\d{9}$/', $phone) === 1;
    }

    /**
     * 根据消费时间生成月份集合名
     * 
     * @param string $baseCollectionName 基础集合名
     * @param mixed $dateTimeStr 日期时间字符串或对象
     * @return string 带月份后缀的集合名（如：consumption_records_202512）
     */
    protected function getMonthlyCollectionName(string $baseCollectionName, $dateTimeStr = null): string
    {
        $consumeTime = $this->parseDateTime($dateTimeStr);
        if ($consumeTime === null) {
            $consumeTime = new \DateTimeImmutable();
        }
        $monthSuffix = $consumeTime->format('Ym');
        return "{$baseCollectionName}_{$monthSuffix}";
    }

    /**
     * 转换为 MongoDB UTCDateTime
     * 
     * @param mixed $dateTimeStr 日期时间字符串或对象
     * @return UTCDateTime|null MongoDB UTCDateTime 对象
     */
    protected function convertToUTCDateTime($dateTimeStr): ?UTCDateTime
    {
        if (empty($dateTimeStr)) {
            return null;
        }

        // 如果已经是 UTCDateTime，直接返回
        if ($dateTimeStr instanceof UTCDateTime) {
            return $dateTimeStr;
        }

        // 如果是 DateTime 对象
        if ($dateTimeStr instanceof \DateTime || $dateTimeStr instanceof \DateTimeImmutable) {
            return new UTCDateTime($dateTimeStr->getTimestamp() * 1000);
        }

        // 尝试解析字符串
        try {
            $dateTime = new \DateTimeImmutable((string)$dateTimeStr);
            return new UTCDateTime($dateTime->getTimestamp() * 1000);
        } catch (\Exception $e) {
            \app\utils\LoggerHelper::logBusiness('convert_to_utcdatetime_failed', [
                'input' => $dateTimeStr,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}

