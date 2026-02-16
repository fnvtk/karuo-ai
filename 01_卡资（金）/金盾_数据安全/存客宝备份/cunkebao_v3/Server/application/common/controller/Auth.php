<?php
namespace app\common\controller;

use app\common\service\AuthService;
use library\ResponseHelper;
use think\Controller;
use think\facade\Request;

/**
 * 认证控制器
 * 处理用户登录和身份验证
 */
class Auth extends Controller
{
    /**
     * 允许跨域请求的域名
     * @var string
     */
    protected $allowOrigin = '*';
    
    /**
     * 认证服务实例
     * @var AuthService
     */
    protected $authService;
    
    /**
     * 初始化
     */
    public function initialize()
    {
        parent::initialize();
        
        // 由全局中间件处理跨域，此处不再处理
        
        // 初始化认证服务
        $this->authService = new AuthService();
    }
    
    /**
     * 用户登录
     * @return \think\response\Json
     */
    public function login()
    {
        // 获取登录参数
        $params = Request::only(['account', 'password', 'typeId']);

        // 参数验证
        $validate = validate('common/Auth');
        if (!$validate->scene('login')->check($params)) {
            return ResponseHelper::error($validate->getError());
        }
        
        try {
            // 调用登录服务
            $result = $this->authService->login(
                $params['account'],
                $params['password'],
                $params['typeId'],
                Request::ip()
            );

            return ResponseHelper::success($result, '登录成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
    
    /**
     * 手机号验证码登录
     * @return \think\response\Json
     */
    public function mobileLogin()
    {
        // 获取登录参数
        $params = Request::only(['account', 'code', 'typeId']);
        
        // 参数验证
        $validate = validate('common/Auth');
        if (!$validate->scene('mobile_login')->check($params)) {
            return ResponseHelper::error($validate->getError());
        }

        try {
            // 判断验证码是否已加密
            $isEncrypted = isset($params['is_encrypted']) && $params['is_encrypted'] === true;
            
            // 调用手机号登录服务
            $result = $this->authService->mobileLogin(
                $params['account'],
                $params['code'],
                Request::ip(),
                $isEncrypted
            );
            
            return ResponseHelper::success($result, '登录成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
    
    /**
     * 发送验证码
     * @return \think\response\Json
     */
    public function sendCode()
    {
        // 获取参数
        $params = Request::only(['account', 'type']);
        
        // 参数验证
        $validate = validate('common/Auth');
        if (!$validate->scene('send_code')->check($params)) {
            return ResponseHelper::error($validate->getError());
        }
        
        try {
            // 调用发送验证码服务
            $result = $this->authService->sendLoginCode(
                $params['account'],
                $params['type']
            );
            return ResponseHelper::success($result, '验证码发送成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
    
    /**
     * 获取用户信息
     * @return \think\response\Json
     */
    public function info()
    {
        try {
            $result = $this->authService->getUserInfo(request()->userInfo);
            return ResponseHelper::success($result);
        } catch (\Exception $e) {
            return ResponseHelper::unauthorized($e->getMessage());
        }
    }
    
    /**
     * 刷新令牌
     * @return \think\response\Json
     */
    public function refresh()
    {
        try {
            $result = $this->authService->refreshToken(request()->userInfo);
            return ResponseHelper::success($result, '刷新成功');
        } catch (\Exception $e) {
            return ResponseHelper::unauthorized($e->getMessage());
        }
    }
} 