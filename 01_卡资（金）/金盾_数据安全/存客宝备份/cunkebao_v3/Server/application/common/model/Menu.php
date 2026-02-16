<?php

namespace app\common\model;

use think\Model;

/**
 * 菜单模型类
 */
class Menu extends Model
{
    const STATUS_ACTIVE = 1;
    const TOP_LEVEL = 0;

    // 设置数据表名
    protected $name = 'menus';
}