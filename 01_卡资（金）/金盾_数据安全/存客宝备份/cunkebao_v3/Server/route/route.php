<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006~2018 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: liu21st <liu21st@gmail.com>
// +----------------------------------------------------------------------

use think\facade\Route;

 // 允许跨域
 header('Access-Control-Allow-Origin: '  . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
 header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
 header('Access-Control-Allow-Headers: Cookie, Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, X-Requested-With, X-Token, X-Api-Token');
 header('Access-Control-Max-Age: 1728000');
 header('Access-Control-Allow-Credentials: true');

// 加载Store模块路由配置
include __DIR__ . '/../application/api/config/route.php';

// 加载Common模块路由配置
include __DIR__ . '/../application/common/config/route.php';

// 加载Cunkebao模块路由配置
include __DIR__ . '/../application/cunkebao/config/route.php';

// 加载Store模块路由配置
include __DIR__ . '/../application/store/config/route.php';

// 加载Superadmin模块路由配置
include __DIR__ . '/../application/superadmin/config/route.php';

// 加载CozeAI模块路由配置
include __DIR__ . '/../application/cozeai/config/route.php';

// 加载AI模块路由配置
include __DIR__ . '/../application/ai/config/route.php';

// 加载存客宝模块路由配置
include __DIR__ . '/../application/chukebao/config/route.php';

return [];
