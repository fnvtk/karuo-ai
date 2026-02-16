<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006-2016 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: 流年 <liu21st@gmail.com>
// +----------------------------------------------------------------------

// 应用公共文件
use app\common\service\AuthService;
use think\facade\Cache;

if (!function_exists('requestCurl')) {
    /**
     * @param string $url 请求的链接
     * @param array $params 请求附带的参数
     * @param string $method 请求的方式, 支持GET, POST, PUT, DELETE等
     * @param array $header 头部
     * @param string $type 数据类型，支持dataBuild、json等
     * @return bool|string
     */
    function requestCurl($url, $params = [], $method = 'GET', $header = [], $type = 'dataBuild')
    {
        $str = '';
        if (!empty($url)) {
            try {
                $ch = curl_init();

                // 处理GET请求的参数
                if (strtoupper($method) == 'GET' && !empty($params)) {
                    $url = $url . '?' . dataBuild($params);
                }

                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_HEADER, 0);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30); //30秒超时
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
                curl_setopt($ch, CURLOPT_HTTPHEADER, $header);

                // 处理不同的请求方法
                if (strtoupper($method) != 'GET') {
                    // 设置请求方法
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

                    // 处理参数格式
                    if ($type == 'dataBuild') {
                        $params = dataBuild($params);
                    } elseif ($type == 'json') {
                        $params = json_encode($params);
                    } else {
                        $params = dataBuild($params);
                    }

                    // 设置请求体
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
                }

                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0); //是否验证对等证书,1则验证，0则不验证
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                $str = curl_exec($ch);
                curl_close($ch);
            } catch (Exception $e) {
                $str = '';
            }
        }
        return $str;
    }
}


if (!function_exists('dataBuild')) {
    function dataBuild($array)
    {
        if (!is_array($array)) {
            return $array;
        }
        
        // 处理嵌套数组
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $array[$key] = json_encode($value);
            }
        }
        
        return http_build_query($array);
    }
}


if (!function_exists('setHeader')) {
    /**
     * 设置头部
     *
     * @param array $headerData 头部数组
     * @param string $authorization
     * @param string $type 类型 默认json (json,plain)
     * @return array
     */
    function setHeader($headerData = [], $authorization = '', $type = '')
    {
        $header = $headerData;

        switch ($type) {
            case 'json':
                $header[] = 'Content-Type:application/json';
                break;
            case 'html' :
                $header[] = 'Content-Type:text/html';
                break;
            case 'plain' :
                $header[] = 'Content-Type:text/plain';
                break;
            default:
                $header[] = 'Content-Type:application/json';
        }
//        $header[] = $type == 'plain' ? 'Content-Type:text/plain' : 'Content-Type: application/json';
        if ($authorization !== "") $header[] = 'authorization:bearer ' . $authorization;
        return $header;
    }
}

if (!function_exists('errorJson')) {
    function errorJson($error = '', $code = 500)
    {
        return json([
            'code' => $code,
            'msg' => $error,
        ]);
    }
}


if (!function_exists('successJson')) {
    function successJson($data = [] ,$msg = '操作成功', $code = 200)
    {
        return json([
            'data' => $data,
            'code' => $code,
            'msg' => $msg,
        ]);
    }
}

