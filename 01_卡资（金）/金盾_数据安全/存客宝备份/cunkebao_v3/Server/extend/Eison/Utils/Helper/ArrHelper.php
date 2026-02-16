<?php

namespace Eison\Utils\Helper;

/**
 * 数组辅助类
 */
class ArrHelper
{
    /**
     * 从数组中提取指定的键值
     * 
     * @param string $keys 键名，多个用逗号分隔，支持键名映射（如：account=userName）
     * @param array $array 源数组
     * @param mixed $default 默认值，如果键不存在时返回此值
     * @return array
     */
    public static function getValue(string $keys, array $array, $default = null): array
    {
        $result = [];
        $keyList = explode(',', $keys);
        
        foreach ($keyList as $key) {
            $key = trim($key);
            
            // 支持键名映射：account=userName
            if (strpos($key, '=') !== false) {
                list($sourceKey, $targetKey) = explode('=', $key, 2);
                $sourceKey = trim($sourceKey);
                $targetKey = trim($targetKey);
                
                // 如果源键存在，使用源键的值；否则使用目标键的值；都不存在则使用默认值
                if (isset($array[$sourceKey])) {
                    $result[$targetKey] = $array[$sourceKey];
                } elseif (isset($array[$targetKey])) {
                    $result[$targetKey] = $array[$targetKey];
                } else {
                    // 如果提供了默认值，使用默认值；否则不添加该键
                    if ($default !== null) {
                        $result[$targetKey] = $default;
                    }
                }
            } else {
                // 普通键名
                if (isset($array[$key])) {
                    $result[$key] = $array[$key];
                } else {
                    // 如果提供了默认值，使用默认值；否则不添加该键
                    if ($default !== null) {
                        $result[$key] = $default;
                    }
                }
            }
        }
        
        return $result;
    }

    /**
     * 移除数组中的空值（null、空字符串、空数组）
     * 
     * @param array $array 源数组
     * @return array
     */
    public static function rmValue(array $array): array
    {
        return array_filter($array, function($value) {
            if (is_array($value)) {
                return !empty($value);
            }
            return $value !== null && $value !== '';
        });
    }

    /**
     * 左连接两个数组
     * 
     * @param array $leftArray 左数组
     * @param array $rightArray 右数组
     * @param string $key 关联键名
     * @return array
     */
    public static function leftJoin(array $leftArray, array $rightArray, string $key): array
    {
        // 将右数组按关联键索引
        $rightIndexed = [];
        foreach ($rightArray as $item) {
            if (isset($item[$key])) {
                $rightIndexed[$item[$key]] = $item;
            }
        }
        
        // 左连接
        $result = [];
        foreach ($leftArray as $leftItem) {
            $leftKeyValue = $leftItem[$key] ?? null;
            if ($leftKeyValue !== null && isset($rightIndexed[$leftKeyValue])) {
                $result[] = array_merge($leftItem, $rightIndexed[$leftKeyValue]);
            } else {
                $result[] = $leftItem;
            }
        }
        
        return $result;
    }

    /**
     * 将数组的某一列作为键，重新组织数组
     * 
     * @param string $key 作为键的列名
     * @param array $array 源数组
     * @return array
     */
    public static function columnTokey(string $key, array $array): array
    {
        $result = [];
        foreach ($array as $item) {
            if (isset($item[$key])) {
                $result[$item[$key]] = $item;
            }
        }
        return $result;
    }
}

