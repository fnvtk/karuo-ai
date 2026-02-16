<?php

namespace app\cunkebao\model;

use think\Model;
class TokensPackage extends Model
{
    protected $pk = 'id';
    protected $name  = 'tokens_package';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}