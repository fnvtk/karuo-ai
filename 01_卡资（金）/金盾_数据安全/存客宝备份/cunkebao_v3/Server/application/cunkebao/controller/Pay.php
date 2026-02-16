<?php

namespace app\cunkebao\controller;


use app\common\controller\PaymentService;

class Pay
{

    public function createOrder()
    {
        $order = [
            'companyId' => 111,
            'userId' => 111,
            'orderNo' => date('YmdHis') . rand(100000, 999999),
            'goodsId' => 34,
            'goodsName' => '测试测试',
            'orderType' => 1,
            'money' => 1
        ];

        $paymentService = new PaymentService();
        $res = $paymentService->createOrder($order);
        return $res;
    }
}