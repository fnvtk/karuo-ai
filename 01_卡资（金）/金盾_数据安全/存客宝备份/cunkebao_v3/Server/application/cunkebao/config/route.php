<?php
// +----------------------------------------------------------------------
// | 设备管理模块路由配置
// +----------------------------------------------------------------------

use think\facade\Route;

// 定义RESTful风格的API路由
Route::group('v1/', function () {

    Route::group('user', function () {
        Route::put('editUserInfo', 'app\cunkebao\controller\BaseController@editUserInfo');
        Route::put('editPassWord', 'app\cunkebao\controller\BaseController@editPassWord');
    });



    // 设备管理相关
    Route::group('devices', function () {
        Route::get('isUpdataWechat', 'app\cunkebao\controller\device\GetDeviceDetailV1Controller@isUpdataWechat');
        Route::put('refresh', 'app\cunkebao\controller\device\RefreshDeviceDetailV1Controller@index');
        Route::get('add-results', 'app\cunkebao\controller\device\GetAddResultedV1Controller@index');
        Route::post('task-config', 'app\cunkebao\controller\device\UpdateDeviceTaskConfigV1Controller@index');
        Route::get(':id/task-config', 'app\cunkebao\controller\device\GetDeviceTaskConfigV1Controller@index');
        Route::get(':id/handle-logs', 'app\cunkebao\controller\device\GetDeviceHandleLogsV1Controller@index');
        Route::get(':id', 'app\cunkebao\controller\device\GetDeviceDetailV1Controller@index');
        Route::delete(':id', 'app\cunkebao\controller\device\DeleteDeviceV1Controller@index');
        Route::get('', 'app\cunkebao\controller\device\GetDeviceListV1Controller@index');
        Route::post('', 'app\cunkebao\controller\device\PostAddDeviceV1Controller@index');
    });

    // 设备微信相关
    Route::group('wechats', function () {
        Route::get('related-device/:id', 'app\cunkebao\controller\wechat\GetWechatsRelatedDeviceV1Controller@index');
        Route::get('', 'app\cunkebao\controller\wechat\GetWechatsOnDevicesV1Controller@index');
        Route::get(':id/summary', 'app\cunkebao\controller\wechat\GetWechatOnDeviceSummarizeV1Controller@index');
        Route::get(':id/friends', 'app\cunkebao\controller\wechat\GetWechatOnDeviceFriendsV1Controller@index');
        Route::get('getWechatInfo', 'app\cunkebao\controller\wechat\GetWechatController@getWechatInfo');
        Route::get('overview', 'app\cunkebao\controller\wechat\GetWechatOverviewV1Controller@index'); // 获取微信账号概览数据
        Route::get('moments', 'app\cunkebao\controller\wechat\GetWechatMomentsV1Controller@index'); // 获取微信朋友圈
        Route::get('moments/export', 'app\cunkebao\controller\wechat\GetWechatMomentsV1Controller@export'); // 导出微信朋友圈
        Route::get('count', 'app\cunkebao\controller\DeviceWechat@count');
        Route::get('device-count', 'app\cunkebao\controller\DeviceWechat@deviceCount'); // 获取有登录微信的设备数量
        Route::put('refresh', 'app\cunkebao\controller\DeviceWechat@refresh');  // 刷新设备微信状态
        Route::post('transfer-friends', 'app\cunkebao\controller\wechat\PostTransferFriends@index'); // 微信好友转移
        Route::get(':wechatId', 'app\cunkebao\controller\wechat\GetWechatProfileV1Controller@index');
    });

    // 获客场景相关
    Route::group('plan', function () {
        Route::get('scenes', 'app\cunkebao\controller\plan\GetPlanSceneListV1Controller@index');
        Route::get('scenes-detail', 'app\cunkebao\controller\plan\GetPlanSceneListV1Controller@detail');
        Route::post('create', 'app\cunkebao\controller\plan\PostCreateAddFriendPlanV1Controller@index');
        Route::get('list', 'app\cunkebao\controller\plan\PlanSceneV1Controller@index');
        Route::get('copy', 'app\cunkebao\controller\plan\GetCreateAddFriendPlanV1Controller@copy');
        Route::delete('delete', 'app\cunkebao\controller\plan\PlanSceneV1Controller@delete');
        Route::post('updateStatus', 'app\cunkebao\controller\plan\PlanSceneV1Controller@updateStatus');
        Route::get('detail', 'app\cunkebao\controller\plan\GetAddFriendPlanDetailV1Controller@index');
        Route::PUT('update', 'app\cunkebao\controller\plan\PostUpdateAddFriendPlanV1Controller@index');
        Route::get('getWxMinAppCode', 'app\cunkebao\controller\plan\PlanSceneV1Controller@getWxMinAppCode');
        Route::get('getUserList', 'app\cunkebao\controller\plan\PlanSceneV1Controller@getUserList');
    });

    // 流量池相关
    Route::group('traffic/pool', function () {
        Route::get('getPackage', 'app\cunkebao\controller\TrafficController@getPackage'); // 获取流量池包列表
        Route::get('getPackageDetail', 'app\cunkebao\controller\TrafficController@getPackageDetail'); // 获取流量池详情（元数据）
        Route::post('addPackage', 'app\cunkebao\controller\TrafficController@addPackage');
        Route::post('editPackage', 'app\cunkebao\controller\TrafficController@editPackage');
        Route::delete('deletePackage', 'app\cunkebao\controller\TrafficController@deletePackage');

        Route::get('user-list', 'app\cunkebao\controller\TrafficController@getTrafficPoolList'); // 获取流量池用户列表（数据列表）




        //Route::get('', 'app\cunkebao\controller\traffic\GetPotentialListWithInCompanyV1Controller@index');
        Route::get('getUserJourney', 'app\cunkebao\controller\traffic\GetPotentialListWithInCompanyV1Controller@getUserJourney');
        Route::get('getUserTags', 'app\cunkebao\controller\traffic\GetPotentialListWithInCompanyV1Controller@getUserTags');
        Route::get('getUserInfo', 'app\cunkebao\controller\traffic\GetPotentialListWithInCompanyV1Controller@getUser');
       // Route::post('addPackage', 'app\cunkebao\controller\traffic\GetPotentialListWithInCompanyV1Controller@addPackage');




        Route::get('converted', 'app\cunkebao\controller\traffic\GetConvertedListWithInCompanyV1Controller@index');
        Route::get('types', 'app\cunkebao\controller\traffic\GetPotentialTypeSectionV1Controller@index');
        Route::get('sources', 'app\cunkebao\controller\traffic\GetTrafficSourceSectionV1Controller@index');
        Route::get('statistics', 'app\cunkebao\controller\traffic\GetPoolStatisticsV1Controller@index');



    });

    // 工作台相关
    Route::group('workbench', function () {
        Route::post('create', 'app\cunkebao\controller\workbench\WorkbenchController@create'); // 创建工作台
        Route::get('list', 'app\cunkebao\controller\workbench\WorkbenchController@getList'); // 获取工作台列表
        Route::post('update-status', 'app\cunkebao\controller\workbench\WorkbenchController@updateStatus'); // 更新工作台状态
        Route::delete('delete', 'app\cunkebao\controller\workbench\WorkbenchController@delete'); // 删除工作台
        Route::post('copy', 'app\cunkebao\controller\workbench\WorkbenchController@copy'); // 拷贝工作台
        Route::get('detail', 'app\cunkebao\controller\workbench\WorkbenchController@detail'); // 获取工作台详情
        Route::post('update', 'app\cunkebao\controller\workbench\WorkbenchController@update'); // 更新工作台
        Route::get('like-records', 'app\cunkebao\controller\workbench\WorkbenchController@getLikeRecords'); // 获取点赞记录列表
        Route::get('moments-records', 'app\cunkebao\controller\workbench\WorkbenchController@getMomentsRecords'); // 获取朋友圈发布记录列表
        Route::get('device-labels', 'app\cunkebao\controller\workbench\WorkbenchController@getDeviceLabels'); // 获取设备微信好友标签统计
        Route::get('group-list', 'app\cunkebao\controller\workbench\WorkbenchController@getGroupList'); // 获取群列表
        Route::get('created-groups-list', 'app\cunkebao\controller\workbench\WorkbenchController@getCreatedGroupsList'); // 获取已创建的群列表（自动建群）
        Route::get('created-group-detail', 'app\cunkebao\controller\workbench\WorkbenchController@getCreatedGroupDetail'); // 获取已创建群的详情（自动建群）
        Route::post('sync-group-info', 'app\cunkebao\controller\workbench\WorkbenchController@syncGroupInfo'); // 同步群最新信息（包括群成员）
        Route::post('modify-group-info', 'app\cunkebao\controller\workbench\WorkbenchController@modifyGroupInfo'); // 修改群名称、群公告
        Route::post('quit-group', 'app\cunkebao\controller\workbench\WorkbenchController@quitGroup'); // 退群（自动建群）
        Route::get('account-list', 'app\cunkebao\controller\workbench\WorkbenchController@getAccountList'); // 获取账号列表
        Route::get('transfer-friends', 'app\cunkebao\controller\workbench\WorkbenchController@getTrafficList'); // 获取账号列表
        Route::get('import-contact', 'app\cunkebao\controller\workbench\WorkbenchController@getImportContact'); // 获取通讯录导入记录列表

        Route::get('getJdSocialMedia', 'app\cunkebao\controller\workbench\WorkbenchController@getJdSocialMedia'); // 获取京东联盟导购媒体
        Route::get('getJdPromotionSite', 'app\cunkebao\controller\workbench\WorkbenchController@getJdPromotionSite'); // 获取京东联盟广告位
        Route::get('changeLink', 'app\cunkebao\controller\workbench\WorkbenchController@changeLink'); // 获取京东联盟广告位
        
        Route::get('group-push-stats', 'app\cunkebao\controller\workbench\WorkbenchController@getGroupPushStats'); // 获取群发统计数据
        Route::get('group-push-history', 'app\cunkebao\controller\workbench\WorkbenchController@getGroupPushHistory'); // 获取推送历史记录列表
        Route::get('common-functions', 'app\cunkebao\controller\workbench\CommonFunctionsController@getList'); // 获取常用功能列表
    });

    // 内容库相关
    Route::group('content/library', function () {
        Route::post('create', 'app\cunkebao\controller\ContentLibraryController@create'); // 创建内容库
        Route::get('list', 'app\cunkebao\controller\ContentLibraryController@getList'); // 获取内容库列表
        Route::post('update', 'app\cunkebao\controller\ContentLibraryController@update'); // 更新内容库
        Route::delete('delete', 'app\cunkebao\controller\ContentLibraryController@delete'); // 删除内容库
        Route::get('detail', 'app\cunkebao\controller\ContentLibraryController@detail'); // 获取内容库详情
        Route::get('collectMoments', 'app\cunkebao\controller\ContentLibraryController@collectMoments'); // 采集朋友圈
        Route::get('item-list', 'app\cunkebao\controller\ContentLibraryController@getItemList'); // 获取内容库素材列表
        Route::post('create-item', 'app\cunkebao\controller\ContentLibraryController@addItem'); // 添加内容库素材
        Route::delete('delete-item', 'app\cunkebao\controller\ContentLibraryController@deleteItem'); // 删除内容库素材
        Route::get('get-item-detail', 'app\cunkebao\controller\ContentLibraryController@getItemDetail'); // 获取内容库素材详情
        Route::post('update-item', 'app\cunkebao\controller\ContentLibraryController@updateItem'); // 更新内容库素材
        Route::any('aiEditContent', 'app\cunkebao\controller\ContentLibraryController@aiEditContent');
        Route::post('import-excel', 'app\cunkebao\controller\ContentLibraryController@importExcel'); // 导入Excel表格（支持图片）
    });

    // 好友相关
    Route::group('friend', function () {
        Route::get('', 'app\cunkebao\controller\friend\GetFriendListV1Controller@index'); // 获取好友列表
        Route::post('transfer', 'app\cunkebao\controller\friend\GetFriendListV1Controller@transfer'); // 好友转移
    });

    //群相关
    Route::group('chatroom', function () {
        Route::get('', 'app\cunkebao\controller\chatroom\GetChatroomListV1Controller@index'); // 获取群列表
        Route::get('getMemberList', 'app\cunkebao\controller\chatroom\GetChatroomListV1Controller@getMemberList'); // 获取群详情
        
    });


    //数据统计相关
     Route::group('dashboard',function (){
        Route::get('', 'app\cunkebao\controller\StatsController@baseInfoStats');
        Route::get('plan-stats', 'app\cunkebao\controller\StatsController@planStats');
        Route::get('sevenDay-stats', 'app\cunkebao\controller\StatsController@customerAcquisitionStats7Days');
        Route::get('today-stats', 'app\cunkebao\controller\StatsController@todayStats');
        Route::get('friendRequestTaskStats', 'app\cunkebao\controller\StatsController@getFriendRequestTaskStats');
        Route::get('userInfoStats', 'app\cunkebao\controller\StatsController@userInfoStats');
     });

    // 算力相关
    Route::group('tokens', function () {
        Route::get('list', 'app\cunkebao\controller\TokensController@getList');
        Route::post('pay', 'app\cunkebao\controller\TokensController@pay'); // 扫码付款
        Route::get('queryOrder', 'app\cunkebao\controller\TokensController@queryOrder'); // 查询订单（扫码付款）
        Route::get('orderList', 'app\cunkebao\controller\TokensController@getOrderList'); // 获取订单列表
        Route::get('statistics', 'app\cunkebao\controller\TokensController@getTokensStatistics'); // 获取算力统计
        Route::post('allocate', 'app\cunkebao\controller\TokensController@allocateTokens'); // 分配token（仅管理员）
    });



    //AI知识库
    Route::group('knowledge', function () {
        Route::get('init', 'app\cunkebao\controller\AiSettingsController@init');
        Route::get('release', 'app\cunkebao\controller\AiSettingsController@release');
        Route::post('savePrompt', 'app\cunkebao\controller\AiSettingsController@savePrompt'); // 保存统一提示词
        Route::get('typeList', 'app\cunkebao\controller\AiKnowledgeBaseController@typeList');
        Route::get('getList', 'app\cunkebao\controller\AiKnowledgeBaseController@getList');
        Route::post('add', 'app\cunkebao\controller\AiKnowledgeBaseController@add');
        //Route::post('edit', 'app\cunkebao\controller\AiKnowledgeBaseController@edit');
        Route::delete('delete', 'app\cunkebao\controller\AiKnowledgeBaseController@delete');
        //Route::get('detail', 'app\cunkebao\controller\AiKnowledgeBaseController@detail');
        Route::post('update', 'app\cunkebao\controller\AiKnowledgeBaseController@update');
        Route::post('delete', 'app\cunkebao\controller\AiKnowledgeBaseController@delete');
        Route::post('addType', 'app\cunkebao\controller\AiKnowledgeBaseController@addType');
        Route::post('editType', 'app\cunkebao\controller\AiKnowledgeBaseController@editType');
        Route::put('updateTypeStatus', 'app\cunkebao\controller\AiKnowledgeBaseController@updateTypeStatus'); // 修改类型状态
        Route::delete('deleteType', 'app\cunkebao\controller\AiKnowledgeBaseController@deleteType');
        Route::get('detailType', 'app\cunkebao\controller\AiKnowledgeBaseController@detailType');
    });

    // 门店端账号管理
    Route::group('store-accounts', function () {
        Route::get('', 'app\cunkebao\controller\StoreAccountController@index'); // 获取账号列表
        Route::post('', 'app\cunkebao\controller\StoreAccountController@create'); // 创建账号
        Route::put('', 'app\cunkebao\controller\StoreAccountController@update'); // 编辑账号
        Route::delete('', 'app\cunkebao\controller\StoreAccountController@delete'); // 删除账号
        Route::post('disable', 'app\cunkebao\controller\StoreAccountController@disable'); // 禁用/启用账号
    });

    // 分销渠道管理
    Route::group('distribution', function () {
        // 渠道列表和统计
        Route::group('channels', function () {
            Route::get('', 'app\cunkebao\controller\distribution\ChannelController@index'); // 获取渠道列表
            Route::get('statistics', 'app\cunkebao\controller\distribution\ChannelController@statistics'); // 获取渠道统计数据
            Route::get('revenue-statistics', 'app\cunkebao\controller\distribution\ChannelController@revenueStatistics'); // 获取渠道收益统计（全局）
            Route::get('revenue-detail', 'app\cunkebao\controller\distribution\ChannelController@revenueDetail'); // 获取渠道收益明细（单个渠道）
        });
        // 单个渠道操作
        Route::group('channel', function () {
            Route::post('', 'app\cunkebao\controller\distribution\ChannelController@create'); // 添加渠道
            Route::put(':id', 'app\cunkebao\controller\distribution\ChannelController@update'); // 编辑渠道
            Route::delete(':id', 'app\cunkebao\controller\distribution\ChannelController@delete'); // 删除渠道
            Route::post(':id/toggle-status', 'app\cunkebao\controller\distribution\ChannelController@toggleStatus'); // 禁用/启用渠道
            Route::post('generate-qrcode', 'app\cunkebao\controller\distribution\ChannelController@generateQrCode'); // 生成渠道注册二维码
            Route::post('generate-login-qrcode', 'app\cunkebao\controller\distribution\ChannelController@generateLoginQrCode'); // 生成渠道登录二维码
        });
        // 提现申请管理
        Route::group('withdrawals', function () {
            Route::get('', 'app\cunkebao\controller\distribution\WithdrawalController@index'); // 获取提现申请列表
            Route::post('', 'app\cunkebao\controller\distribution\WithdrawalController@create'); // 创建提现申请
            Route::get(':id', 'app\cunkebao\controller\distribution\WithdrawalController@detail'); // 获取提现申请详情
            Route::post(':id/review', 'app\cunkebao\controller\distribution\WithdrawalController@review'); // 审核提现申请（通过/拒绝）
            Route::post(':id/mark-paid', 'app\cunkebao\controller\distribution\WithdrawalController@markPaid'); // 标记为已打款
        });
    });



})->middleware(['jwt']);




