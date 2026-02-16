<?php

namespace app\cunkebao\controller\plan;

use app\common\model\PlanScene as PlansSceneModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 获客场景控制器
 */
class GetPlanSceneListV1Controller extends BaseController
{
    /**
     * 获取开启的场景列表
     *
     * @param array $params 查询参数
     * @return array
     */
    protected function getSceneList(array $params = []): array
    {
        try {
            // 构建查询条件
            $where = ['status' => PlansSceneModel::STATUS_ACTIVE];
            
            // 搜索条件
            if (!empty($params['keyword'])) {
                $where[] = ['name', 'like', '%' . $params['keyword'] . '%'];
            }
            
            // 标签筛选
            if (!empty($params['tag'])) {
                $where[] = ['scenarioTags', 'like', '%' . $params['tag'] . '%'];
            }
        
            // 查询数据
            $query = PlansSceneModel::where($where);
            
            // 获取分页数据
            $list = $query->order('sort DESC')->select()->toArray();

            if (empty($list)) {
                return [];
            }

            $sceneIds = array_column($list, 'id');
            $companyId = $this->getUserInfo('companyId');
            $statsMap = $this->buildSceneStats($sceneIds, (int)$companyId);
            
            // 处理数据
            foreach($list as &$val) {
                $val['scenarioTags'] = json_decode($val['scenarioTags'], true) ?: [];
                $sceneStats = $statsMap[$val['id']] ?? ['count' => 0, 'growth' => '0%'];
                $val['count'] = $sceneStats['count'];
                $val['growth'] = $sceneStats['growth'];
            }
            unset($val);
            
            return $list;
            
        } catch (\Exception $e) {
            throw new \Exception('获取场景列表失败：' . $e->getMessage());
        }
    }

