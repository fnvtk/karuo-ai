<?php

namespace app\common\service;

use app\common\model\User as UserModel;
use app\common\util\JwtUtil;
use think\facade\Cache;
use think\facade\Env;
use think\facade\Log;

class AuthService
{
    const TOKEN_EXPIRE = 86400 * 365;

    protected $smsService;

    /**
     * 获取用户基本信息
     *
     * @param string $account
     * @param int $typeId
     * @return UserModel
     */
    protected function getUserProfileWithAccountAndType(string $account, int $typeId): UserModel
    {
        $user = UserModel::where(function ($query) use ($account) {
            $query->where('phone', $account)->whereOr('account', $account);
        })
            ->where(function ($query) use ($typeId) {
                $query->where('status', 1)->where('typeId', $typeId);
            })->find();

        return $user;
    }

    /**
     * 获取用户信息
     *
     * @param string $account 账号（手机号）
     * @param string $password 密码（可能是加密后的）
     * @param int $typeId 身份信息
     * @return array|null
     */
    protected function getUser(string $account, string $password, int $typeId): array
    {
        $user = $this->getUserProfileWithAccountAndType($account, $typeId);

        if (!$user) {
            throw new \Exception('用户不存在或已禁用', 403);
        }

        if ($user->passwordMd5 !== md5($password)) {
            throw new \Exception('账号或密码错误', 403);
        }

        return $user->toArray();
    }

    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->smsService = new SmsService();
    }

    /**
     * 用户登录
     *
     * @param string $account 账号（手机号）
     * @param string $password 密码（可能是加密后的）
     * @param string $ip 登录IP
     * @return array
     * @throws \Exception
     */
    public function login(string $account, string $password, int $typeId, string $ip)
    {
        // 获取用户信息
        $member = $this->getUser($account, $password, $typeId);

        // 生成JWT令牌
        $token = JwtUtil::createToken($user, self::TOKEN_EXPIRE);
        $token_expired = time() + self::TOKEN_EXPIRE;

        return compact('member', 'token', 'token_expired');
    }

    /**
     * 手机号验证码登录
     *
     * @param string $account 手机号
     * @param string $code 验证码（可能是加密后的）
     * @param string $ip 登录IP
     * @param bool $isEncrypted 验证码是否已加密
     * @return array
     * @throws \Exception
     */
    public function mobileLogin($account, $code, $ip, $isEncrypted = false)
    {
        // 验证验证码
        if (!$this->smsService->verifyCode($account, $code, 'login', $isEncrypted)) {
            Log::info('验证码验证失败', ['account' => $account, 'ip' => $ip, 'is_encrypted' => $isEncrypted]);
            throw new \Exception('验证码错误或已过期', 404);
        }

        // 获取用户信息
        $user = User::getUserByMobile($account);
        if (empty($user)) {
            Log::info('用户不存在', ['account' => $account, 'ip' => $ip]);
            throw new \Exception('用户不存在', 404);
        }

        // 生成JWT令牌
        $token = JwtUtil::createToken($user, self::TOKEN_EXPIRE);
        $expireTime = time() + self::TOKEN_EXPIRE;

        // 记录登录成功
        Log::info('手机号登录成功', ['account' => $account, 'ip' => $ip]);

        return [
            'token' => $token,
            'token_expired' => $expireTime,
            'member' => $user
        ];
    }

    /**
     * 发送登录验证码
     *
     * @param string $account 手机号
     * @param string $type 验证码类型
     * @return array
     * @throws \Exception
     */
    public function sendLoginCode($account, $type)
    {
        return $this->smsService->sendCode($account, $type);
    }

    /**
     * 获取用户信息
     *
     * @param array $userInfo JWT中的用户信息
     * @return array
     * @throws \Exception
     */
    public function getUserInfo($userInfo)
    {
        if (empty($userInfo)) {
            throw new \Exception('获取用户信息失败');
        }

        // 移除不需要返回的字段
        unset($userInfo['exp']);
        unset($userInfo['iat']);

        return $userInfo;
    }

    /**
     * 刷新令牌
     *
     * @param array $userInfo JWT中的用户信息
     * @return array
     * @throws \Exception
     */
    public function refreshToken($userInfo)
    {
        if (empty($userInfo)) {
            throw new \Exception('刷新令牌失败');
        }

        // 移除过期时间信息
        unset($userInfo['exp']);
        unset($userInfo['iat']);

        // 生成新令牌
        $token = JwtUtil::createToken($userInfo, self::TOKEN_EXPIRE);
        $expireTime = time() + self::TOKEN_EXPIRE;

        return [
            'token' => $token,
            'token_expired' => $expireTime
        ];
    }

    /**
     * 获取系统授权信息，使用缓存存储10分钟
     *
     * @param bool $useCache 是否使用缓存
     * @return string
     */
    public static function getSystemAuthorization($useCache = true)
    {
        // 定义缓存键名
        $cacheKey = 'system_authorization_token';

        // 尝试从缓存获取授权信息
        $authorization = Cache::get($cacheKey);
        //$authorization = '';
        // 如果缓存中没有或已过期，则重新获取
        if (empty($authorization) || !$useCache) {
            try {
                // 从环境变量中获取API用户名和密码
                $username = Env::get('api.username', '');
                $password = Env::get('api.password', '');

                if (empty($username) || empty($password)) {
                    Log::error('缺少API用户名或密码配置');
                    return '';
                }

                // 构建登录参数
                $params = [
                    'grant_type' => 'password',
                    'username' => $username,
                    'password' => $password
                ];

                // 获取API基础URL
                $baseUrl = Env::get('api.wechat_url', '');
                if (empty($baseUrl)) {
                    Log::error('缺少API基础URL配置');
                    return '';
                }

                // 调用登录接口获取token
                // 设置请求头
                $headerData = ['client:system'];
                $header = setHeader($headerData, '', 'plain');
                $result = requestCurl($baseUrl . 'token', $params, 'POST', $header);
                $result_array = handleApiResponse($result);

                if (isset($result_array['access_token']) && !empty($result_array['access_token'])) {
                    $authorization = $result_array['access_token'];

                    // 存入缓存，有效期10分钟（600秒）
                    Cache::set($cacheKey, $authorization, 600);
                    Cache::set('system_refresh_token', $result_array['refresh_token'], 600);

                    Log::info('已重新获取系统授权信息并缓存');
                    return $authorization;
                } else {
                    Log::error('获取系统授权信息失败：' . ($response['message'] ?? '未知错误'));
                    return '';
                }
            } catch (\Exception $e) {
                Log::error('获取系统授权信息异常：' . $e->getMessage());
                return '';
            }
        }

        return $authorization;
    }
} 