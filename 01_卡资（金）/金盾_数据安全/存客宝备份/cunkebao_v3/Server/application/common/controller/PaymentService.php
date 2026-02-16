<?php

namespace app\common\controller;

use app\chukebao\model\TokensCompany;
use app\chukebao\model\TokensRecord;
use think\Db;
use app\common\util\PaymentUtil;
use think\facade\Env;
use think\facade\Request;
use app\common\model\Order;
use app\common\model\User;

/**
 * 支付服务（内部调用）
 */
class PaymentService
{
    /**
     * 统一支付下单接口
     * 支持扫码付款、微信支付、支付宝支付
     *
     * @param array $order
     *  - orderNo: string 商户订单号（必填）
     *  - money: int 金额（分，必填）
     *  - goodsName: string 商品描述（必填）
     *  - service: string 支付服务类型（可选）
     *    - 'wechat' 或 'pay.weixin.jspay': 微信JSAPI支付
     *    - 'alipay' 或 'pay.alipay.jspay': 支付宝JSAPI支付
     *    - 不传或空: 默认扫码付款
     *  - openid: string 微信用户openid（微信JSAPI支付必填）
     *  - buyer_id: string 支付宝用户ID（支付宝JSAPI支付可选）
     *  - notify_url: string 异步通知地址（可选）
     * @return string JSON格式响应
     */
    public function createOrder(array $order)
    {
        // 确定service类型：支持简写形式 wechat/alipay，或完整的 service 值
        $serviceType = $order['service'] ?? '';

        // 映射简写形式到完整的 service 值
        if ($serviceType === 'wechat' || $serviceType === 'pay.weixin.jspay') {
            $service = 'pay.weixin.jspay';
        } elseif ($serviceType === 'alipay' || $serviceType === 'pay.alipay.jspay') {
            $service = 'pay.alipay.jspay';
        } elseif ($serviceType === 'qrCode' || $serviceType === 'unified.trade.native') {
            $service = 'unified.trade.native';
        } else {
            // 默认扫码支付
            $service = 'unified.trade.native';
        }

        // 构建基础参数
        $params = [
            'service' => $service,
            'sign_type' => PaymentUtil::SIGN_TYPE_MD5,
            'mch_id' => Env::get('payment.mchId'),
            'out_trade_no' => $order['orderNo'],
            'body' => $order['goodsName'] ?? '',
            'total_fee' => $order['money'] ?? 0,
            'mch_create_ip' => Request::ip(),
            'notify_url' => $order['notify_url'] ?? Env::get('payment.notify_url', '127.0.0.1'),
            'nonce_str' => PaymentUtil::generateNonceStr(),
        ];

         // 微信JSAPI支付需要openid
         if ($service == 'pay.weixin.jspay') {
            // $params['sub_openid'] = 'oB44Yw1T6bfVAZwjj729P-6CUSPE';
             $params['is_raw'] = 0;
             $params['mch_app_name'] = '存客宝';
             $params['mch_app_id'] = 'https://kr-op.quwanzhi.com';
         }

         // 支付宝JSAPI支付需要buyer_id（可选）
         if ($service == 'pay.alipay.jspay') {
             $params['is_raw'] = 0;
             $params['quit_url'] = $params['notify_url'];
             $params['buyer_id'] = '';
         }

        Db::startTrans();
        try {
            // 签名
            $secret = Env::get('payment.key');
            $params['sign_type'] = 'MD5';
            $params['sign'] = PaymentUtil::generateSign($params, $secret, 'MD5');

            $url = Env::get('payment.url');
            if (empty($url)) {
                throw new \Exception('支付网关地址未配置');
            }

            // 创建订单
            Order::create([
                'mchId' => $params['mch_id'],
                'companyId' => isset($order['companyId']) ? $order['companyId'] : 0,
                'userId' => isset($order['userId']) ? $order['userId'] : 0,
                'orderType' => isset($order['orderType']) ? $order['orderType'] : 1,
                'status' => 0,
                'goodsId' => isset($order['goodsId']) ? $order['goodsId'] : 0,
                'goodsName' => isset($order['goodsName']) ? $order['goodsName'] : '',
                'money' => isset($order['money']) ? $order['money'] : 0,
                'goodsSpecs' => isset($order['goodsSpecs']) ? json_encode($order['goodsSpecs'], 256) : json_encode([]),
                'orderNo' => isset($order['orderNo']) ? $order['orderNo'] : '',
                'ip' => Request::ip(),
                'nonceStr' => isset($order['nonceStr']) ? $order['nonceStr'] : '',
                'createTime' => time(),
            ]);

            // XML POST 请求
            $xmlBody = $this->arrayToXml($params);
            $response = $this->postXml($url, $xmlBody);
            $parsed = $this->parseXmlOrRaw($response);


            if ($parsed['status'] == 0 && $parsed['result_code'] == 0) {
                Db::commit();

                // 根据service类型返回不同的数据格式（仅返回接口文档中的字段）
                $responseData = null;
                if ($service == 'unified.trade.native') {
                    // 扫码支付返回二维码URL
                    $responseData = $parsed['code_img_url'] ?? '';
                } elseif ($service == 'pay.weixin.jspay') {
                    // 微信JSAPI支付返回支付参数（仅返回接口文档中存在的字段）
                    $responseData = [];
                    if (isset($parsed['appid'])) $responseData['appid'] = $parsed['appid'];
                    if (isset($parsed['time_stamp'])) $responseData['time_stamp'] = $parsed['time_stamp'];
                    if (isset($parsed['nonce_str'])) $responseData['nonce_str'] = $parsed['nonce_str'];
                    if (isset($parsed['package'])) $responseData['package'] = $parsed['package'];
                    if (isset($parsed['sign_type'])) $responseData['sign_type'] = $parsed['sign_type'];
                    if (isset($parsed['pay_sign'])) $responseData['pay_sign'] = $parsed['pay_sign'];
                } elseif ($service == 'pay.alipay.jspay') {
                    // 支付宝JSAPI支付返回订单信息（仅返回接口文档中存在的字段）
                    $responseData = [];
                    if (isset($parsed['order_info'])) $responseData['order_info'] = $parsed['order_info'];
                    if (isset($parsed['order_string'])) $responseData['order_string'] = $parsed['order_string'];
                }

                return json_encode(['code' => 200, 'msg' => '订单创建成功', 'data' => $responseData]);
            } else {
                Db::rollback();
                return json_encode(['code' => 500, 'msg' => '订单创建失败：' . ($parsed['err_msg'] ?? '未知错误')]);
            }

        } catch (\Exception $e) {
            Db::rollback();
            return json_encode(['code' => 500, 'msg' => '订单创建失败：' . $e->getMessage()]);
        }
    }


