<?php

namespace app\chukebao\model;

use think\Model;
class TokensCompany extends Model
{
    protected $pk = 'id';
    protected $name  = 'tokens_company';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';


}