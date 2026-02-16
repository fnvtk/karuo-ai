<?php
namespace app\cunkebao\controller;

use app\cunkebao\model\PlanTask;
use app\cunkebao\model\PlanExecution;
use think\Controller;
use think\facade\Log;
use think\Request;

/**
 * 计划任务控制器
 */
class Task extends Controller
{
    /**
     * 初始化
     */
    protected function initialize()
    {
        parent::initialize();
    }
    
    /**
     * 获取任务列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $page = Request::param('page', 1, 'intval');
        $limit = Request::param('limit', 10, 'intval');
        $keyword = Request::param('keyword', '');
        $status = Request::param('status', '', 'trim');
        
        // 构建查询条件
        $where = [];
        if (!empty($keyword)) {
            $where[] = ['name', 'like', "%{$keyword}%"];
        }
        
        if ($status !== '') {
            $where[] = ['status', '=', intval($status)];
        }
        
        // 查询列表
        $result = PlanTask::getTaskList($where, 'id desc', $page, $limit);
        
        // 查询场景和设备信息
        foreach ($result['list'] as &$task) {
            $task['scene'] = $task->scene ? $task->scene->toArray() : null;
            $task['device'] = $task->device ? $task->device->toArray() : null;
        }
        
        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $result
        ]);
    }
    
    /**
     * 获取任务详情
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function read($id)
    {
        $task = PlanTask::get($id, ['scene', 'device']);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        // 获取执行记录
        $executions = PlanExecution::where('plan_id', $id)
            ->order('createTime DESC')
            ->select();
        
        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'task' => $task,
                'executions' => $executions
            ]
        ]);
    }
    
    /**
     * 创建任务
     *
     * @return \think\response\Json
     */
    public function save()
    {
        $data = Request::post();
        
        // 数据验证
        $validate = validate('app\cunkebao\validate\Task');
        if (!$validate->check($data)) {
            return json([
                'code' => 400,
                'msg' => $validate->getError()
            ]);
        }
        
        // 添加任务
        $task = new PlanTask;
        $task->save([
            'name' => $data['name'],
            'device_id' => $data['device_id'] ?? null,
            'scene_id' => $data['scene_id'] ?? null,
            'scene_config' => $data['scene_config'] ?? [],
            'status' => $data['status'] ?? 0,
            'current_step' => 0,
            'priority' => $data['priority'] ?? 5,
            'created_by' => $data['created_by'] ?? 0
        ]);
        
        return json([
            'code' => 200,
            'msg' => '创建成功',
            'data' => $task->id
        ]);
    }
    
    /**
     * 更新任务
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function update($id)
    {
        $data = Request::put();
        
        // 检查任务是否存在
        $task = PlanTask::get($id);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        // 准备更新数据
        $updateData = [];
        
        // 只允许更新特定字段
        $allowedFields = ['name', 'device_id', 'scene_id', 'scene_config', 'status', 'priority'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        // 更新任务
        $task->save($updateData);
        
        return json([
            'code' => 200,
            'msg' => '更新成功'
        ]);
    }
    
    /**
     * 删除任务
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function delete($id)
    {
        // 检查任务是否存在
        $task = PlanTask::get($id);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        // 软删除任务
        $task->delete();
        
        return json([
            'code' => 200,
            'msg' => '删除成功'
        ]);
    }
    
    /**
     * 启动任务
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function start($id)
    {
        // 检查任务是否存在
        $task = PlanTask::get($id);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        // 更新状态为启用
        $task->save([
            'status' => 1,
            'current_step' => 0
        ]);
        
        return json([
            'code' => 200,
            'msg' => '任务已启动'
        ]);
    }
    
    /**
     * 停止任务
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function stop($id)
    {
        // 检查任务是否存在
        $task = PlanTask::get($id);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        // 更新状态为停用
        $task->save([
            'status' => 0
        ]);
        
        return json([
            'code' => 200,
            'msg' => '任务已停止'
        ]);
    }
    
    /**
     * 执行定时任务（供外部调用）
     * 
     * @return \think\response\Json
     */
    public function cron()
    {
        // 获取密钥
        $key = Request::param('key', '');
        
        // 验证密钥（实际生产环境应当使用更安全的验证方式）
        if ($key !== config('task.cron_key')) {
            return json([
                'code' => 403,
                'msg' => '访问密钥无效'
            ]);
        }
        
        try {
            // 获取待执行的任务
            $tasks = PlanTask::getPendingTasks(5);
            if ($tasks->isEmpty()) {
                return json([
                    'code' => 200,
                    'msg' => '没有需要执行的任务',
                    'data' => []
                ]);
            }
            
            $results = [];
            
            // 逐一执行任务
            foreach ($tasks as $task) {
                $runner = new TaskRunner($task);
                $result = $runner->run();
                
                $results[] = [
                    'task_id' => $task->id,
                    'name' => $task->name,
                    'result' => $result
                ];
                
                // 记录执行信息
                Log::info('任务执行', [
                    'task_id' => $task->id,
                    'name' => $task->name,
                    'result' => $result
                ]);
            }
            
            return json([
                'code' => 200,
                'msg' => '任务执行完成',
                'data' => $results
            ]);
            
        } catch (\Exception $e) {
            Log::error('任务执行异常', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return json([
                'code' => 500,
                'msg' => '任务执行异常：' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * 手动执行任务
     * 
     * @param int $id
     * @return \think\response\Json
     */
    public function execute($id)
    {
        // 检查任务是否存在
        $task = PlanTask::get($id);
        if (!$task) {
            return json([
                'code' => 404,
                'msg' => '任务不存在'
            ]);
        }
        
        try {
            // 执行任务
            $runner = new TaskRunner($task);
            $result = $runner->run();
            
            // 记录执行信息
            Log::info('手动执行任务', [
                'task_id' => $task->id,
                'name' => $task->name,
                'result' => $result
            ]);
            
            return json([
                'code' => 200,
                'msg' => '任务执行完成',
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('手动执行任务异常', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return json([
                'code' => 500,
                'msg' => '任务执行异常：' . $e->getMessage()
            ]);
        }
    }
} 