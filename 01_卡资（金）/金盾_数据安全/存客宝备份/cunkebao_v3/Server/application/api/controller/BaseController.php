<?php

namespace app\api\controller;

use think\Controller;
use think\facade\Env;
use app\common\service\AuthService;

class BaseController extends Controller
{
    /**
     * 令牌
     *
     * @var string
     */
    protected $token = '';
    protected $baseUrl;
    protected $authorization = '';

    public function __construct()
    {
        parent::__construct();
        $this->baseUrl = Env::get('api.wechat_url');
        $this->authorization = AuthService::getSystemAuthorization();
    }
}
