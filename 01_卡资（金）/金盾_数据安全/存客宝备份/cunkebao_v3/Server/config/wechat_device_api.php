<?php

return [
    // 默认使用的供应商适配器标识
    'default_adapter' => 'ChuKeBao',

    // 各个供应商适配器的配置
    'adapters' => [
        'ChuKeBao' => [
            'driver'     => \WeChatDeviceApi\Adapters\ChuKebao\Adapter::class,
//            'api_key'    => env('ChuKebao_API_KEY', ''),
//            'api_secret' => env('ChuKebao_API_SECRET', ''),
            'base_url'   => env('api.wechat_url'),
            'username' => env('api.username', ''),
            'password' => env('api.password', ''),
        ],
        // ... 更多供应商
    ],
];