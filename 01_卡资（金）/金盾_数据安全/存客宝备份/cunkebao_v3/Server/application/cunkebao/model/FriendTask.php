<?php
namespace app\cunkebao\model;

use think\Model;

/**
 * 添加好友任务记录模型
 */
class FriendTask extends Model
{
    /**
     * 数据表名
     * @var string
     */
    protected $table = 'tk_friend_task';

    /**
     * 状态常量
     */
    const STATUS_PENDING = 1;    // 待处理
    const STATUS_PROCESSING = 2; // 处理中
    const STATUS_APPROVED = 3;   // 已通过
    const STATUS_REJECTED = 4;   // 已拒绝
    const STATUS_EXPIRED = 5;    // 已过期
    const STATUS_CANCELLED = 6;  // 已取消

    /**
     * 获取状态文本
     * @param int $status 状态码
     * @return string 状态文本
     */
    public static function getStatusText($status)
    {
        $statusMap = [
            self::STATUS_PENDING => '待处理',
            self::STATUS_PROCESSING => '处理中',
            self::STATUS_APPROVED => '已通过',
            self::STATUS_REJECTED => '已拒绝',
            self::STATUS_EXPIRED => '已过期',
            self::STATUS_CANCELLED => '已取消'
        ];
        
        return isset($statusMap[$status]) ? $statusMap[$status] : '未知状态';
    }

    /**
     * 获取好友任务列表
     * @param array $where 查询条件
     * @param string $order 排序条件
     * @param int $page 页码
     * @param int $limit 每页数量
     * @return \think\Paginator
     */
    public static function getTaskList($where = [], $order = 'createTime desc', $page = 1, $limit = 10)
    {
        return self::where($where)
                ->order($order)
                ->paginate($limit, false, ['page' => $page]);
    }

    /**
     * 获取任务详情
     * @param int $id 任务ID
     * @return array|null
     */
    public static function getTaskDetail($id)
    {
        return self::where('id', $id)->find();
    }

    /**
     * 创建好友任务
     * @param array $data 任务数据
     * @return int|bool 任务ID或false
     */
    public static function createTask($data)
    {
        // 确保必填字段存在
        if (!isset($data['id'])) {
            return false;
        }
        
        // 设置默认值
        if (!isset($data['status'])) {
            $data['status'] = self::STATUS_PENDING;
        }
        
        // 设置创建时间
        $data['createTime'] = time();
        $data['updateTime'] = time();
        
        // 创建任务
        $task = new self;
        $task->allowField(true)->save($data);
        
        return $task->id;
    }
    
    /**
     * 更新任务信息
     * @param int $id 任务ID
     * @param array $data 更新数据
     * @return bool
     */
    public static function updateTask($id, $data)
    {
        // 更新时间
        $data['updateTime'] = time();
        
        return self::where('id', $id)->update($data);
    }
    
    /**
     * 更新任务状态
     * @param int $id 任务ID
     * @param int $status 新状态
     * @param string $remark 备注
     * @return bool
     */
    public static function updateTaskStatus($id, $status, $remark = '')
    {
        $data = [
            'status' => $status,
            'updateTime' => time()
        ];
        
        if (!empty($remark)) {
            $data['remark'] = $remark;
        }
        
        return self::where('id', $id)->update($data);
    }
    
    /**
     * 取消任务
     * @param int $id 任务ID
     * @param string $remark 取消原因
     * @return bool
     */
    public static function cancelTask($id, $remark = '')
    {
        return self::updateTaskStatus($id, self::STATUS_CANCELLED, $remark);
    }
    
    /**
     * 任务审批通过
     * @param int $id 任务ID
     * @param string $remark 备注信息
     * @return bool
     */
    public static function approveTask($id, $remark = '')
    {
        return self::updateTaskStatus($id, self::STATUS_APPROVED, $remark);
    }
    
    /**
     * 任务拒绝
     * @param int $id 任务ID
     * @param string $remark 拒绝原因
     * @return bool
     */
    public static function rejectTask($id, $remark = '')
    {
        return self::updateTaskStatus($id, self::STATUS_REJECTED, $remark);
    }
    
