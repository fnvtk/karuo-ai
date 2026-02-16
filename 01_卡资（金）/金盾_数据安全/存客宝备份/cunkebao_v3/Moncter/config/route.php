<?php
/**
 * This file is part of webman.
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the MIT-LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @author    walkor<walkor@workerman.net>
 * @copyright walkor<walkor@workerman.net>
 * @link      http://www.workerman.net/
 * @license   http://www.opensource.org/licenses/mit-license.php MIT License
 */

use Webman\Route;


// 数据库连接测试接口
Route::get('/api/test/db', [app\controller\IndexController::class, 'testDb']);

// ============================================
// 用户相关接口（RESTful）
// ============================================
Route::post('/api/users', [app\controller\UserController::class, 'store']);                    // 创建用户
Route::get('/api/users/{user_id}', [app\controller\UserController::class, 'show']);            // 查询用户
Route::put('/api/users/{user_id}', [app\controller\UserController::class, 'update']);         // 更新用户
Route::delete('/api/users/{user_id}', [app\controller\UserController::class, 'destroy']);     // 删除用户
Route::get('/api/users/{user_id}/decrypt-id-card', [app\controller\UserController::class, 'decryptIdCard']); // 解密身份证
Route::post('/api/users/search', [app\controller\UserController::class, 'search']);            // 搜索用户（复杂查询）

// ============================================
// 用户标签相关接口（RESTful）
// ============================================
Route::get('/api/users/{user_id}/tags', [app\controller\TagController::class, 'listByUser']);           // 查询用户标签
Route::put('/api/users/{user_id}/tags', [app\controller\TagController::class, 'calculate']);          // 更新/计算用户标签
Route::delete('/api/users/{user_id}/tags/{tag_id}', [app\controller\TagController::class, 'destroy']); // 删除用户标签

// ============================================
// 消费记录相关接口
// ============================================
Route::post('/api/consumption/record', [app\controller\ConsumptionController::class, 'store']); // 创建消费记录

// ============================================
// 标签定义相关接口（管理接口）
// ============================================
Route::post('/api/tags/filter', [app\controller\TagController::class, 'filter']);              // 根据标签筛选用户
Route::get('/api/tags/statistics', [app\controller\TagController::class, 'statistics']);       // 获取标签统计信息
Route::get('/api/tags/history', [app\controller\TagController::class, 'history']);             // 获取标签历史记录
Route::post('/api/tag-definitions/batch', [app\controller\TagController::class, 'init']);      // 批量初始化标签定义
Route::get('/api/tag-definitions', [app\controller\TagDefinitionController::class, 'list']);   // 获取标签定义列表
Route::post('/api/tag-definitions', [app\controller\TagDefinitionController::class, 'create']); // 创建标签定义
Route::get('/api/tag-definitions/{tag_id}', [app\controller\TagDefinitionController::class, 'detail']); // 获取标签定义详情
Route::put('/api/tag-definitions/{tag_id}', [app\controller\TagDefinitionController::class, 'update']); // 更新标签定义
Route::delete('/api/tag-definitions/{tag_id}', [app\controller\TagDefinitionController::class, 'delete']); // 删除标签定义

// ============================================
// 标签任务管理接口
// ============================================
Route::post('/api/tag-tasks', [app\controller\TagTaskController::class, 'create']); // 创建标签任务
Route::put('/api/tag-tasks/{task_id}', [app\controller\TagTaskController::class, 'update']); // 更新标签任务
Route::delete('/api/tag-tasks/{task_id}', [app\controller\TagTaskController::class, 'delete']); // 删除标签任务
Route::get('/api/tag-tasks', [app\controller\TagTaskController::class, 'list']); // 标签任务列表
Route::get('/api/tag-tasks/{task_id}', [app\controller\TagTaskController::class, 'detail']); // 标签任务详情
Route::get('/api/tag-tasks/{task_id}/executions', [app\controller\TagTaskController::class, 'executions']); // 获取任务执行记录
Route::post('/api/tag-tasks/{task_id}/start', [app\controller\TagTaskController::class, 'start']); // 启动标签任务
Route::post('/api/tag-tasks/{task_id}/pause', [app\controller\TagTaskController::class, 'pause']); // 暂停标签任务
Route::post('/api/tag-tasks/{task_id}/stop', [app\controller\TagTaskController::class, 'stop']); // 停止标签任务

// ============================================
// 身份合并相关接口（场景4：手机号发现身份证后合并）
// ============================================
Route::post('/api/person-merge/phone-to-id-card', [app\controller\PersonMergeController::class, 'mergePhoneToIdCard']); // 合并手机号到身份证
Route::post('/api/person-merge/temporary-to-formal', [app\controller\PersonMergeController::class, 'mergeTemporaryToFormal']); // 合并临时人到正式人

