<?php

namespace app\api\controller;

use app\api\model\CompanyAccountModel;
use think\facade\Env;
use think\Response;

/**
 * 用户控制器
 * Class UserController
 * @package app\frontend\controller
 */
class UserController extends BaseController
{
    /**
     * API客户端类型
     */
    const CLIENT_TYPE = 'system';

    /**
     * 构造函数
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * 登录
     * @return \think\response\Json
     */
    public function login()
    {
        // 获取并验证参数
        $params = $this->validateLoginParams();
        if (!is_array($params)) {
            return $params;
        }

        // 验证账号是否存在
        $existingAccount = CompanyAccountModel::where('userName', $params['username'])->find();
        if (empty($existingAccount)) {
            // 记录登录失败日志
            recordUserLog(0, $params['username'], 'LOGIN', '账号不存在', $params, 500, '账号不存在');
            return errorJson('账号不存在');
        }

        // 获取验证码会话ID和用户输入的验证码
        $verifySessionId = $this->request->param('verifySessionId', '');
        $verifyCode = $this->request->param('verifyCode', '');

        // 设置请求头
        $headerData = ['client:' . self::CLIENT_TYPE];
        
        // 如果存在验证码信息，添加到请求头
        if (!empty($verifySessionId) && !empty($verifyCode)) {
            $headerData[] = 'verifysessionid:' . $verifySessionId;
            $headerData[] = 'verifycode:' . $verifyCode;
        }
        
        $header = setHeader($headerData, '', 'plain');

        try {
            // 请求登录接口
            $result = requestCurl($this->baseUrl . 'token', $params, 'POST', $header);
            $result_array = handleApiResponse($result);
            
            if (is_array($result_array) && isset($result_array['error'])) {
                // 记录登录失败日志
                recordUserLog(0, $params['username'], 'LOGIN', '登录失败', $params, 500, $result_array['error_description']);
                return errorJson($result_array['error_description']);
            }

            // 获取客户端IP地址
            $ip = $this->request->ip();
            
            // 登录成功，更新密码信息和登录信息
            $updateData = [
                'passwordMd5' => md5($params['password']),
                'passwordLocal' => localEncrypt($params['password']),
                'lastLoginIp' => $ip,
                'lastLoginTime' => time()
            ];

            // 更新密码信息
            CompanyAccountModel::where('userName', $params['username'])->update($updateData);
            
            // 记录登录成功日志
            recordUserLog($existingAccount['id'], $params['username'], 'LOGIN', '登录成功', [], 200, '登录成功');
            
            return successJson($result_array);
        } catch (\Exception $e) {
            // 记录登录异常日志
            recordUserLog(0, $params['username'], 'LOGIN', '登录请求失败', $params, 500, $e->getMessage());
            return errorJson('登录请求失败：' . $e->getMessage());
        }
    }

    /**
     * 获取新的token
     * @return \think\response\Json
     */
    public function getNewToken()
    {
        $grant_type = $this->request->param('grant_type', 'refresh_token');
        $refresh_token = $this->request->param('refresh_token', '');
        $authorization = $this->request->header('authorization', $this->authorization);

        if (empty($grant_type) || empty($authorization)) {
            return errorJson('参数错误');
        }

        $params = [
            'grant_type' => $grant_type,
            'refresh_token' => $refresh_token,
        ];



        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, $authorization, 'system');

