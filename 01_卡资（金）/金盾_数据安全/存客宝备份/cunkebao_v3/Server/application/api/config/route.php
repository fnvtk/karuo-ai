<?php
// store模块路由配置

use think\facade\Route;

// 定义RESTful风格的API路由
Route::group('v1', function () {
    Route::group('api', function () {
        // Account控制器路由
        Route::group('account', function () {
            Route::get('list', 'app\api\controller\AccountController@getList'); // 获取账号列表 √
            Route::post('create', 'app\api\controller\AccountController@createAccount'); // 创建账号 √
            Route::post('createNewAccount', 'app\api\controller\AccountController@createNewAccount'); // 创建新账号（包含创建部门） √
            Route::post('department/create', 'app\api\controller\AccountController@createDepartment'); // 创建部门 √
            Route::get('department/list', 'app\api\controller\AccountController@getDepartmentList'); // 获取部门列表 √
            Route::post('department/update', 'app\api\controller\AccountController@updateDepartment'); // 更新部门 √
            Route::post('department/delete', 'app\api\controller\AccountController@deleteDepartment'); // 删除部门 √
            Route::post('department/setPrivileges', 'app\api\controller\AccountController@setPrivileges'); // 设置部门权限 √
        });

        // Device控制器路由
        Route::group('device', function () {
            Route::get('list', 'app\api\controller\DeviceController@getList'); // 获取设备列表 √
            Route::post('add', 'app\api\controller\DeviceController@addDevice'); // 生成设备二维码（POST方式） √
            Route::post('updateDeviceGroup', 'app\api\controller\DeviceController@updateDeviceGroup'); // 更新设备分组 √
            Route::post('updateaccount', 'app\api\controller\DeviceController@updateaccount'); // 更新设备账号 √
            Route::post('createGroup', 'app\api\controller\DeviceController@createGroup'); // 创建设备分组 √
            Route::get('groupList', 'app\api\controller\DeviceController@getGroupList'); // 获取设备分组列表 √
            Route::post('updateDeviceToGroup', 'app\api\controller\DeviceController@updateDeviceToGroup'); // 更新设备的分组 √

            Route::post('importContact', 'app\api\controller\DeviceController@importContact'); // 更新设备联系人 √
        });

        // FriendTask控制器路由
        Route::group('friend-task', function () {
            Route::get('list', 'app\api\controller\FriendTaskController@getList'); // 获取添加好友记录列表 √
            Route::post('add', 'app\api\controller\FriendTaskController@addFriendTask'); // 添加好友任务 √
        });

        // Moments控制器路由
        Route::group('moments', function () {
            Route::post('add-job', 'app\api\controller\MomentsController@addJob'); // 发布朋友圈 
            Route::get('list', 'app\api\controller\MomentsController@getList'); // 获取朋友圈任务列表 √
        });

        // Stats控制器路由
        Route::group('stats', function () {
            Route::get('basic-data', 'app\api\controller\StatsController@basicData'); // 账号基本信息
            Route::get('fans-statistics', 'app\api\controller\StatsController@FansStatistics'); // 好友统计
        });

        // User控制器路由
        Route::group('user', function () {
            Route::post('login', 'app\api\controller\UserController@login'); // 登录 √
            Route::post('token', 'app\api\controller\UserController@getNewToken'); // 获取新的token √
            Route::get('info', 'app\api\controller\UserController@getAccountInfo'); // 获取商户基本信息 √
            Route::post('modify-pwd', 'app\api\controller\UserController@modifyPwd'); // 修改密码
            Route::get('logout', 'app\api\controller\UserController@logout'); // 登出  √
            Route::get('verify-code', 'app\api\controller\UserController@getVerifyCode'); // 获取验证码 √
        });

        // WebSocket控制器路由
        Route::group('websocket', function () {
            Route::post('send-personal', 'app\api\controller\WebSocketController@sendPersonal'); // 个人消息发送 √
            Route::post('send-community', 'app\api\controller\WebSocketController@sendCommunity'); // 发送群消息 √
            Route::get('get-moments', 'app\api\controller\WebSocketController@getMoments'); // 获取指定账号朋友圈信息 √
            Route::get('get-moment-source', 'app\api\controller\WebSocketController@getMomentSourceRealUrl'); // 获取指定账号朋友圈图片地址
        });

        // WechatChatroom控制器路由
        Route::group('chatroom', function () {
            Route::get('list', 'app\api\controller\WechatChatroomController@getList'); // 获取微信群聊列表 √
            Route::get('members', 'app\api\controller\WechatChatroomController@listChatroomMember'); // 获取群成员列表 √
           // Route::get('sync', 'app\api\controller\WechatChatroomController@syncChatrooms'); // 同步微信群聊数据 √
        });

        // Wechat控制器路由
        Route::group('wechat', function () {
            Route::get('list', 'app\api\controller\WechatController@getList'); // 获取微信账号列表 √
        });

        // WechatFriend控制器路由
        Route::group('friend', function () {
            Route::get('list', 'app\api\controller\WechatFriendController@getList'); // 获取微信好友列表数据 √
        });

        // Message控制器路由
        Route::group('message', function () {
            Route::get('getFriendsList', 'app\api\controller\MessageController@getFriendsList'); // 获取微信好友列表 √
            Route::get('getChatroomList', 'app\api\controller\MessageController@getChatroomList'); // 同步群聊消息 √
        });

        // AllotRule控制器路由
        Route::group('allot-rule', function () {
            Route::get('list', 'app\api\controller\AllotRuleController@getAllRules'); // 获取所有分配规则 √
            Route::post('create', 'app\api\controller\AllotRuleController@createRule');// 创建分配规则 √
            Route::post('edit', 'app\api\controller\AllotRuleController@updateRule');// 编辑分配规则 √
            Route::delete('del', 'app\api\controller\AllotRuleController@deleteRule');// 删除分配规则 √
            Route::get('autoCreate', 'app\api\controller\AllotRuleController@autoCreateAllotRules');// 自动创建分配规则 √
        });

        // CallRecording控制器路由
        Route::group('call-recording', function () {
            Route::get('list', 'app\api\controller\CallRecordingController@getlist'); // 获取通话记录列表 √
        });

        
    });
});