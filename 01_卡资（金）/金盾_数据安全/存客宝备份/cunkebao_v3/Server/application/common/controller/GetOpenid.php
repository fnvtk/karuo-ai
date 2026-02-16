<?php

namespace app\common\controller;

use EasyWeChat\Factory;
use think\Controller;
use think\facade\Env;
class GetOpenid extends Controller
{

    protected $app;
    public function __construct()
    {
        parent::__construct();

        // 从环境变量获取配置
        $config = [
            'app_id' =>  Env::get('weChat.appid'),
            'secret' =>  Env::get('weChat.secret'),
            'response_type' => 'array'
        ];
        $this->app = Factory::officialAccount($config);
    }



    public function index()
    {
        $app = $this->app;
        $oauth = $app->oauth;

        // 未登录
        if (empty($_SESSION['wechat_user'])) {

            $_SESSION['target_url'] = 'user/profile';

            $redirectUrl = $oauth->redirect();

            exit_data($redirectUrl);
            header("Location: {$redirectUrl}");
            exit;
        }

        // 已经登录过
        $user = $_SESSION['wechat_user'];

        exit_data($user);

        return 'Hello, World!';
    }

}