if (!function_exists('validateString')) {
    /**
     * 通用字符串验证
     * @param string $string 待验证的字符串
     * @param string $type 验证类型 (password|email|mobile|nickname|url|idcard|bankcard|ip|date|username|chinese|english|number|zip|qq)
     * @param array $options 额外的验证选项
     * @return array ['status' => bool, 'message' => string]
     */
    function validateString($string, $type, $options = [])
    {
        // 默认配置
        $config = [
            'password' => [
                'min_length' => 6,
                'max_length' => 20,
                'pattern' => '/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/',
                'error' => '密码必须包含英文和数字，不能包含特殊符号'
            ],
            'email' => [
                'pattern' => '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
                'error' => '邮箱格式不正确'
            ],
            'mobile' => [
                'pattern' => '/^1[3456789]\d{9}$/',
                'error' => '手机号格式不正确'
            ],
            'nickname' => [
                'min_length' => 2,
                'max_length' => 20,
                'pattern' => '/^[a-zA-Z0-9\x{4e00}-\x{9fa5}]+$/u',
                'error' => '昵称只能包含中文、英文、数字，长度2-20位'
            ],
            'url' => [
                'pattern' => '/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/',
                'error' => '网址格式不正确'
            ],
            'idcard' => [
                'pattern' => '/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/',
                'error' => '身份证号码格式不正确'
            ],
            'bankcard' => [
                'pattern' => '/^[1-9]\d{9,29}$/',
                'error' => '银行卡号格式不正确'
            ],
            'ip' => [
                'pattern' => '/^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/',
                'error' => 'IP地址格式不正确'
            ],
            'date' => [
                'pattern' => '/^\d{4}(-)(0[1-9]|1[0-2])(-)([0-2][1-9]|3[0-1])$/',
                'error' => '日期格式不正确（YYYY-MM-DD）'
            ],
            'username' => [
                'min_length' => 4,
                'max_length' => 20,
                'pattern' => '/^[a-zA-Z][a-zA-Z0-9_]{3,19}$/',
                'error' => '用户名必须以字母开头，只能包含字母、数字和下划线，长度4-20位'
            ],
            'chinese' => [
                'pattern' => '/^[\x{4e00}-\x{9fa5}]+$/u',
                'error' => '只能输入中文汉字'
            ],
            'english' => [
                'pattern' => '/^[a-zA-Z]+$/',
                'error' => '只能输入英文字母'
            ],
            'number' => [
                'pattern' => '/^[0-9]+$/',
                'error' => '只能输入数字'
            ],
            'zip' => [
                'pattern' => '/^\d{6}$/',
                'error' => '邮政编码格式不正确'
            ],
            'qq' => [
                'pattern' => '/^[1-9][0-9]{4,}$/',
                'error' => 'QQ号格式不正确'
            ],
            'age' => [
                'pattern' => '/^(?:[1-9][0-9]?|1[01][0-9]|120)$/',
                'error' => '年龄必须在1-120之间'
            ],
            'phone' => [
                'pattern' => '/^([0-9]{3,4}-)?[0-9]{7,8}$/',
                'error' => '固定电话格式不正确'
            ],
            'money' => [
                'pattern' => '/^[0-9]+\.?[0-9]{0,2}$/',
                'error' => '金额格式不正确（最多保留两位小数）'
            ],
            'color' => [
                'pattern' => '/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/',
                'error' => '颜色格式不正确（#RGB或#RRGGBB）'
            ]
        ];

        // 合并自定义配置
        if (!empty($options)) {
            $config[$type] = array_merge($config[$type], $options);
        }

        // 空值检查
        if (empty($string)) {
            return ['status' => false, 'message' => '不能为空'];
        }

        switch ($type) {
            case 'password':
            case 'username':
                // 长度检查
                if (strlen($string) < $config[$type]['min_length']) {
                    return [
                        'status' => false,
                        'message' => '长度不能小于' . $config[$type]['min_length'] . '位'
                    ];
                }
                if (strlen($string) > $config[$type]['max_length']) {
                    return [
                        'status' => false,
                        'message' => '长度不能大于' . $config[$type]['max_length'] . '位'
                    ];
                }
                // 格式检查
                if (!preg_match($config[$type]['pattern'], $string)) {
                    return [
                        'status' => false,
                        'message' => $config[$type]['error']
                    ];
                }
                break;

            case 'nickname':
                // 长度检查
                $length = mb_strlen($string, 'UTF-8');
                if ($length < $config['nickname']['min_length'] || $length > $config['nickname']['max_length']) {
                    return [
                        'status' => false,
                        'message' => '昵称长度必须在' . $config['nickname']['min_length'] . '-' . $config['nickname']['max_length'] . '位之间'
                    ];
                }
                // 格式检查
                if (!preg_match($config['nickname']['pattern'], $string)) {
                    return [
                        'status' => false,
                        'message' => $config['nickname']['error']
                    ];
                }
                break;

            case 'idcard':
                // 身份证号验证
                if (!preg_match($config['idcard']['pattern'], $string)) {
                    return [
                        'status' => false,
                        'message' => $config['idcard']['error']
                    ];
                }
                // 进一步验证18位身份证的最后一位校验码
                if (strlen($string) == 18) {
                    $idCardBase = substr($string, 0, 17);
                    $verify = substr($string, 17, 1);
                    if (!checkIdCardVerify($idCardBase, $verify)) {
                        return [
                            'status' => false,
                            'message' => '身份证校验码错误'
                        ];
                    }
                }
                break;

            default:
                if (!isset($config[$type])) {
                    return [
                        'status' => false,
                        'message' => '不支持的验证类型'
                    ];
                }
                if (!preg_match($config[$type]['pattern'], $string)) {
                    return [
                        'status' => false,
                        'message' => $config[$type]['error']
                    ];
                }
                break;
        }

        return ['status' => true, 'message' => '验证通过'];
    }
}