    /**
     * 获取场景列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $result = $this->getSceneList($params);
            return ResponseHelper::success($result);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * 获取场景详情
     * 
     * @return \think\response\Json
     */
    public function detail()
    {
        try {
            $id = $this->request->param('id', '');
            if(empty($id)) {
                return ResponseHelper::error('参数缺失');
            }

            $data = PlansSceneModel::where([
                'status' => PlansSceneModel::STATUS_ACTIVE,
                'id' => $id
            ])->find();
            
            if(empty($data)) {
                return ResponseHelper::error('场景不存在');
            }

            $data['scenarioTags'] = json_decode($data['scenarioTags'], true) ?: [];
            $data['count'] = $this->getPlanCount($id);
            $data['growth'] = $this->calculateGrowth($id);
            
            return ResponseHelper::success($data);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), 500);
        }
    }

    /**
     * 获取计划数量
     * 
     * @param int $sceneId 场景ID
     * @return int
     */
    private function getPlanCount(int $sceneId): int
    {
        return Db::name('customer_acquisition_task')
            ->where('sceneId', $sceneId)
            ->where('companyId',$this->getUserInfo('companyId'))
            ->where('deleteTime', 0)
            ->count();
    }

    /**
     * 计算增长率
     * 
     * @param int $sceneId 场景ID
     * @return string
     */
    private function calculateGrowth(int $sceneId): string
    {
        $companyId = $this->getUserInfo('companyId');
        $currentStart = strtotime(date('Y-m-01 00:00:00'));
        $nextMonthStart = strtotime(date('Y-m-01 00:00:00', strtotime('+1 month')));
        $lastMonthStart = strtotime(date('Y-m-01 00:00:00', strtotime('-1 month')));

        $currentMonth = $this->getSceneMonthlyCount($sceneId, $companyId, $currentStart, $nextMonthStart - 1);
        $lastMonth = $this->getSceneMonthlyCount($sceneId, $companyId, $lastMonthStart, $currentStart - 1);

        return $this->formatGrowthPercentage($currentMonth, $lastMonth);
    }

    /**
     * 批量构建场景统计数据
     * @param array $sceneIds
     * @param int $companyId
     * @return array
     */
    private function buildSceneStats(array $sceneIds, int $companyId): array
    {
        if (empty($sceneIds)) {
            return [];
        }

        $totalCounts = $this->getSceneTaskCounts($sceneIds, $companyId);

        $currentStart = strtotime(date('Y-m-01 00:00:00'));
        $nextMonthStart = strtotime(date('Y-m-01 00:00:00', strtotime('+1 month')));
        $lastMonthStart = strtotime(date('Y-m-01 00:00:00', strtotime('-1 month')));

        $currentMonthCounts = $this->getSceneMonthlyCounts($sceneIds, $companyId, $currentStart, $nextMonthStart - 1);
        $lastMonthCounts = $this->getSceneMonthlyCounts($sceneIds, $companyId, $lastMonthStart, $currentStart - 1);

        $stats = [];
        foreach ($sceneIds as $sceneId) {
            $current = $currentMonthCounts[$sceneId] ?? 0;
            $last = $lastMonthCounts[$sceneId] ?? 0;
            $stats[$sceneId] = [
                'count' => $totalCounts[$sceneId] ?? 0,
                'growth' => $this->formatGrowthPercentage($current, $last),
            ];
        }

        return $stats;
    }

    /**
     * 获取场景计划总数
     * @param array $sceneIds
     * @param int $companyId
     * @return array
     */
    private function getSceneTaskCounts(array $sceneIds, int $companyId): array
    {
        if (empty($sceneIds)) {
            return [];
        }


        $where = [
            ['companyId', '=', $companyId],
            ['deleteTime', '=', 0],
            ['sceneId', 'in', $sceneIds],
        ];
        if(!$this->getUserInfo('isAdmin')){
            $where[] = ['userId', '=', $this->getUserInfo('id')];
        }


        $rows = Db::name('customer_acquisition_task')
            ->where($where)
            ->field('sceneId, COUNT(*) as total')
            ->group('sceneId')
            ->select();

        $result = [];
        foreach ($rows as $row) {
            $sceneId = is_array($row) ? ($row['sceneId'] ?? 0) : ($row->sceneId ?? 0);
            if (!$sceneId) {
                continue;
            }
            $result[$sceneId] = (int)(is_array($row) ? ($row['total'] ?? 0) : ($row->total ?? 0));
        }

        return $result;
    }

    /**
     * 获取场景月度数据
     * @param array $sceneIds
     * @param int $companyId
     * @param int $startTime
     * @param int $endTime
     * @return array
     */
    private function getSceneMonthlyCounts(array $sceneIds, int $companyId, int $startTime, int $endTime): array
    {
        if (empty($sceneIds)) {
            return [];
        }

        $rows = Db::name('customer_acquisition_task')
            ->whereIn('sceneId', $sceneIds)
            ->where('companyId', $companyId)
            ->where('status', 1)
            ->where('deleteTime', 0)
            ->whereBetween('createTime', [$startTime, $endTime])
            ->field('sceneId, COUNT(*) as total')
            ->group('sceneId')
            ->select();

        $result = [];
        foreach ($rows as $row) {
            $sceneId = is_array($row) ? ($row['sceneId'] ?? 0) : ($row->sceneId ?? 0);
            if (!$sceneId) {
                continue;
            }
            $result[$sceneId] = (int)(is_array($row) ? ($row['total'] ?? 0) : ($row->total ?? 0));
        }

        return $result;
    }

    /**
     * 获取单个场景的月度数据
     * @param int $sceneId
     * @param int $companyId
     * @param int $startTime
     * @param int $endTime
     * @return int
     */
    private function getSceneMonthlyCount(int $sceneId, int $companyId, int $startTime, int $endTime): int
    {
        return Db::name('customer_acquisition_task')
            ->where('sceneId', $sceneId)
            ->where('companyId', $companyId)
            ->where('status', 1)
            ->where('deleteTime', 0)
            ->whereBetween('createTime', [$startTime, $endTime])
            ->count();
    }

    /**
     * 计算增长百分比
     * @param int $current
     * @param int $last
     * @return string
     */
    private function formatGrowthPercentage(int $current, int $last): string
    {
        if ($last == 0) {
            return $current > 0 ? '100%' : '0%';
        }

        $growth = round(($current - $last) / $last * 100, 2);
        return $growth . '%';
    }
} 