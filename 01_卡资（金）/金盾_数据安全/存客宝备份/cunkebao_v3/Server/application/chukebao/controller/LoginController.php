<?php

namespace app\chukebao\controller;

use app\common\util\JwtUtil;
use Exception;
use library\ResponseHelper;
use think\Db;
use think\Controller;
use think\facade\Cache;

/**
 * 认证控制器
 * 处理用户登录和身份验证
 */
class LoginController extends Controller
{


    /**
     * 用户登录
     *
     * @return \think\response\Json
     */
    public function index($username = '', $password = '',$verifySessionId = '',$verifyCode = '')
    {

        $username = !empty($username) ? $username : $this->request->param('account', '');
        $password = !empty($password) ? $password : $this->request->param('password', '');
        $verifySessionId =!empty($verifySessionId) ? $verifySessionId : $this->request->param('verifySessionId', '');
        $verifyCode = !empty($verifyCode) ? $verifyCode : $this->request->param('verifyCode', '');
        $token = JwtUtil::getRequestToken();
        $payload = '';
        if (!empty($token)){
            $payload = JwtUtil::verifyToken($token);
        }

        if ((empty($username) || empty($password)) && empty($payload)){
            return ResponseHelper::error('请输入账号密码');
        }

        // 验证账号是否存在（支持账号或手机号登录）
        if (empty($payload11)){
            $user = Db::name('users')
                ->where(function ($query) use ($username) {
                    $query->where('account', $username)->whereOr('phone', $username);
                })
                ->where(function ($query2) use ($password) {
                    $query2->where('passwordMd5', md5($password))->whereOr('passwordLocal', localEncrypt($password));
                })
                ->find();
        }else{
            $user = $payload;
        }

        if (empty($user)) {
            return ResponseHelper::error('账号不存在或密码错误');
        }

        if($user['status'] != 1){
            return ResponseHelper::error('账号已禁用');
        }

        //登录参数
        $params = [
            'grant_type' => 'password',
            'username' => $user['account'],
            'password' => !empty($user['passwordLocal']) ? localDecrypt($user['passwordLocal']) : $password
        ];
        try {
            // 调用登录接口获取token
            $headerData = ['client:kefu-client'];
            if (!empty($verifySessionId) && !empty($verifyCode)){
                $headerData[] = 'verifysessionid:'.$verifySessionId;
                $headerData[] = 'verifycode:'.$verifyCode;
            }
            $header = setHeader($headerData, '', 'plain');
            $result = requestCurl('https://s2.siyuguanli.com:9991/token', $params, 'POST', $header);
            $result = handleApiResponse($result);
            if (isset($result['access_token']) && !empty($result['access_token'])) {
                $kefuData['token'] = $result;
                $headerData = ['client:kefu-client'];
                $header = setHeader($headerData, $result['access_token']);
                $result2 = requestCurl('https://s2.siyuguanli.com:9991/api/account/self', [], 'GET', $header, 'json');
                $self = handleApiResponse($result2);
                $kefuData['self'] = $self;
                Db::name('users')->where('id', $user['id'])->update(['passwordLocal' => localEncrypt($params['password']),'updateTime' => time()]);
            }else{
                $kefuData = [
                    'token' => [
                        "access_token"=> "27gINKZqGux6V4j9QLawOcTKlWXg-j4zxQjKvScvDTq-YlLcwIrDP2AFaNZKnOo9zLzepOBC8qrdXh4z9GxxkwE9TKGRQI1FjITRlMZzrim13IbSEbJUoywGs_BhDmIZnnPhfjqxDB1vjZgVtT2Kp4bxbUCV3i2uO_FTv_DT2G7NUFFLjq8oIuUrd_c1YXeYkH8m8Fw1AM4yPZJZyfdaHSSMOpJ2Bk2LAghnB6OaZCYWNFQcwWARsmh1BSAANUOAoadjkztZC7Fme-GGOm2sLo0WL6Mf26NfeLmnkluewTiPMyacD7RYclAR2LZ_8Mhwr3pwRg",
                        "token_type"=> "bearer",
                        "expires_in"=> 195519999,
                        "refresh_token"=> "a9545daa-d1c4-4c87-8c4c-b713631d4f0d"
                    ],
                    'self' => [
                        'account' => [
                            "id"=> 5538,
                            "realName"=> "测试",
                            "nickname"=> "",
                            "memo"=> "",
                            "avatar"=> "",
                            "userName"=> "wz_02",
                            "secret"=> "8f6f743395ad4198b6a4c0e6ca0e452f",
                            "accountType"=> 10,
                            "departmentId"=> 2130,
                            "useGoogleSecretKey"=> false,
                            "hasVerifyGoogleSecret"=> true
                        ],
                        'tenant' => [
                            "id" => 242,
                            "name"=> "泉州市卡若网络技术有限公司",
                            "guid"=> "5E2C38F5A275450D935F3ECEC076124E",
                            "thirdParty"=> null,
                            "tenantType"=> 0,
                            "deployName"=> "deploy-s2"
                        ]
                    ]
                ];
                //return ResponseHelper::error($result['error_description']);
            }


            unset($user['passwordMd5'],$user['deleteTime']);
            $userData['member'] = $user;

            // 生成JWT令牌
            $expired = 86400 * 30;
            $token = JwtUtil::createToken($user, $expired);
            $token_expired = time() + $expired;

            $userData['token'] = $token;
            $userData['token_expired'] = $token_expired;
            $userData['kefuData'] = $kefuData;

            return ResponseHelper::success($userData, '登录成功');
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
}