<?php

use think\facade\Route;

// 定义RESTful风格的API路由
Route::group('v1/cozeai', function () {
      // 工作区管理
      Route::get('workspaceList', 'cozeai/WorkspaceController/list');
      Route::get('botsList', 'cozeai/WorkspaceController/getBotsList');

      // 会话管理
      Route::group('conversation', function () {
        Route::get('list', 'cozeai/ConversationController/list');
        Route::get('create', 'cozeai/ConversationController/create');
        Route::post('createChat', 'cozeai/ConversationController/createChat');
        Route::get('chatRetrieve', 'cozeai/ConversationController/chatRetrieve');
        Route::get('chatMessage','cozeai/ConversationController/chatMessage');
    });

    // 消息管理
    Route::group('message', function () {
        Route::get('list', 'cozeai/MessageController/getMessages');
    });
})->middleware(['jwt']);