    /**
     * POST 请求（x-www-form-urlencoded）
     */
    protected function httpPost(string $url, array $params, array $headers = [])
    {
        if (!function_exists('requestCurl')) {
            throw new \RuntimeException('requestCurl 未定义');
        }
        return requestCurl($url, $params, 'POST', $headers, 'dataBuild');
    }

    /**
     * 解析响应
     */
    protected function parseResponse($response)
    {
        if ($response === '' || $response === null) {
            return '';
        }
        $decoded = json_decode($response, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        if (strpos($response, '=') !== false && strpos($response, '&') !== false) {
            $arr = [];
            foreach (explode('&', $response) as $pair) {
                if ($pair === '') continue;
                $kv = explode('=', $pair, 2);
                $arr[$kv[0]] = $kv[1] ?? '';
            }
            return $arr;
        }
        return $response;
    }

    /**
     * 以 XML 方式 POST（text/xml）
     */
    protected function postXml(string $url, string $xml)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: text/xml; charset=UTF-8'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $xml);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $res = curl_exec($ch);
        curl_close($ch);
        return $res;
    }

    /**
     * 数组转 XML（按 ASCII 升序，字符串走 CDATA）
     */
    protected function arrayToXml(array $data): string
    {
        // 过滤空值
        $filtered = [];
        foreach ($data as $k => $v) {
            if ($v === '' || $v === null) continue;
            $filtered[$k] = $v;
        }
        ksort($filtered, SORT_STRING);

        $xml = '<xml>';
        foreach ($filtered as $key => $value) {
            if (is_numeric($value)) {
                $xml .= "<{$key}>{$value}</{$key}>";
            } else {
                $xml .= "<{$key}><![CDATA[{$value}]]></{$key}>";
            }
        }
        $xml .= '</xml>';
        return $xml;
    }

