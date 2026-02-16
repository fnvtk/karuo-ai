<?php

namespace app\cunkebao\model;

use think\Model;

class BaseModel extends Model
{
    // 数据插入 duplicate
    public function insertAllDuplicate($data, $duplicate = null, $limit = null)
    {
        if (!empty($duplicate)) {
            if (is_array($duplicate)) {
                $temp = [];
                foreach ($duplicate as $key => $item) {
                    if (is_integer($key)) {
                        $temp[] = "{$item} = VALUES({$item})";
                    } else {
                        $temp[] = "{$key} = {$item}";
                    }
                }
                $duplicate = implode(',', $temp);
            }
        }
        if (!empty($limit)) {
            // 分批写入 自动启动事务支持
            $this->startTrans();

            try {
                // array_chunk 函数把数组分割为新的数组块。
                //其中每个数组的单元数目由 size 参数决定。最后一个数组的单元数目可能会少几个。
                //可选参数 preserve_key 是一个布尔值，它指定新数组的元素是否有和原数组相同的键（用于关联数组），还是从 0 开始的新数字键（用于索引数组）。默认是分配新的键。
                $array = array_chunk($data, $limit, true);
                $count = 0;

                foreach ($array as $item) {
                    $sql = $this->fetchSql(true)->insertAll($item);
                    $sql = preg_replace("/INSERT\s*INTO\s*/", "INSERT IGNORE INTO ", $sql);
                    if (is_string($duplicate)) {
                        $sql = $sql . ' ON DUPLICATE KEY UPDATE ' . $duplicate;
                    }
                    $count += $this->execute($sql); // 获取影响函数
                }
                // 提交事务
                $this->commit();
            } catch (\Exception $e) {
                $this->rollback();
                throw $e;
            }
            return $count;
        } else {
            $sql = $this->fetchSql(true)->insertAll($data);
            $sql = preg_replace("/INSERT\s*INTO\s*/", "INSERT IGNORE INTO ", $sql);
            if (is_string($duplicate)) {
                $sql = $sql . ' ON DUPLICATE KEY UPDATE ' . $duplicate;
            }
            return $this->execute($sql);
        }
    }
}