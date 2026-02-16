<?php
// common模块路由配置

use think\facade\Route;

// 定义RESTful风格的API路由 - 认证相关
Route::group('v1/auth', function () {
    // 无需认证的接口
    Route::post('login', 'app\common\controller\PasswordLoginController@index'); // 账号密码登录
    Route::post('mobile-login', 'app\common\controller\Auth@mobileLogin');       // 手机号验证码登录
    Route::post('code', 'app\common\controller\Auth@SendCodeController');        // 发送验证码
    // 需要JWT认证的接口
    Route::get('info', 'app\common\controller\Auth@info')->middleware(['jwt']); // 获取用户信息
    Route::post('refresh', 'app\common\controller\Auth@refresh')->middleware(['jwt']); // 刷新令牌
});

// 附件上传相关路由
Route::group('v1/', function () {
    Route::post('attachment/upload', 'app\common\controller\Attachment@upload');  // 上传附件
    Route::get('attachment/:id', 'app\common\controller\Attachment@info');        // 获取附件信息
})->middleware(['jwt']);



Route::group('v1/pay', function () {
    Route::post('', 'app\cunkebao\controller\Pay@createOrder')->middleware(['jwt']); 
    Route::any('notify', 'app\common\controller\PaymentService@notify');
});




Route::get('v1/app/update', 'app\common\controller\Api@uploadApp'); //检测app是否需要更新