if (!function_exists('checkIdCardVerify')) {
    /**
     * 验证身份证校验码
     * @param string $idCardBase 身份证前17位
     * @param string $verify 校验码
     * @return bool
     */
    function checkIdCardVerify($idCardBase, $verify)
    {
        if (strlen($idCardBase) != 17) {
            return false;
        }
        
        // 加权因子
        $factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        
        // 校验码对应值
        $verifyNumberList = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
        
        // 根据前17位计算校验码
        $sum = 0;
        for ($i = 0; $i < 17; $i++) {
            $sum += substr($idCardBase, $i, 1) * $factor[$i];
        }
        
        $mod = $sum % 11;
        $verifyNumber = $verifyNumberList[$mod];
        
        return strtoupper($verify) == $verifyNumber;
    }
}

if (!function_exists('handleApiResponse')) {
    /**
     * 处理API响应
     * @param string $response 响应内容
     * @param bool $returnRaw 是否返回原始数据
     * @return mixed
     */
    function handleApiResponse($response, $returnRaw = false)
    {
        if (empty($response)) {
            return $response;
        }

        // 检查是否为JSON格式
        $decoded = json_decode($response, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }


        // 不是JSON格式，直接返回原始数据
        if($response == '无效路径或登录状态失效'){
            Cache::rm('system_refresh_token');
            Cache::rm('system_authorization_token');
            //AuthService::getSystemAuthorization();
        }
        
        return $response;
        
    }
}

if (!function_exists('localEncrypt')) {
    /**
     * 本地密码加密
     * @param string $password 待加密的密码
     * @param string $key 加密密钥
     * @return string
     */
    function localEncrypt($password, $key = 'karuo')
    {
        return openssl_encrypt($password, 'AES-256-CBC', $key, 0, substr(md5($key), 0, 16));
    }
}

if (!function_exists('localDecrypt')) {
    /**
     * 本地密码解密
     * @param string $encrypted 已加密的密码
     * @param string $key 加密密钥
     * @return string
     */
    function localDecrypt($encrypted, $key = 'karuo')
    {
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, substr(md5($key), 0, 16));
    }
}