    /**
     * 根据微信账号ID获取任务列表
     * @param int $wechatAccountId 微信账号ID
     * @param array $status 状态数组，默认查询所有状态
     * @param int $page 页码
     * @param int $limit 每页数量
     * @return \think\Paginator
     */
    public static function getTasksByWechatAccount($wechatAccountId, $status = [], $page = 1, $limit = 10)
    {
        $where = ['wechatAccountId' => $wechatAccountId];
        
        if (!empty($status)) {
            $where['status'] = ['in', $status];
        }
        
        return self::getTaskList($where, 'createTime desc', $page, $limit);
    }
    
    /**
     * 根据操作账号ID获取任务列表
     * @param int $operatorAccountId 操作账号ID
     * @param array $status 状态数组，默认查询所有状态
     * @param int $page 页码
     * @param int $limit 每页数量
     * @return \think\Paginator
     */
    public static function getTasksByOperator($operatorAccountId, $status = [], $page = 1, $limit = 10)
    {
        $where = ['operatorAccountId' => $operatorAccountId];
        
        if (!empty($status)) {
            $where['status'] = ['in', $status];
        }
        
        return self::getTaskList($where, 'createTime desc', $page, $limit);
    }
    
    /**
     * 根据手机号/微信号查询任务
     * @param string $phone 手机号/微信号
     * @param int $tenantId 租户ID
     * @return array
     */
    public static function getTasksByPhone($phone, $tenantId = null)
    {
        $where = ['phone' => $phone];
        
        if ($tenantId !== null) {
            $where['tenantId'] = $tenantId;
        }
        
        return self::where($where)->select();
    }
    
    /**
     * 获取统计数据
     * @param int $tenantId 租户ID
     * @param int $timeRange 时间范围（秒）
     * @return array
     */
    public static function getTaskStats($tenantId = null, $timeRange = 86400)
    {
        $where = [];
        
        if ($tenantId !== null) {
            $where['tenantId'] = $tenantId;
        }
        
        // 时间范围
        $startTime = time() - $timeRange;
        $where['createTime'] = ['>=', $startTime];
        
        // 获取各状态的任务数量
        $stats = [
            'total' => self::where($where)->count(),
            'pending' => self::where(array_merge($where, ['status' => self::STATUS_PENDING]))->count(),
            'processing' => self::where(array_merge($where, ['status' => self::STATUS_PROCESSING]))->count(),
            'approved' => self::where(array_merge($where, ['status' => self::STATUS_APPROVED]))->count(),
            'rejected' => self::where(array_merge($where, ['status' => self::STATUS_REJECTED]))->count(),
            'expired' => self::where(array_merge($where, ['status' => self::STATUS_EXPIRED]))->count(),
            'cancelled' => self::where(array_merge($where, ['status' => self::STATUS_CANCELLED]))->count()
        ];
        
        return $stats;
    }
    
    /**
     * 任务处理结果统计
     * @param int $tenantId 租户ID
     * @param int $timeRange 时间范围（秒）
     * @return array
     */
    public static function getTaskResultStats($tenantId = null, $timeRange = 86400 * 30)
    {
        $where = [];
        
        if ($tenantId !== null) {
            $where['tenantId'] = $tenantId;
        }
        
        // 时间范围
        $startTime = time() - $timeRange;
        $where['createTime'] = ['>=', $startTime];
        
        // 获取处理结果数据
        $stats = [
            'total' => self::where($where)->count(),
            'approved' => self::where(array_merge($where, ['status' => self::STATUS_APPROVED]))->count(),
            'rejected' => self::where(array_merge($where, ['status' => self::STATUS_REJECTED]))->count(),
            'pending' => self::where(array_merge($where, ['status' => ['in', [self::STATUS_PENDING, self::STATUS_PROCESSING]]]))->count(),
            'other' => self::where(array_merge($where, ['status' => ['in', [self::STATUS_EXPIRED, self::STATUS_CANCELLED]]]))->count()
        ];
        
        // 计算成功率
        $stats['approvalRate'] = $stats['total'] > 0 ? round($stats['approved'] / $stats['total'] * 100, 2) : 0;
        
        return $stats;
    }
} 