// ============================================
// 数据库同步相关接口
// ============================================
Route::get('/database-sync/dashboard', [app\controller\DatabaseSyncController::class, 'dashboard']);     // 同步进度看板页面
Route::get('/api/database-sync/progress', [app\controller\DatabaseSyncController::class, 'progress']); // 查询同步进度
Route::get('/api/database-sync/stats', [app\controller\DatabaseSyncController::class, 'stats']);         // 查询同步统计
Route::post('/api/database-sync/reset', [app\controller\DatabaseSyncController::class, 'reset']);         // 重置同步进度
Route::post('/api/database-sync/skip-error', [app\controller\DatabaseSyncController::class, 'skipError']); // 跳过错误数据库

// ============================================
// 数据采集任务管理接口
// ============================================
Route::post('/api/data-collection-tasks', [app\controller\DataCollectionTaskController::class, 'create']); // 创建任务
Route::put('/api/data-collection-tasks/{task_id}', [app\controller\DataCollectionTaskController::class, 'update']); // 更新任务
Route::delete('/api/data-collection-tasks/{task_id}', [app\controller\DataCollectionTaskController::class, 'delete']); // 删除任务
Route::get('/api/data-collection-tasks', [app\controller\DataCollectionTaskController::class, 'list']); // 任务列表
Route::get('/api/data-collection-tasks/data-sources', [app\controller\DataCollectionTaskController::class, 'getDataSources']); // 获取数据源列表
Route::get('/api/data-collection-tasks/{task_id}', [app\controller\DataCollectionTaskController::class, 'detail']); // 任务详情
Route::get('/api/data-collection-tasks/{task_id}/progress', [app\controller\DataCollectionTaskController::class, 'progress']); // 任务进度
Route::post('/api/data-collection-tasks/{task_id}/start', [app\controller\DataCollectionTaskController::class, 'start']); // 启动任务
Route::post('/api/data-collection-tasks/{task_id}/pause', [app\controller\DataCollectionTaskController::class, 'pause']); // 暂停任务
Route::post('/api/data-collection-tasks/{task_id}/stop', [app\controller\DataCollectionTaskController::class, 'stop']); // 停止任务
Route::get('/api/data-collection-tasks/data-sources/{data_source_id}/databases', [app\controller\DataCollectionTaskController::class, 'getDatabases']); // 获取数据库列表
Route::get('/api/data-collection-tasks/data-sources/{data_source_id}/databases/{database}/collections', [app\controller\DataCollectionTaskController::class, 'getCollections']); // 获取集合列表
Route::get('/api/data-collection-tasks/data-sources/{data_source_id}/databases/{database}/collections/{collection}/fields', [app\controller\DataCollectionTaskController::class, 'getFields']); // 获取字段列表
Route::get('/api/data-collection-tasks/handlers/{handler_type}/target-fields', [app\controller\DataCollectionTaskController::class, 'getHandlerTargetFields']); // 获取Handler的目标字段列表
Route::post('/api/data-collection-tasks/preview-query', [app\controller\DataCollectionTaskController::class, 'previewQuery']); // 预览查询结果

// ============================================
// 数据源管理接口
// ============================================
Route::get('/api/data-sources', [app\controller\DataSourceController::class, 'list']); // 获取数据源列表
Route::get('/api/data-sources/{data_source_id}', [app\controller\DataSourceController::class, 'detail']); // 获取数据源详情
Route::post('/api/data-sources', [app\controller\DataSourceController::class, 'create']); // 创建数据源
Route::put('/api/data-sources/{data_source_id}', [app\controller\DataSourceController::class, 'update']); // 更新数据源
Route::delete('/api/data-sources/{data_source_id}', [app\controller\DataSourceController::class, 'delete']); // 删除数据源
Route::post('/api/data-sources/test-connection', [app\controller\DataSourceController::class, 'testConnection']); // 测试数据源连接

// ============================================
// 人群快照相关接口
// ============================================
Route::get('/api/tag-cohorts', [app\controller\TagCohortController::class, 'list']);           // 获取人群快照列表
Route::get('/api/tag-cohorts/{cohort_id}', [app\controller\TagCohortController::class, 'detail']); // 获取人群快照详情
Route::post('/api/tag-cohorts', [app\controller\TagCohortController::class, 'create']);       // 创建人群快照
Route::delete('/api/tag-cohorts/{cohort_id}', [app\controller\TagCohortController::class, 'delete']); // 删除人群快照
Route::post('/api/tag-cohorts/{cohort_id}/export', [app\controller\TagCohortController::class, 'export']); // 导出人群快照