Route::group('v1/api/scenarios', function () {
    Route::any('', 'app\cunkebao\controller\plan\PostExternalApiV1Controller@index');
});


//小程序
Route::group('v1/frontend', function () {
    Route::group('business/poster', function () {
        Route::post('getone', 'app\cunkebao\controller\plan\PosterWeChatMiniProgram@getPosterTaskData');
        Route::post('decryptphone', 'app\cunkebao\controller\plan\PosterWeChatMiniProgram@getPhoneNumber');
        //Route::post('decryptphones', 'app\cunkebao\controller\plan\PosterWeChatMiniProgram@decryptphones');
    });
    Route::post('business/form/importsave', 'app\cunkebao\controller\plan\PosterWeChatMiniProgram@decryptphones');
    
    // 分销渠道注册（H5扫码）
    Route::group('distribution/channel', function () {
        Route::get('register', 'app\cunkebao\controller\distribution\ChannelController@registerByQrCode'); // H5页面（GET显示表单）
        Route::post('register', 'app\cunkebao\controller\distribution\ChannelController@registerByQrCode'); // 提交渠道信息（POST）
    });
    
    // 分销渠道用户端（无需JWT认证，通过渠道编码访问）
    Route::group('distribution/user', function () {
        Route::post('login', 'app\cunkebao\controller\distribution\ChannelUserController@login'); // 渠道登录
        Route::get('home', 'app\cunkebao\controller\distribution\ChannelUserController@index'); // 获取渠道首页数据
        Route::get('revenue-records', 'app\cunkebao\controller\distribution\ChannelUserController@revenueRecords'); // 获取收益明细列表
        Route::get('withdrawal-records', 'app\cunkebao\controller\distribution\ChannelUserController@withdrawalRecords'); // 获取提现明细列表
        Route::post('change-password', 'app\cunkebao\controller\distribution\ChannelUserController@changePassword'); // 修改密码
    });
});




return [];