        try {
            $result = requestCurl($this->baseUrl . 'token', $params, 'POST', $header);
            $result_array = handleApiResponse($result);

            if (is_array($result_array) && isset($result_array['error'])) {
                recordUserLog(0, '', 'REFRESH_TOKEN', '刷新token失败', $params, 500, $result_array['error_description']);
                return errorJson($result_array['error_description']);
            }
            
            recordUserLog(0, '', 'REFRESH_TOKEN', '刷新token成功', $params, 200, '刷新成功');
            return successJson($result_array);
        } catch (\Exception $e) {
            recordUserLog(0, '', 'REFRESH_TOKEN', '刷新token异常', $params, 500, $e->getMessage());
            return errorJson('获取新token失败：' . $e->getMessage());
        }
    }

    /**
     * 获取商户基本信息
     * @return \think\response\Json
     */
    public function getAccountInfo()
    {
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, $authorization, 'json');

        try {
            $result = requestCurl($this->baseUrl . 'api/Account/self', [], 'GET', $header,'json');
            $response = handleApiResponse($result);
            if (!empty($response['account'])) {
                $accountData = $response['account'];
                
                // 准备数据库字段映射，保持驼峰命名
                $dbData = [
                    'tenantId' => $accountData['id'],
                    'realName' => $accountData['realName'],
                    'nickname' => $accountData['nickname'],
                    'memo' => $accountData['memo'],
                    'avatar' => $accountData['avatar'],
                    'userName' => $accountData['userName'],
                    'secret' => $accountData['secret'],
                    'accountType' => $accountData['accountType'],
                    'companyId' => $accountData['departmentId'],
                    'useGoogleSecretKey' => $accountData['useGoogleSecretKey'],
                    'hasVerifyGoogleSecret' => $accountData['hasVerifyGoogleSecret'],
                    'updateTime' => time()
                ];


                // 查找是否存在该账户
                $existingAccount = CompanyAccountModel::where('userName', $accountData['userName'])->find();
                if ($existingAccount) {
                    // 更新现有记录
                    CompanyAccountModel::where('userName', $accountData['userName'])->update($dbData);
                } else {
                    // 创建新记录
                    $dbData['createTime'] = time();
                    CompanyAccountModel::create($dbData);
                }
                return successJson($response['account']);
            }else{
                return successJson($response);
            }
            

        } catch (\Exception $e) {
            recordUserLog(0, '', 'GET_ACCOUNT_INFO', '获取账户信息异常', [], 500, $e->getMessage());
            return errorJson('获取账户信息失败：' . $e->getMessage());
        }
    }

    /**
     * 修改密码
     * @return \think\response\Json
     */
    public function modifyPwd($data = [])
    {

        if (empty($data)) {
            return json_encode(['code' => 400,'msg' => '参数缺失']);
        }

        if (!isset($data['id']) || !isset($data['pwd'])) {
            return json_encode(['code' => 401,'msg' => '参数缺失']);
        }
        $authorization =  $this->authorization;

        if (empty($authorization)) {
            return json_encode(['code' => 400,'msg' => '缺少授权信息']);
        }

        $headerData = ['client:system'];
        $header = setHeader($headerData, $authorization, 'json');
        $params = [
            'id' => $data['id'],
            'newPw' => $data['pwd'],
        ];

        try {
            $result = requestCurl($this->baseUrl . 'api/Account/modifypw', $params, 'PUT', $header,'json');
            $response = handleApiResponse($result);
            if (empty($response)) {
                return json_encode(['code' => 200,'msg' => '修改成功']);
            }
            return json_encode(['code' => 400,'msg' => $response]);
        } catch (\Exception $e) {
            return json_encode(['code' => 400,'msg' => '修改密码失败:' . $e->getMessage()]);
        }
    }

    /**
     * 登出
     * @return \think\response\Json
     */
    public function logout()
    {
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, $authorization, 'system');

        try { 
            // 调用外部退出登录接口
            $result = requestCurl($this->baseUrl . 'api/Account/SignOut', [], 'GET', $header);
            return successJson([] , '退出成功');
        } catch (\Exception $e) {
            recordUserLog(0, '', 'LOGOUT', '退出登录异常', [], 500, $e->getMessage());
            return errorJson('退出登录失败：' . $e->getMessage());
        }
    }

    /**
     * 获取验证码
     * @return \think\response\Json
     */
    public function getVerifyCode($isJson = false)
    {
        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, '', 'plain');
        
        try {
            $result = requestCurl($this->baseUrl . 'api/Account/getVerifyCode', [], 'GET', $header);
            $response = handleApiResponse($result);
            
            // 检查返回的数据格式
            if (is_array($response)) {
                // 如果verifyCodeImage和verifySessionId都不为null，返回它们
                if (!empty($response['verifyCodeImage']) && !empty($response['verifySessionId'])) {
                    $returnData = [
                        'verifyCodeImage' => $response['verifyCodeImage'],
                        'verifySessionId' => $response['verifySessionId']
                    ];
                    return !empty($isJson) ? json_encode(['code' => 200,'data' => $returnData]) : successJson($returnData);
                }
            }
            
            // 如果不是预期的格式，返回原始数据
            return !empty($isJson) ? json_encode(['code' => 200,'msg' => '无需验证码','data' => ['verifyCodeImage' => '', 'verifySessionId' => '']]) : successJson(['verifyCodeImage' => '', 'verifySessionId' => ''],'无需验证码');
        } catch (\Exception $e) {
            $msg = '获取验证码失败'. $e->getMessage();
            return !empty($isJson) ? json_encode(['code' => 400,'msg' => $msg]) : errorJson($msg);
        }
    }

    /**
     * 验证登录参数
     * @return array|\think\response\Json
     */
    private function validateLoginParams()
    {
        $username = trim($this->request->param('username', ''));
        $password = trim($this->request->param('password', ''));
        $verifyCode = trim($this->request->param('verifyCode', ''));
        $verifySessionId = trim($this->request->param('verifySessionId', ''));

        if (empty($username) || empty($password)) {
            return errorJson('用户名和密码不能为空');
        }

        // 验证密码格式
        $passwordValidation = validateString($password, 'password',['max_length' => 20]);
        if (!$passwordValidation['status']) {
            return errorJson($passwordValidation['message']);
        }

        // 如果提供了验证码，验证格式
        if (!empty($verifyCode)) {
            if (empty($verifySessionId)) {
                return errorJson('验证码会话ID不能为空');
            }
            // 验证码格式验证（假设是4位数字）
            if (!preg_match('/^\d{4}$/', $verifyCode)) {
                return errorJson('验证码格式不正确');
            }
        }

        return [
            'grant_type' => 'password',
            'username' => $username,
            'password' => $password,
        ];
    }

    /**
     * 验证修改密码参数
     * @return array|\think\response\Json
     */
    private function validateModifyPwdParams()
    {
        $cPw = trim($this->request->param('cPw', ''));
        $newPw = trim($this->request->param('newPw', ''));
        $oldPw = trim($this->request->param('oldPw', ''));

        if (empty($cPw) || empty($newPw) || empty($oldPw)) {
            return errorJson('密码参数不完整');
        }

        if ($newPw !== $cPw) {
            return errorJson('两次输入的新密码不一致');
        }

        // 验证新密码格式
        $passwordValidation = validateString($newPw, 'password');
        if (!$passwordValidation['status']) {
            return errorJson($passwordValidation['message']);
        }

        return [
            'cPw' => $cPw,
            'newPw' => $newPw,
            'oldPw' => $oldPw,
        ];
    }
}
