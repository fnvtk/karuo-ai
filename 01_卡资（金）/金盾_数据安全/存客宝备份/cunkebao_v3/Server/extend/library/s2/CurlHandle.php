<?php

namespace library\s2;

use think\Exception;
use think\facade\Env;

class CurlHandle
{
    private $baseUrl = '';
    private $authorization = '';
    private $header = [];
    private $method = 'get';
    private static $instant = null;

    /**
     * 获取域名
     * @return void
     */
    private function getBaseUrl()
    {
        $this->baseUrl = Env::get('api.wechat_url');
    }

    /**
     * CurlHandle constructor.
     */
    public function __construct()
    {
        $this->getBaseUrl();
    }

    /**
     * 设置头部
     *
     * @param array $headerData 头部数组
     * @param string $authorization
     * @param string $type 类型 默认json (json,plain)
     * @return array
     */
    public function setHeader($key, $value): CurlHandle
    {
        if (is_array($key)) {
            $this->header = array_merge($this->header, $key);
        } else {
            $this->header[$key] = $value;
        }

        return $this;
    }

    private function getHearder(): array
    {
        $header = [];

        foreach ($this->header as $key => $value) {
            $header[] = $key . ':' . $value;
        }

        return $header;
    }

    public function setMethod(string $method): CurlHandle
    {
        $this->method = $method;

        return $this;
    }

    /**
     * @param string $baseUrl
     * @return $this
     */
    public function setBaseUrl(string $baseUrl): CurlHandle
    {
        $this->baseUrl = $baseUrl;

        return $this;
    }

    /**
     * @param string $url 请求的链接
     * @param array $params 请求附带的参数
     * @param string $method 请求的方式, 支持GET, POST, PUT, DELETE等
     * @param array $header 头部
     * @param string $type 数据类型，支持dataBuild、json等
     * @return bool|string
     */
    public function send($url, $params = [], $type = 'dataBuild')
    {
        $str = '';
        if (!empty($url)) {
            try {
                $ch = curl_init();
                $method = $this->method;
                $url = $this->baseUrl . $url;

                // 处理GET请求的参数
                if (strtoupper($method) == 'GET' && !empty($params)) {
                    $url = $url . '?' . dataBuild($params);
                }

                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_HEADER, 0);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30); //30秒超时
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
                curl_setopt($ch, CURLOPT_HTTPHEADER, $this->getHearder());

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
                if(curl_errno($ch)) {
                    echo 'Curl error: ' .curl_errno($ch) . ':' . curl_error($ch);
                }
                curl_close($ch);
            } catch (Exception $e) {
                $str = '';
            }
        }

        return $str;
    }

    /**
     * 单例
     *
     * @return static|null
     */
    public static function getInstant()
    {
        if (self::$instant instanceof self) {
            return self::$instant;
        }

        return new static();
    }
}