if (!function_exists('recordUserLog')) {
    /**
     * 记录用户操作日志
     * @param int $userId 用户ID
     * @param string $userName 用户名
     * @param string $action 操作类型
     * @param string $description 操作描述
     * @param array $requestData 请求数据
     * @param int $responseCode 响应状态码
     * @param string $responseMsg 响应消息
     * @return bool
     */
    function recordUserLog($userId, $userName, $action, $description = '', $requestData = [], $responseCode = 200, $responseMsg = '操作成功')
    {
        try {
            $request = request();
            
            // 获取用户代理信息
            $userAgent = $request->header('user-agent');
            
            // 准备日志数据
            $logData = [
                'userId' => $userId,
                'userName' => $userName,
                'action' => $action,
                'description' => $description,
                'ip' => $request->ip(),
                'userAgent' => $userAgent,
                'requestMethod' => $request->method(),
                'requestUrl' => $request->url(true),
                'requestData' => !empty($requestData) ? json_encode($requestData, JSON_UNESCAPED_UNICODE) : '',
                'responseCode' => $responseCode,
                'responseMsg' => $responseMsg,
                'createTime' => time()
            ];

            // 写入日志
            \think\Db::name('user_log')->insert($logData);
            return true;
        } catch (\Exception $e) {
            // 记录日志失败不影响主业务
            \think\facade\Log::error('记录用户日志失败：' . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('getUserAction')) {
    /**
     * 获取用户操作类型常量
     * @return array
     */
    function getUserAction()
    {
        return [
            'LOGIN' => '登录',
            'LOGOUT' => '退出登录',
            'MODIFY_PASSWORD' => '修改密码',
            'GET_VERIFY_CODE' => '获取验证码',
            'UPDATE_PROFILE' => '更新个人信息',
            'REFRESH_TOKEN' => '刷新令牌',
            'API_REQUEST' => 'API请求',
            'FILE_UPLOAD' => '文件上传',
            'FILE_DOWNLOAD' => '文件下载',
            'DATA_EXPORT' => '数据导出',
            'DATA_IMPORT' => '数据导入',
            'CREATE' => '创建',
            'UPDATE' => '更新',
            'DELETE' => '删除',
            'QUERY' => '查询'
        ];
    }
}

if (!function_exists('formatRelativeTime')) {
    /**
     * 将时间戳格式化为相对时间（中文）
     * 例：半年前 / 1个月前 / 3周前 / 1天前 / 5小时前 / 5分钟前 / 刚刚
     * @param int $timestamp Unix 时间戳（秒）
     * @return string
     */
    function formatRelativeTime($timestamp)
    {
        if (empty($timestamp) || !is_numeric($timestamp)) {
            return '';
        }
        $now = time();
        $diff = max(0, $now - (int)$timestamp);

        $minute = 60;
        $hour = 60 * $minute;
        $day = 24 * $hour;
        $week = 7 * $day;
        $month = 30 * $day; // 近似
        $halfYear = 6 * $month; // 近似

        if ($diff >= $halfYear) return '半年前';
        if ($diff >= $month)   return floor($diff / $month) . '个月前';
        if ($diff >= $week)    return floor($diff / $week) . '周前';
        if ($diff >= $day)     return floor($diff / $day) . '天前';
        if ($diff >= $hour)    return floor($diff / $hour) . '小时前';
        if ($diff >= $minute)  return floor($diff / $minute) . '分钟前';
        return '刚刚';
    }
}


if (!function_exists('exit_data')) {

    /**
     * 截断输出
     * @param array $data
     * @param string $type
     * @param bool $exit
     */
    function exit_data($data = [], $type = 'pr', $exit = true)
    {
        switch ($type) {
            case 'pr':
                $func = 'print_r';
                break;
            case 'vd':
                $func = 'var_dump';
                break;
            default:
                $func = 'print_r';
                break;
        }
        if ($func == 'print_r') {
            echo '<pre>';
        }
        call_user_func($func, $data);
        if ($exit)
            exit();
    }
}
if (!function_exists('dump')) {
    /**
     * 调试打印变量但不终止程序
     * @return void
     */
    function dump()
    {
        call_user_func_array(['app\\common\\helper\\Debug', 'dump'], func_get_args());
    }
}

if (!function_exists('artificialAllotWechatFriend')) {
    function artificialAllotWechatFriend($friend = [])
    {
        if (empty($friend)) {
            return false;
        }

        //记录切换好友
        $cacheKey = 'allotWechatFriend';
        $cacheFriend = $friend;
        $cacheFriend['time'] = time() + 120;
        $maxRetry = 5;
        $retry = 0;
        do {
            $cacheFriendData = Cache::get($cacheKey, []);
            // 去重：移除同friendId的旧数据
            $cacheFriendData = array_filter($cacheFriendData, function($item) use ($cacheFriend) {
                return $item['friendId'] !== $cacheFriend['friendId'];
            });
            $cacheFriendData[] = $cacheFriend;
            $success = Cache::set($cacheKey, $cacheFriendData);
            $retry++;
        } while (!$success && $retry < $maxRetry);
    }
}