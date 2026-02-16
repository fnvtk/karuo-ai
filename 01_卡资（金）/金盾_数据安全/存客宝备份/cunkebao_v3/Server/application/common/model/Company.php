<?php
namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 项目模型
 */
class Company extends Model
{
    use SoftDelete;

    // 设置数据表名
    protected $name = 'company';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;
}