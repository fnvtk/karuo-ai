<?php
// +----------------------------------------------------------------------
// | 设备管理模块路由配置
// +----------------------------------------------------------------------

use think\facade\Route;

// 定义RESTful风格的API路由
Route::group('v1/', function () {

    Route::group('kefu/', function () {
        //好友相关
        Route::group('wechatFriend/', function () {
            Route::get('list', 'app\chukebao\controller\WechatFriendController@getList'); // 获取好友列表
            Route::get('detail', 'app\chukebao\controller\WechatFriendController@getDetail'); // 获取好友详情
            Route::post('updateInfo', 'app\chukebao\controller\WechatFriendController@updateFriendInfo'); // 更新好友资料
            // 添加好友任务记录相关接口
            Route::get('addTaskList', 'app\chukebao\controller\WechatFriendController@getAddTaskList'); // 获取添加好友任务记录列表（包含添加者信息、状态、时间等，支持状态筛选，无需传好友ID）
        });
        //群相关
        Route::group('wechatChatroom/', function () {
            Route::get('list', 'app\chukebao\controller\WechatChatroomController@getList'); // 获取好友列表
            Route::get('detail', 'app\chukebao\controller\WechatChatroomController@getDetail'); // 获取群详情
            Route::get('members', 'app\chukebao\controller\WechatChatroomController@getMembers'); // 获取群成员列表
            Route::post('aiAnnouncement', 'app\chukebao\controller\WechatChatroomController@aiAnnouncement'); // AI群公告
        });

        //客服相关
        Route::group('customerService/', function () {
            Route::get('list', 'app\chukebao\controller\CustomerServiceController@getList'); // 获取好友列表
        });

        //账号管理
        Route::group('accounts/', function () {
            Route::get('list', 'app\chukebao\controller\AccountsController@getList'); // 获取账号列表
        });

        //消息相关
        Route::group('message/', function () {
            Route::get('list', 'app\chukebao\controller\MessageController@getList'); // 获取好友列表
            Route::get('readMessage', 'app\chukebao\controller\MessageController@readMessage'); // 读取消息
            Route::get('details', 'app\chukebao\controller\MessageController@details'); // 消息详情
            Route::get('getMessageStatus', 'app\chukebao\controller\MessageController@getMessageStatus'); // 获取单条消息发送状态
        });

        //微信分组
        Route::group('wechatGroup/', function () {
            Route::get('list', 'app\chukebao\controller\WechatGroupController@getList'); // 获取分组列表
            Route::post('add', 'app\chukebao\controller\WechatGroupController@create'); // 新增分组
            Route::post('update', 'app\chukebao\controller\WechatGroupController@update'); // 更新分组
            Route::delete('delete', 'app\chukebao\controller\WechatGroupController@delete'); // 删除分组（假删除）
            Route::post('move', 'app\chukebao\controller\WechatGroupController@move'); // 移动分组（好友/群移动到指定分组）
        });




        //AI相关
        Route::group('ai/', function () {
            //问答
            Route::group('questions/', function () {
                Route::get('list', 'app\chukebao\controller\QuestionsController@getList'); // 问答列表
                Route::post('add', 'app\chukebao\controller\QuestionsController@create'); // 问答添加
                Route::post('update', 'app\chukebao\controller\QuestionsController@update'); // 问答更新
                Route::delete('delete', 'app\chukebao\controller\QuestionsController@delete'); // 问答删除
                Route::get('detail', 'app\chukebao\controller\QuestionsController@detail'); // 问答详情
            });

            //全局配置
            Route::group('settings/', function () {
                Route::get('get', 'app\chukebao\controller\AiSettingsController@getSetting');
                Route::post('set', 'app\chukebao\controller\AiSettingsController@setSetting');
            });

            //好友配置
            Route::group('friend/', function () {
                Route::post('set', 'app\chukebao\controller\AiSettingsController@setFriend');
                Route::get('get', 'app\chukebao\controller\AiSettingsController@getFriend');
                Route::post('setAll', 'app\chukebao\controller\AiSettingsController@setAllFriend');
            });


            //ai对话
            Route::get('getUserTokens', 'app\chukebao\controller\AiSettingsController@getUserTokens');
            Route::post('chat', 'app\chukebao\controller\AiChatController@index');

        });


        //代办事项
        Route::group('todo/', function () {
            Route::get('list', 'app\chukebao\controller\ToDoController@getList');
            Route::post('add', 'app\chukebao\controller\ToDoController@create');
            Route::get('process', 'app\chukebao\controller\ToDoController@process');
        });


        //跟进提醒
        Route::group('followUp/', function () {
            Route::get('list', 'app\chukebao\controller\FollowUpController@getList');
            Route::post('add', 'app\chukebao\controller\FollowUpController@create');
            Route::get('process', 'app\chukebao\controller\FollowUpController@process');
        });


        //算力相关
        Route::group('tokensRecord/', function () {
            Route::get('list', 'app\chukebao\controller\TokensRecordController@getList');
        });



        //内容管理
        Route::group('content/', function () {
            //素材管理
            Route::group('material/', function () {
                Route::get('all', 'app\chukebao\controller\ContentController@getAllMaterial');
                Route::get('list', 'app\chukebao\controller\ContentController@getMaterial');
                Route::post('add', 'app\chukebao\controller\ContentController@createMaterial');
                Route::get('details', 'app\chukebao\controller\ContentController@detailsMaterial');
                Route::delete('del', 'app\chukebao\controller\ContentController@delMaterial');
                Route::post('update', 'app\chukebao\controller\ContentController@updateMaterial');
            });

            //违禁词管理
            Route::group('sensitiveWord/', function () {
                Route::get('list', 'app\chukebao\controller\ContentController@getSensitiveWord');
                Route::post('add', 'app\chukebao\controller\ContentController@createSensitiveWord');
                Route::get('details', 'app\chukebao\controller\ContentController@detailsSensitiveWord');
                Route::delete('del', 'app\chukebao\controller\ContentController@delSensitiveWord');
                Route::post('update', 'app\chukebao\controller\ContentController@updateSensitiveWord');
                Route::get('setStatus', 'app\chukebao\controller\ContentController@setSensitiveWordStatus');
            });


            //关键词管理
            Route::group('keywords/', function () {
                Route::get('list', 'app\chukebao\controller\ContentController@getKeywords');
                Route::post('add', 'app\chukebao\controller\ContentController@createKeywords');
                Route::get('details', 'app\chukebao\controller\ContentController@detailsKeywords');
                Route::delete('del', 'app\chukebao\controller\ContentController@delKeywords');
                Route::post('update', 'app\chukebao\controller\ContentController@updateKeywords');
                Route::get('setStatus', 'app\chukebao\controller\ContentController@setKeywordStatus');
            });
        });


        //自动问候
        Route::group('autoGreetings/', function () {
            Route::get('list', 'app\chukebao\controller\AutoGreetingsController@getList');
            Route::post('add', 'app\chukebao\controller\AutoGreetingsController@create');
            Route::get('details', 'app\chukebao\controller\AutoGreetingsController@details');
            Route::delete('del', 'app\chukebao\controller\AutoGreetingsController@del');
            Route::post('update', 'app\chukebao\controller\AutoGreetingsController@update');
            Route::get('setStatus', 'app\chukebao\controller\AutoGreetingsController@setStatus');
            Route::get('copy', 'app\chukebao\controller\AutoGreetingsController@copy');
            Route::get('stats', 'app\chukebao\controller\AutoGreetingsController@stats');
        });

        //AI智能推送
        Route::group('aiPush/', function () {
            Route::get('list', 'app\chukebao\controller\AiPushController@getList'); // 获取推送列表
            Route::post('add', 'app\chukebao\controller\AiPushController@add'); // 添加推送
            Route::get('details', 'app\chukebao\controller\AiPushController@details'); // 推送详情
            Route::delete('del', 'app\chukebao\controller\AiPushController@del'); // 删除推送
            Route::post('update', 'app\chukebao\controller\AiPushController@update'); // 更新推送
            Route::get('setStatus', 'app\chukebao\controller\AiPushController@setStatus'); // 修改状态
            Route::get('stats', 'app\chukebao\controller\AiPushController@stats'); // 统计概览
        });


        Route::group('notice/', function () {
            Route::get('list', 'app\chukebao\controller\NoticeController@getList');
            Route::put('readMessage', 'app\chukebao\controller\NoticeController@readMessage');
            Route::put('readAll', 'app\chukebao\controller\NoticeController@readAll');
        });

        Route::group('reply/', function () {
            Route::get('list', 'app\chukebao\controller\ReplyController@getList');
            Route::post('addGroup', 'app\chukebao\controller\ReplyController@addGroup');
            Route::post('addReply', 'app\chukebao\controller\ReplyController@addReply');
            Route::post('updateGroup', 'app\chukebao\controller\ReplyController@updateGroup');
            Route::post('updateReply', 'app\chukebao\controller\ReplyController@updateReply');
            Route::delete('deleteGroup', 'app\chukebao\controller\ReplyController@deleteGroup');
            Route::delete('deleteReply', 'app\chukebao\controller\ReplyController@deleteReply');
        });


        Route::group('moments/', function () {
            Route::post('add', 'app\chukebao\controller\MomentsController@create');
            Route::post('update', 'app\chukebao\controller\MomentsController@update');
            Route::delete('delete', 'app\chukebao\controller\MomentsController@delete');
            Route::get('list', 'app\chukebao\controller\MomentsController@getList');
        });


        Route::post('dataProcessing', 'app\chukebao\controller\DataProcessing@index'); // 修改数据

    });


})->middleware(['jwt']);


// 客服登录
Route::group('v1/kefu', function () {
    Route::post('login', 'app\chukebao\controller\LoginController@index'); // 登录
});





return [];