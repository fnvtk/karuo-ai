<?php

use think\facade\Route;

// 超级管理员认证相关路由（不需要鉴权）
Route::post('auth/login', 'app\superadmin\controller\auth\AuthLoginController@index');

// 需要登录认证的路由组
Route::group('', function () {
    // 仪表盘概述
    Route::group('dashboard', function () {
        Route::get('base', 'app\superadmin\controller\dashboard\GetBasestatisticsController@index');
    });

    // 菜单管理相关路由
    Route::group('menu', function () {
        Route::get('tree', 'app\superadmin\controller\Menu\GetMenuTreeController@index');
        Route::get('toplevel', 'app\superadmin\controller\Menu\GetTopLevelForPermissionController@index');
    });

    // 管理员相关路由
    Route::group('administrator', function () {
        Route::get('list', 'app\superadmin\controller\administrator\GetAdministratorListController@index');
        Route::get('detail/:id', 'app\superadmin\controller\administrator\GetAdministratorDetailController@index');
        Route::post('update', 'app\superadmin\controller\administrator\UpdateAdministratorController@index');
        Route::post('add', 'app\superadmin\controller\administrator\AddAdministratorController@index');
        Route::post('delete', 'app\superadmin\controller\administrator\DeleteAdministratorController@index');
    });

    // 客户池管理路由
    Route::group('trafficPool', function () {
        Route::get('list', 'app\superadmin\controller\traffic\GetPoolListController@index');
        Route::get('detail', 'app\superadmin\controller\traffic\GetPoolDetailController@index');
    });

    // 设备管理吗
    Route::group('devices', function () {
        Route::get('add-results', 'app\superadmin\controller\devices\GetAddResultedDevicesController@index');
    });

    // 公司路由
    Route::group('company', function () {
        Route::post('add', 'app\superadmin\controller\company\CreateCompanyController@index');
        Route::post('update', 'app\superadmin\controller\company\UpdateCompanyController@index');
        Route::post('delete', 'app\superadmin\controller\company\DeleteCompanyController@index');
        Route::get('list', 'app\superadmin\controller\company\GetCompanyListController@index');
        Route::get('detail/:id', 'app\superadmin\controller\company\GetCompanyDetailForUpdateController@index');
        Route::get('profile/:id', 'app\superadmin\controller\company\GetCompanyDetailForProfileController@index');
        Route::get('devices', 'app\superadmin\controller\company\GetCompanyDevicesForProfileController@index');
        Route::get('subusers', 'app\superadmin\controller\company\GetCompanySubusersForProfileController@index');
    });
})->middleware(['app\superadmin\middleware\AdminAuth']);