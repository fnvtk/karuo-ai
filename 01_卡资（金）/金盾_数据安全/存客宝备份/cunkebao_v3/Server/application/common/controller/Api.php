<?php

namespace app\common\controller;

use library\ResponseHelper;
use think\Controller;
use think\Db;
use think\facade\Config;
use think\facade\Request;
use think\facade\Response;

/**
 * API基础控制器
 */
class Api extends Controller
{
    /**
     * 无需登录的方法,同时也就不需要鉴权了
     * @var array
     */
    protected $noNeedLogin = [];

    /**
     * 无需鉴权的方法,但需要登录
     * @var array
     */
    protected $noNeedRight = [];

    /**
     * 当前请求方法
     * @var string
     */
    protected $requestType = '';

    /**
     * 默认响应输出类型
     * @var string
     */
    protected $responseType = 'json';

    /**
     * 构造方法
     */
    public function __construct()
    {
        parent::__construct();

        // 请求类型
        $this->requestType = Request::method();

        // 控制器初始化
        $this->_initialize();

        // 跨域请求检测
        $this->_checkCors();
    }

    /**
     * 初始化操作
     */
    protected function _initialize()
    {
        // 初始化操作
    }

    /**
     * 跨域检测
     * @deprecated 已由全局中间件 AllowCrossDomain 处理，此方法保留用于兼容
     */
    protected function _checkCors()
    {
        // 由全局中间件处理跨域，此处不再处理
        if ($this->requestType === 'OPTIONS') {
            Response::create()->send();
            exit;
        }
    }

    /**
     * 操作成功返回的数据
     * @param string $msg 提示信息
     * @param mixed $data 返回的数据
     * @param int $code 错误码，默认为1
     * @param string $type 输出类型
     * @param array $header 发送的header信息
     */
    protected function success($msg = '', $data = null, $code = 1, $type = null, array $header = [])
    {
        $this->result($msg, $data, $code, $type, $header);
    }

    /**
     * 操作失败返回的数据
     * @param string $msg 提示信息
     * @param mixed $data 返回的数据
     * @param int $code 错误码，默认为0
     * @param string $type 输出类型
     * @param array $header 发送的header信息
     */
    protected function error($msg = '', $data = null, $code = 0, $type = null, array $header = [])
    {
        $this->result($msg, $data, $code, $type, $header);
    }

    /**
     * 返回封装后的API数据
     * @param string $msg 提示信息
     * @param mixed $data 要返回的数据
     * @param int $code 错误码，默认为0
     * @param string $type 输出类型，支持json/xml/jsonp
     * @param array $header 发送的header信息
     */
    protected function result($msg, $data = null, $code = 0, $type = null, array $header = [])
    {
        $result = [
            'code' => $code,
            'msg'  => $msg,
            'time' => time(),
            'data' => $data,
        ];
        
        // 返回数据格式
        $type = $type ?: $this->responseType;
        
        // 发送响应
        $response = Response::create($result, $type)->header($header);
        $response->send();
        exit;
    }


    public function uploadApp()
    {
        $type = $this->request->param('type', '');
        if (empty($type)){
            return ResponseHelper::error('参数缺失');
        }

        if (!in_array($type,['ckb','aiStore'])){
            return ResponseHelper::error('参数错误');
        }

        $data = Db::name('app_version')
            ->field('version,downloadUrl,updateContent,forceUpdate')
            ->where(['type'=>$type])
            ->order('id DESC')
            ->find();
        return ResponseHelper::success($data, '获取成功');

    }
} 