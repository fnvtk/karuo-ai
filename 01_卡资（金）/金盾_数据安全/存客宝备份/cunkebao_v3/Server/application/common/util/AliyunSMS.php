<?php

namespace app\common\util;

use Darabonba\OpenApi\Models\Config;
use AlibabaCloud\SDK\Dysmsapi\V20170525\Dysmsapi;
use AlibabaCloud\SDK\Dysmsapi\V20170525\Models\SendSmsRequest;
use AlibabaCloud\Tea\Utils\Utils\RuntimeOptions;

class AliyunSMS {

    const ACCESS_KEY_ID = 'LTAI5tFjVRYAFmo6fayvv2Te';
    const ACCESS_KEY_SECRET = 'mdc7KETPGVon8PiA2kfM47rAOpJne8';
    const SIGN_NAME = '广州宏科网络';

    const TC_VCODE = 'SMS_464445466';

    static public function createClient() {
        $config = new Config([
            // AccessKey ID
            'accessKeyId' => static::ACCESS_KEY_ID,
            // AccessKey Secret
            'accessKeySecret' => static::ACCESS_KEY_SECRET
        ]);

        // 访问的域名
        $config->endpoint = 'dysmsapi.aliyuncs.com';

        return new Dysmsapi($config);
    }

    /**
     * 发送验证码
     *
     * @param $phoneNumbers
     * @param $templateCode
     * @param array $templateParam
     * @return bool
     */
    static public function send($phoneNumbers, $templateCode, array $templateParam = array()) {
        $client = static::createClient();
        $sendSmsRequest = new SendSmsRequest([
            'phoneNumbers'  => $phoneNumbers,
            'signName'      => static::SIGN_NAME,
            'templateCode'  => $templateCode,
            'templateParam' => json_encode($templateParam)
        ]);
        $runtime = new RuntimeOptions([]);
        $logFile = ROOT_PATH . DS . 'aliyun-sms.txt';
        try {
            $data = $client->sendSmsWithOptions($sendSmsRequest, $runtime);
            if ($data->body->code === 'OK') {
                return TRUE;
            }

            $logData = print_r($data, TRUE);
        } catch (\Exception $ex) {
            $logData = print_r($ex, TRUE);
        }

        file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . ']' . PHP_EOL . $logData . PHP_EOL . PHP_EOL, FILE_APPEND);

        return FALSE;
    }
} 