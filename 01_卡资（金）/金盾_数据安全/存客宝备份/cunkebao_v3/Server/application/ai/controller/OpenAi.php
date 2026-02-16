<?php

namespace app\ai\controller;

use think\facade\Env;
use think\Controller;


class OpenAI  extends Controller
{
    protected $apiUrl;
    protected $apiKey;
    protected $headers;

    public function __construct()
    {
        parent::__construct();

        $this->apiUrl = Env::get('openAi.apiUrl');
        $this->apiKey = Env::get('openAi.apiKey');

        // 设置请求头
        $this->headers = [
            'Content-Type: application/json',
            'Authorization: Bearer '.$this->apiKey
        ];
    }


    public function text()
    {

        $params = [
            'model' => 'gpt-3.5-turbo-0125',
            'input' => 'DHA 从孕期到出生到老年都需要，助力大脑发育🧠／减缓脑压力有助记忆／给大脑动力＃贝蒂喜藻油DHA  双标认证每粒 150毫克，高含量、高性价比从小吃到老，长期吃更健康 重写这条朋友圈 要求：  1、原本的字数和意思不要修改超过10%  2、出现品牌名或个人名字就去除'
        ];
        $result = $this->httpRequest( $this->apiUrl, 'POST', $params,$this->headers);
        exit_data($result);
    }

    /**
     * 示例：调用OpenAI API生成睡前故事
     * 对应curl命令：
     * curl "https://api.ai.com/v1/responses" \
     *      -H "Content-Type: application/json" \
     *      -H "Authorization: Bearer $OPENAI_API_KEY" \
     *      -d '{
     *          "model": "gpt-5",
     *          "input": "Write a one-sentence bedtime story about a unicorn."
     *      }'
     */
    public function bedtimeStory()
    {
        
        // API请求参数
        $params = [
            'model' => 'gpt-5',
            'input' => 'Write a one-sentence bedtime story about a unicorn.'
        ];
        
        // 发送请求到OpenAI API
        $url = 'https://api.openai.com/v1/responses';
        $result = $this->httpRequest($url, 'POST', $params, $this->headers);
        
        // 返回结果
        exit_data($result);
    }




    /**
     * CURL请求 - 专门用于JSON API请求
     *
     * @param $url 请求url地址
     * @param $method 请求方法 get post
     * @param null $postfields post数据数组
     * @param array $headers 请求header信息
     * @param int $timeout 超时时间
     * @param bool|false $debug 调试开启 默认false
     * @return mixed
     */
    protected function httpRequest($url, $method = "GET", $postfields = null, $headers = array(), $timeout = 30, $debug = false)
    {
        $method = strtoupper($method);
        $ci     = curl_init();
        
        /* Curl settings */
        curl_setopt($ci, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 6.2; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0");
        curl_setopt($ci, CURLOPT_CONNECTTIMEOUT, 60); /* 在发起连接前等待的时间，如果设置为0，则无限等待 */
        curl_setopt($ci, CURLOPT_TIMEOUT, $timeout); /* 设置cURL允许执行的最长秒数 */
        curl_setopt($ci, CURLOPT_RETURNTRANSFER, true);
        
        switch ($method) {
            case "POST":
                curl_setopt($ci, CURLOPT_POST, true);
                if (!empty($postfields)) {
                    // 对于JSON API，直接将数组转换为JSON字符串
                    if (is_array($postfields)) {
                        $tmpdatastr = json_encode($postfields);
                    } else {
                        $tmpdatastr = $postfields;
                    }
                    curl_setopt($ci, CURLOPT_POSTFIELDS, $tmpdatastr);
                }
                break;
            default:
                curl_setopt($ci, CURLOPT_CUSTOMREQUEST, $method); /* //设置请求方式 */
                break;
        }

        $ssl = preg_match('/^https:\/\//i', $url) ? TRUE : FALSE;
        curl_setopt($ci, CURLOPT_URL, $url);
        if ($ssl) {
            curl_setopt($ci, CURLOPT_SSL_VERIFYPEER, FALSE); // https请求 不验证证书和hosts
            curl_setopt($ci, CURLOPT_SSL_VERIFYHOST, FALSE); // 不从证书中检查SSL加密算法是否存在
        }
        
        if (ini_get('open_basedir') == '' && ini_get('safe_mode' == 'Off')) {
            curl_setopt($ci, CURLOPT_FOLLOWLOCATION, 1);
        }
        curl_setopt($ci, CURLOPT_MAXREDIRS, 2);/*指定最多的HTTP重定向的数量，这个选项是和CURLOPT_FOLLOWLOCATION一起使用的*/
        curl_setopt($ci, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ci, CURLINFO_HEADER_OUT, true);
        
        $response    = curl_exec($ci);
        $requestinfo = curl_getinfo($ci);
        $http_code   = curl_getinfo($ci, CURLINFO_HTTP_CODE);
        
        if ($debug) {
            echo "=====post data======\r\n";
            var_dump($postfields);
            echo "=====info===== \r\n";
            print_r($requestinfo);
            echo "=====response=====\r\n";
            print_r($response);
        }
        
        curl_close($ci);
        return $response;
    }



}