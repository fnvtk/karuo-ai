<?php
namespace app\common\validate;

use think\Validate;

/**
 * 认证相关验证器
 */
class Auth extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'account' => 'require',
        'password' => 'require|length:6,64',
        'code' => 'require|length:4,6',
        'typeId' => 'require|in:1,2',
    ];

    /**
     * 错误信息
     * @var array
     */
    protected $message = [
        'account.require' => '账号不能为空',
        'password.require' => '密码不能为空',
        'password.length' => '密码长度必须在6-64个字符之间',
        'code.require' => '验证码不能为空',
        'code.length' => '验证码长度必须在4-6个字符之间',
        'typeId.require' => '用户类型不能为空',
        'typeId.in' => '用户类型错误',
    ];

    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'login' => ['account', 'password', 'typeId'],
        'mobile_login' => ['account', 'code', 'typeId'],
        'refresh' => [],
        'send_code' => ['account', 'type'],
    ];
} 