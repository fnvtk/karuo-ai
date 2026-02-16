<?php

namespace app\cunkebao\controller\wechat;

use app\common\model\Device as DeviceModel;
use app\common\model\Device as DevicesModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\User as UserModel;
use app\common\model\WechatAccount as WechatAccountModel;
// 不再使用WechatFriendShipModel和WechatCustomerModel，改为直接查询s2_wechat_friend和s2_wechat_account_score表
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 微信控制器
 * 
 * 性能优化建议：
 * 1. 为以下字段添加索引以提高查询性能：
 *    - device_wechat_login表: (companyId, wechatId), (deviceId)
 *    - wechat_account表: (wechatId)
 *    - wechat_customer表: (companyId, wechatId)
 *    - wechat_friend_ship表: (ownerWechatId), (createTime)
 *    - s2_wechat_message表: (wechatAccountId, wechatTime)
 * 
 * 2. 考虑创建以下复合索引：
 *    - device_wechat_login表: (companyId, deviceId, wechatId)
 *    - wechat_friend_ship表: (ownerWechatId, createTime)
 */
class GetWechatsOnDevicesV1Controller extends BaseController
{
    /**
     * 主操盘手获取项目下所有设备的id
     *
     * @return array
     * @throws \Exception
     */
    protected function getCompanyDevicesId(): array
    {
        return DevicesModel::where(
            [
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->column('id');
    }

    /**
     * 非主操盘手获取分配的设备
     *
     * @return array
     */
    protected function getUserDevicesId(): array
    {
        return DeviceUserModel::where(
            [
                'userId'    => $this->getUserInfo('id'),
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->column('deviceId');
    }

    /**
     * 根据不同角色，显示的设备数量不同
     *
     * @return array
     * @throws \Exception
     */
    protected function getDevicesId(): array
    {
        return ($this->getUserInfo('isAdmin') == UserModel::ADMIN_STP)
            ? $this->getCompanyDevicesId()  // 主操盘手获取所有的设备
            : $this->getUserDevicesId();    // 非主操盘手获取分配的设备
    }

    /**
     * 获取有登录设备的微信id
     * 优化：使用索引字段，减少数据查询量
     *
     * @return array
     */
    protected function getWechatIdsOnDevices(): array
    {
        // 关联设备id查询，过滤掉已删除的设备
        if (empty($deviceIds = $this->getDevicesId())) {
            throw new \Exception('暂无设备数据', 200);
        }

        // 优化：直接使用DISTINCT减少数据传输量
        return DeviceWechatLoginModel::distinct(true)
            ->where([
                'companyId' => $this->getUserInfo('companyId'),
//                'alive'     => DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE,
            ])
            ->where('deviceId', 'in', $deviceIds)
            ->column('wechatId');
    }

    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        if (empty($wechatIds = $this->getWechatIdsOnDevices())) {
            throw new \Exception('设备尚未有登录微信', 200);
        }

        // 关键词搜索（同时搜索微信号和昵称）
        if (!empty($keyword = $this->request->param('keyword'))) {
            $where[] = ["w.wechatId|w.alias|w.nickname", 'LIKE', '%' . $keyword . '%'];
        }

        $where['w.wechatId'] = array('in', implode(',', $wechatIds));

        return array_merge($where, $params);
    }

    /**
     * 获取在线微信账号列表
     * 优化：减少查询字段，使用索引，优化JOIN条件
     *
     * @param array $where
     * @return \think\Paginator 分页对象
     */
    protected function getOnlineWechatList(array $where): \think\Paginator
    {
        // 获取微信在线状态筛选参数（1=在线，0=离线，不传=全部）
        $wechatStatus = $this->request->param('wechatStatus');
        
        // 优化：只查询必要字段，使用FORCE INDEX提示数据库使用索引
        $query = WechatAccountModel::alias('w')
            ->field(
                [
                    'w.id', 'w.nickname', 'w.avatar', 'w.wechatId',
                    'CASE WHEN w.alias IS NULL OR w.alias = "" THEN w.wechatId ELSE w.alias END AS wechatAccount',
                    'MAX(l.deviceId) as deviceId', 'MAX(l.alive) as alive'  // 使用MAX确保GROUP BY时获取正确的在线状态
                ]
            )
            // 优化：使用INNER JOIN代替LEFT JOIN，并添加索引提示
            ->join('device_wechat_login l', 'w.wechatId = l.wechatId AND l.companyId = '. $this->getUserInfo('companyId'), 'INNER')
            // 添加s2_wechat_account表的LEFT JOIN，用于筛选微信在线状态
            ->join(['s2_wechat_account' => 'sa'], 'w.wechatId = sa.wechatId', 'LEFT')
            ->group('w.wechatId')
            // 优化：在线状态优先排序（alive=1的排在前面），然后按wechatId排序
            // 注意：ORDER BY使用SELECT中定义的别名alive，而不是聚合函数
            ->order('alive desc, w.wechatId desc');
        
        // 根据wechatStatus参数筛选（1=在线，0=离线，不传=全部）
        if ($wechatStatus !== null && $wechatStatus !== '') {
            $wechatStatus = (int)$wechatStatus;
            if ($wechatStatus === 1) {
                // 筛选在线：wechatAlive = 1
                $query->where('sa.wechatAlive', 1);
            } elseif ($wechatStatus === 0) {
                // 筛选离线：wechatAlive = 0 或 NULL
                $query->where(function($query) {
                    $query->where('sa.wechatAlive', 0)
                          ->whereOr('sa.wechatAlive', 'exp', 'IS NULL');
                });
            }
        }

        // 应用查询条件
        foreach ($where as $key => $value) {
            if (is_numeric($key) && is_array($value) && isset($value[0]) && $value[0] === 'exp') {
                $query->whereExp('', $value[1]);
                continue;
            }

            if (is_array($value)) {
                $query->where($key, ...$value);
                continue;
            }

            $query->where($key, $value);
        }

        // 优化：使用简单计数查询
        return $query->paginate(
            $this->request->param('limit/d', 10), 
            false, 
            ['page' => $this->request->param('page/d', 1)]
        );
    }

    /**
     * 构建返回数据
     *
     * @param \think\Paginator $result
     * @return array
     */
    protected function makeResultedSet(\think\Paginator $result): array
    {
        $resultSets = [];
        $items = $result->items();

        if (empty($items)) {
            return $resultSets;
        }

        $wechatIds = array_values(array_unique(array_map(function ($item) {
            return $item->wechatId ?? ($item['wechatId'] ?? '');
        }, $items)));

        $metrics = $this->collectWechatMetrics($wechatIds);

        foreach ($items as $item) {
            $addLimit = $metrics['addLimit'][$item->wechatId] ?? 0;
            $todayAdded = $metrics['todayAdded'][$item->wechatId] ?? 0;
            // 计算今日可添加数量 = 可添加额度 - 今日已添加
            $todayCanAdd = max(0, $addLimit - $todayAdded);
            
            $sections = $item->toArray() + [
                    'times'        => $addLimit,
                    'addedCount'   => $todayAdded,
                    'todayCanAdd'  => $todayCanAdd,  // 今日可添加数量
                    'wechatStatus' => $metrics['wechatStatus'][$item->wechatId] ?? 0,
                    'totalFriend'  => $metrics['totalFriend'][$item->wechatId] ?? 0,
                    'deviceMemo'   => $metrics['deviceMemo'][$item->wechatId] ?? '',
                    'activeTime'   => $metrics['activeTime'][$item->wechatId] ?? '-',
                ];

            array_push($resultSets, $sections);
        }

        return $resultSets;
    }

    /**
     * 批量收集微信账号的统计信息
     * 优化：合并查询，减少数据库访问次数，使用缓存
     * 
     * @param array $wechatIds
     * @return array
     */
    protected function collectWechatMetrics(array $wechatIds): array
    {
        $metrics = [
            'addLimit' => [],
            'todayAdded' => [],
            'totalFriend' => [],
            'wechatStatus' => [],
            'deviceMemo' => [],
            'activeTime' => [],
        ];

        if (empty($wechatIds)) {
            return $metrics;
        }

        $companyId = $this->getUserInfo('companyId');
        
        // 使用缓存键，避免短时间内重复查询
        $cacheKey = 'wechat_metrics_' . md5(implode(',', $wechatIds) . '_' . $companyId);
        
        // 尝试从缓存获取数据（缓存5分钟）
        $cachedMetrics = cache($cacheKey);
        if ($cachedMetrics) {
            return $cachedMetrics;
        }
        
        // 优化1：可添加好友额度 - 从s2_wechat_account_score表获取maxAddFriendPerDay
        $scoreRows = Db::table('s2_wechat_account_score')
            ->whereIn('wechatId', $wechatIds)
            ->column('maxAddFriendPerDay', 'wechatId');
        foreach ($scoreRows as $wechatId => $maxAddFriendPerDay) {
            $metrics['addLimit'][$wechatId] = (int)($maxAddFriendPerDay ?? 0);
        }

        // 优化2：今日新增好友 - 使用索引字段和预计算
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = strtotime(date('Y-m-d 23:59:59'));
        
        // 使用单次查询获取所有wechatIds的今日新增和总好友数
        // 根据数据库结构使用s2_wechat_friend表而不是wechat_friend_ship
        $friendshipStats = Db::query("
            SELECT 
                ownerWechatId,
                SUM(IF(createTime BETWEEN {$start} AND {$end}, 1, 0)) as today_added,
                COUNT(*) as total_friend
            FROM 
                s2_wechat_friend
            WHERE 
                ownerWechatId IN ('" . implode("','", $wechatIds) . "')
                AND isDeleted = 0
            GROUP BY 
                ownerWechatId
        ");
        
        // 处理结果
        foreach ($friendshipStats as $row) {
            $wechatId = $row['ownerWechatId'] ?? '';
            if ($wechatId) {
                $metrics['todayAdded'][$wechatId] = (int)($row['today_added'] ?? 0);
                $metrics['totalFriend'][$wechatId] = (int)($row['total_friend'] ?? 0);
            }
        }

        // 优化3：微信在线状态 - 从s2_wechat_account表获取wechatAlive
        $wechatAccountRows = Db::table('s2_wechat_account')
            ->whereIn('wechatId', $wechatIds)
            ->field('wechatId, wechatAlive')
            ->select();
            
        foreach ($wechatAccountRows as $row) {
            $wechatId = $row['wechatId'] ?? '';
            if (!empty($wechatId)) {
                $metrics['wechatStatus'][$wechatId] = (int)($row['wechatAlive'] ?? 0);
            }
        }

        // 优化4：设备状态与备注 - 使用INNER JOIN和索引
        $loginRows = Db::name('device_wechat_login')
            ->alias('l')
            ->join('device d', 'd.id = l.deviceId', 'LEFT')
            ->field('l.wechatId, l.alive, d.memo')
            ->where('l.companyId', $companyId)
            ->whereIn('l.wechatId', $wechatIds)
            ->order('l.id', 'desc')
            ->select();
            
        // 使用临时数组避免重复处理
        $processedWechatIds = [];
        foreach ($loginRows as $row) {
            $wechatId = $row['wechatId'] ?? '';
            // 只处理每个wechatId的第一条记录（最新的）
            if (!empty($wechatId) && !in_array($wechatId, $processedWechatIds)) {
                // 如果s2_wechat_account表中没有wechatAlive，则使用device_wechat_login的alive作为备用
                if (!isset($metrics['wechatStatus'][$wechatId])) {
                    $metrics['wechatStatus'][$wechatId] = (int)($row['alive'] ?? 0);
                }
                $metrics['deviceMemo'][$wechatId] = $row['memo'] ?? '';
                $processedWechatIds[] = $wechatId;
            }
        }

        // 优化5：活跃时间 - 使用JOIN减少查询次数
        $activeTimeResults = Db::query("
            SELECT 
                a.wechatId,
                MAX(m.wechatTime) as lastTime
            FROM 
                s2_wechat_account a
            LEFT JOIN 
                s2_wechat_message m ON a.id = m.wechatAccountId
            WHERE 
                a.wechatId IN ('" . implode("','", $wechatIds) . "')
            GROUP BY 
                a.wechatId
        ");
        
        foreach ($activeTimeResults as $row) {
            $wechatId = $row['wechatId'] ?? '';
            $lastTime = (int)($row['lastTime'] ?? 0);
            if (!empty($wechatId) && $lastTime > 0) {
                $metrics['activeTime'][$wechatId] = date('Y-m-d H:i:s', $lastTime);
            } else {
                $metrics['activeTime'][$wechatId] = '-';
            }
        }
        
        // 确保所有wechatId都有wechatStatus值（默认0）
        foreach ($wechatIds as $wechatId) {
            if (!isset($metrics['wechatStatus'][$wechatId])) {
                $metrics['wechatStatus'][$wechatId] = 0;
            }
        }
        
        // 存入缓存，有效期5分钟
        cache($cacheKey, $metrics, 300);

        return $metrics;
    }

    /**
     * 获取在线微信账号列表
     * 优化：添加缓存，优化分页逻辑
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 获取分页参数
            $page = $this->request->param('page/d', 1);
            $limit = $this->request->param('limit/d', 10);
            $keyword = $this->request->param('keyword');
            $wechatStatus = $this->request->param('wechatStatus');
            
            // 创建缓存键（基于用户、分页、搜索条件和在线状态筛选）
            $cacheKey = 'wechat_list_' . $this->getUserInfo('id') . '_' . $page . '_' . $limit . '_' . md5($keyword ?? '') . '_' . ($wechatStatus ?? 'all');
            
            // 尝试从缓存获取数据（缓存2分钟）
            $cachedData = cache($cacheKey);
            if ($cachedData) {
                return ResponseHelper::success($cachedData);
            }
            
            // 如果没有缓存，执行查询
            $result = $this->getOnlineWechatList(
                $this->makeWhere()
            );
            
            $responseData = [
                'list'  => $this->makeResultedSet($result),
                'total' => $result->total(),
            ];
            
            // 存入缓存，有效期2分钟
            cache($cacheKey, $responseData, 120);

            return ResponseHelper::success($responseData);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
}