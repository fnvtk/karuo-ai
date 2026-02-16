<?php

namespace app\utils;

use Monolog\Processor\ProcessorInterface;

/**
 * 日志脱敏处理器
 *
 * 自动对日志中的敏感信息进行脱敏处理
 * 兼容 Monolog 2.x（使用 array 格式）
 */
class LogMaskingProcessor implements ProcessorInterface
{
    /**
     * 敏感字段列表
     *
     * @var array<string>
     */
    protected array $sensitiveFields = [
        'id_card',
        'id_card_encrypted',
        'id_card_hash',
        'phone',
        'email',
        'password',
        'token',
        'secret',
    ];

    /**
     * 处理日志记录，对敏感信息进行脱敏
     *
     * @param array<string, mixed> $record Monolog 2.x 格式的日志记录数组
     * @return array<string, mixed> 处理后的日志记录数组
     */
    public function __invoke(array $record): array
    {
        // 处理 context 中的敏感信息
        if (isset($record['context']) && is_array($record['context'])) {
            $record['context'] = $this->maskArray($record['context']);
        }

        // 处理 extra 中的敏感信息
        if (isset($record['extra']) && is_array($record['extra'])) {
            $record['extra'] = $this->maskArray($record['extra']);
        }

        // 对消息本身也进行脱敏（如果包含敏感信息）
        if (isset($record['message']) && is_string($record['message'])) {
            $record['message'] = $this->maskString($record['message']);
        }

        return $record;
    }

    /**
     * 脱敏数组中的敏感字段
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    protected function maskArray(array $data): array
    {
        $masked = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower($key);
            
            // 检查字段名是否包含敏感关键词
            $isSensitive = false;
            foreach ($this->sensitiveFields as $field) {
                if (strpos($lowerKey, $field) !== false) {
                    $isSensitive = true;
                    break;
                }
            }

            if ($isSensitive && is_string($value)) {
                // 根据字段类型选择脱敏方法
                if (strpos($lowerKey, 'phone') !== false) {
                    $masked[$key] = DataMaskingHelper::maskPhone($value);
                } elseif (strpos($lowerKey, 'email') !== false) {
                    $masked[$key] = DataMaskingHelper::maskEmail($value);
                } elseif (strpos($lowerKey, 'id_card') !== false) {
                    $masked[$key] = DataMaskingHelper::maskIdCard($value);
                } else {
                    // 其他敏感字段，用*替代
                    $masked[$key] = str_repeat('*', min(strlen($value), 20));
                }
            } elseif (is_array($value)) {
                $masked[$key] = $this->maskArray($value);
            } else {
                $masked[$key] = $value;
            }
        }
        return $masked;
    }

    /**
     * 脱敏字符串中的敏感信息（简单模式，匹配常见格式）
     *
     * @param string $message
     * @return string
     */
    protected function maskString(string $message): string
    {
        // 匹配身份证号（18位或15位数字）
        $message = preg_replace_callback(
            '/\b\d{15}(\d{3})?[Xx]?\b/',
            function ($matches) {
                return DataMaskingHelper::maskIdCard($matches[0]);
            },
            $message
        );

        // 匹配手机号（11位数字，1开头）
        $message = preg_replace_callback(
            '/\b1[3-9]\d{9}\b/',
            function ($matches) {
                return DataMaskingHelper::maskPhone($matches[0]);
            },
            $message
        );

        // 匹配邮箱
        $message = preg_replace_callback(
            '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/',
            function ($matches) {
                return DataMaskingHelper::maskEmail($matches[0]);
            },
            $message
        );

        return $message;
    }
}