    /**
     * 解析 XML 响应
     */
    protected function parseXmlOrRaw($response)
    {
        if (!is_string($response) || $response === '') {
            return $response;
        }
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOCDATA);
        if ($xml !== false) {
            $json = json_encode($xml, JSON_UNESCAPED_UNICODE);
            return json_decode($json, true);
        }
        return $response;
    }

    /**
     * 支付结果异步通知
     * - 威富通回调为 XML；需校验签名与业务字段并更新订单
     * - 支持扫码付款、微信支付、支付宝支付的通知
     * - 回应：成功返回XML格式SUCCESS，失败返回XML格式FAIL
     * @return string XML响应
     */
    public function notify()
    {
        $rawBody = file_get_contents('php://input');
        $payload = $this->parseXmlOrRaw($rawBody);
        if (!is_array($payload) || empty($payload)) {
            \think\facade\Log::error('支付通知：XML解析错误', ['rawBody' => $rawBody]);
            return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[XML解析错误]]></return_msg></xml>';
        }

        // 验证签名
        $secret = Env::get('payment.key');
        if (!empty($secret) && isset($payload['sign'])) {
            $signType = $payload['sign_type'] ?? 'MD5';
            if (!PaymentUtil::verifySign($payload, $secret, $signType)) {
                \think\facade\Log::error('支付通知：签名验证失败', ['payload' => $payload]);
                return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>';
            }
        }

        // 检查通信状态
        if (isset($payload['status']) && $payload['status'] != 0) {
            $errMsg = $payload['err_msg'] ?? '通信失败';
            \think\facade\Log::error('支付通知：通信失败', ['payload' => $payload]);
            return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[' . $errMsg . ']]></return_msg></xml>';
        }

        // 检查业务结果
        if (isset($payload['result_code']) && $payload['result_code'] != 0) {
            $errMsg = $payload['err_msg'] ?? '业务处理失败';
            \think\facade\Log::error('支付通知：业务处理失败', ['payload' => $payload]);
            return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[' . $errMsg . ']]></return_msg></xml>';
        }


        // 业务处理：更新订单
        Db::startTrans();
        try {
            $outTradeNo = $payload['out_trade_no'] ?? '';
            $pay_result = $payload['pay_result'] ?? 0;
            $time_end = $payload['time_end'] ?? '';

            if (empty($outTradeNo)) {
                Db::rollback();
                \think\facade\Log::error('支付通知：订单号为空', ['payload' => $payload]);
                return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单号为空]]></return_msg></xml>';
            }

            $order = Order::where('orderNo', $outTradeNo)->find();
            if (!$order) {
                Db::rollback();
                \think\facade\Log::error('支付通知：订单不存在', ['out_trade_no' => $outTradeNo]);
                return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>';
            }

            // 如果订单已支付，直接返回成功（防止重复处理）
            if ($order->status == 1) {
                Db::rollback();
                return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
            }

            if ($pay_result != 0) {
                $order->payInfo = $payload['pay_info'] ?? '支付失败';
                $order->status = 3;
                $order->save();
                Db::commit();
                \think\facade\Log::error('支付通知：支付失败', ['orderNo' => $outTradeNo, 'pay_info' => $payload['pay_info'] ?? '']);
                return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[' . ($payload['pay_info'] ?? '支付失败') . ']]></return_msg></xml>';
            }

            // 根据trade_type判断支付方式
            $tradeType = $payload['trade_type'] ?? '';
            if (strpos($tradeType, 'wechat') !== false || strpos($tradeType, 'weixin') !== false) {
                $order->payType = 1; // 微信支付
            } elseif (strpos($tradeType, 'alipay') !== false) {
                $order->payType = 2; // 支付宝支付
            } else {
                // 默认根据原有逻辑判断
                $order->payType = $tradeType == 'pay.wechat.jspay' ? 1 : 2;
            }

            $order->status = 1;
            $order->payTime = $this->parsePayTime($time_end);
            $order->transactionId = $payload['transaction_id'] ?? '';
            $order->save();
            //订单处理
            $this->processOrder($order);
            Db::commit();

            // 返回成功响应（XML格式）
            return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
        } catch (\Exception $e) {
            Db::rollback();
            \think\facade\Log::error('支付通知：处理异常', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return '<?xml version="1.0" encoding="UTF-8"?><xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理异常]]></return_msg></xml>';
        }
    }

    /**
     * 解析威富通时间（yyyyMMddHHmmss）为时间戳
     */
    protected function parsePayTime(string $timeEnd)
    {
        if ($timeEnd === '') {
            return 0;
        }
        // 期望格式：20250102153045
        if (preg_match('/^\\d{14}$/', $timeEnd) !== 1) {
            return 0;
        }
        $dt = \DateTime::createFromFormat('YmdHis', $timeEnd, new \DateTimeZone('Asia/Shanghai'));
        return $dt ? $dt->getTimestamp() : 0;
    }

    /**
     * 查询订单（威富通 unified.trade.query）
     * - 入参：商户订单号或平台交易号
     * - 出参：统一 JSON 格式，包含交易状态与关键信息
     * @param array $query
     *  - out_trade_no: string 商户订单号（与 transaction_id 二选一）
     *  - transaction_id: string 平台交易号（与 out_trade_no 二选一）
     * @return \think\response\Json
     */
    public function queryOrder($orderNo = '')
    {
        if (empty($orderNo)) {
            return json(['code' => 422, 'msg' => '订单号缺失']);
        }

        $params = [
            'service' => 'unified.trade.query',
            'mch_id' => Env::get('payment.mchId'),
            'out_trade_no' => $orderNo ?: null,
            'nonce_str' => PaymentUtil::generateNonceStr(),
            'sign_type' => 'MD5',
        ];

        // 过滤空值后签名
        $secret = Env::get('payment.key');
        if (empty($secret)) {
            return json_encode(['code' => 500, 'msg' => '支付密钥未配置']);
        }

        $filtered = [];
        foreach ($params as $k => $v) {
            if ($v === '' || $v === null) continue;
            $filtered[$k] = $v;
        }
        $filtered['sign'] = PaymentUtil::generateSign($filtered, $secret, $filtered['sign_type']);

        $url = Env::get('payment.url');
        if (empty($url)) {
            return json_encode(['code' => 500, 'msg' => '支付网关地址未配置']);
        }

        // 请求网关
        $xmlBody = $this->arrayToXml($filtered);
        $response = $this->postXml($url, $xmlBody);
        $parsed = $this->parseXmlOrRaw($response);

        if (!is_array($parsed)) {
            return json_encode(['code' => 500, 'msg' => '响应解析失败', 'data' => $response]);
        }

        if ($parsed['status'] != 0) {
            return json_encode(['code' => 500, 'msg' => '通信失败']);
        }


        if ($parsed['result_code'] == 0) {
            $order = Order::where('orderNo', $orderNo)->lock(true)->find();
            if (empty($order)) {
                return json_encode(['code' => 500, 'msg' => '订单不存在']);
            }

            if ($order['status'] == 1) {
                return json_encode(['code' => 200, 'msg' => '支付成功']);
            }


            $tradeState = $parsed['trade_state'] ?? '';
            $resp = [
                'trade_state' => $tradeState,
                'trade_state_desc' => $parsed['trade_state_desc'] ?? '',
                'transaction_id' => $parsed['transaction_id'] ?? '',
                'out_trade_no' => $parsed['out_trade_no'] ?? $orderNo,
                'total_fee' => isset($parsed['total_fee']) ? (int)$parsed['total_fee'] : null,
                'time_end' => $parsed['time_end'] ?? '',
                'buyer_logon_id' => $parsed['buyer_logon_id'] ?? '',
                'bank_type' => $parsed['bank_type'] ?? '',
            ];

            // 若已支付，同步本地订单
            if ($tradeState == 'SUCCESS') {
                Db::startTrans();
                try {
                    /** @var Order|null $order */
                    $order = Order::where('orderNo', $resp['out_trade_no'])->lock(true)->find();
                    if ($order) {
                        $paidAt = $this->parsePayTime($resp['time_end'] ?? '') ?: time();
                        if ($order['status'] != 1) {
                            $order->save([
                                'status' => 1,
                                'transactionId' => $resp['transaction_id'] ?? '',
                                'payTime' => $paidAt,
                                'updateTime' => time(),
                            ]);
                        }
                    }
                    //订单处理
                    $this->processOrder($order);
                    Db::commit();
                    return json_encode(['code' => 200, 'msg' => '支付成功']);
                } catch (\Exception $e) {
                    Db::rollback();
                    return json_encode(['code' => 500, 'msg' => '付款失败' . $e->getMessage()]);
                }
            } else {
                $order = Order::where('orderNo', $resp['out_trade_no'])->lock(true)->find();
                if ($order) {
                    $order->status = 3;
                    $order->payInfo = $resp['trade_state_desc'] ?? '';
                    $order->save();
                }
                return json_encode(['code' => 500, 'msg' => '支付失败', 'data' => $resp]);
            }

        } else {
            return json_encode(['code' => 500, 'msg' => '通信失败']);
        }
    }


    public function processOrder($order = [])
    {
        if (empty($order)) {
            return false;
        }

        switch ($order['orderType']) {
            case 1:
                // 处理购买算力
                // 查询用户信息，判断是否为管理员（需要同时匹配userId和companyId）
                $user = User::where([
                    'id' => $order->userId,
                    'companyId' => $order->companyId
                ])->find();
                $isAdmin = (!empty($user) && isset($user->isAdmin) && $user->isAdmin == 1) ? 1 : 0;
                
                $token = TokensCompany::where(['companyId' => $order->companyId,'userId' => $order->userId])->find();
                $goodsSpecs = json_decode($order->goodsSpecs, true);
                if (!empty($token)) {
                    $token->tokens = $token->tokens + $goodsSpecs['tokens'];
                    $token->updateTime = time();
                    $token->save();
                    $newTokens = $token->tokens;
                } else {
                    $tokensCompany = new TokensCompany();
                    $tokensCompany->userId = $order->userId;
                    $tokensCompany->companyId = $order->companyId;
                    $tokensCompany->tokens = $goodsSpecs['tokens'];
                    $tokensCompany->isAdmin = $isAdmin;
                    $tokensCompany->createTime = time();
                    $tokensCompany->updateTime = time();
                    $tokensCompany->save();
                    $newTokens = $tokensCompany->tokens;
                }
                //添加记录
                $record = new TokensRecord();
                $record->companyId = $order->companyId;
                $record->userId = $order->userId;
                $record->type = 1;
                $record->form = 5;
                $record->wechatAccountId = 0;
                $record->friendIdOrGroupId = 0;
                $record->remarks = '购买算力【' . $goodsSpecs['name'] . '】';
                $record->tokens = $goodsSpecs['tokens'];
                $record->balanceTokens = $newTokens;
                $record->createTime = time();
                $record->save();
                break;
        }

        return true;
    }

}