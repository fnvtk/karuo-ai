<?php

use think\facade\Route;

// 定义RESTful风格的API路由
Route::group('v1/ai', function () {

    //openai、chatGPT
    Route::group('openai', function () {
        Route::post('text', 'app\ai\controller\OpenAI@text');
    });


    //豆包ai
    Route::group('doubao', function () {
        Route::post('text', 'app\ai\controller\DouBaoAI@text');      // 文本生成
        Route::post('image', 'app\ai\controller\DouBaoAI@image');    // 图片生成
    });
})->middleware(['jwt']);