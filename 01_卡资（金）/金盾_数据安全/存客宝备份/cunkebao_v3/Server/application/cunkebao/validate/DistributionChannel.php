<?php

namespace app\cunkebao\validate;

use think\Validate;

/**
 * 分销渠道验证器
 */
class DistributionChannel extends Validate
{
    protected $rule = [
        'name' => 'require|length:1,50',
        'phone' => 'regex:^1[3-9]\d{9}$',
        'wechatId' => 'max:50',
        'remarks' => 'max:200',
    ];

    protected $message = [
        'name.require' => '渠道名称不能为空',
        'name.length' => '渠道名称长度必须在1-50个字符之间',
        'phone.regex' => '手机号格式不正确，请输入11位数字且以1开头',
        'wechatId.max' => '微信号长度不能超过50个字符',
        'remarks.max' => '备注信息长度不能超过200个字符',
    ];

    protected $scene = [
        'create' => ['name', 'phone', 'wechatId', 'remarks'],
    ];
}

