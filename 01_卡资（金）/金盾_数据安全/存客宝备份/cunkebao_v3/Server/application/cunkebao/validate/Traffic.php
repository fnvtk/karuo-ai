<?php
namespace app\cunkebao\validate;

use think\Validate;

/**
 * 流量验证器
 */
class Traffic extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'mobile'         => 'require|mobile',
        'gender'         => 'in:0,1,2',
        'age'            => 'number|between:0,120',
        'tags'           => 'max:255',
        'province'       => 'max:50',
        'city'           => 'max:50',
        'source_channel' => 'max:50',
        'source_detail'  => 'array'
    ];
    
    /**
     * 错误信息
     * @var array
     */
    protected $message = [
        'mobile.require'     => '手机号不能为空',
        'mobile.mobile'      => '手机号格式不正确',
        'gender.in'          => '性别值无效',
        'age.number'         => '年龄必须是数字',
        'age.between'        => '年龄必须在0到120之间',
        'tags.max'           => '标签不能超过255个字符',
        'province.max'       => '省份不能超过50个字符',
        'city.max'           => '城市不能超过50个字符',
        'source_channel.max' => '来源渠道不能超过50个字符',
        'source_detail.array'=> '来源详情必须是数组'
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'create' => ['mobile', 'gender', 'age', 'tags', 'province', 'city', 'source_channel', 'source_detail'],
        'update' => ['gender', 'age', 'tags', 'province', 'city']
    ];
} 