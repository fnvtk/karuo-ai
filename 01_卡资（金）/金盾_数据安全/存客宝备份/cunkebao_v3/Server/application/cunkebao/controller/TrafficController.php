<?php

namespace app\cunkebao\controller;

use app\common\model\TrafficSourcePackage;
use app\common\model\TrafficSourcePackageItem;
use library\ResponseHelper;
use think\Db;
use app\cunkebao\controller\RFMController;

class TrafficController extends BaseController
{

    /**
     * 流量池包
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getPackage()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');

        $companyId = $this->getUserInfo('companyId');
        $package = Db::name('traffic_source_package')->alias('tsp')
            ->join('traffic_source_package_item tspi', 'tspi.packageId=tsp.id', 'left')
            ->whereIn('tsp.companyId', [$companyId, 0])
            ->field('tsp.id,tsp.name,tsp.description,tsp.pic,tsp.isSys as type,tsp.createTime,count(tspi.id) as num')
            ->group('tsp.id');

        if (!empty($keyword)) {
            $package->where('tsp.name|tsp.description', 'like', '%' . $keyword . '%');
        }

        $list = $package->page($page, $limit)->order('isSys ASC,id DESC')->select();
        $total = $package->count();

        // 添加"所有好友"特殊流量池（ID为0）
        $allFriendsPackage = [
            'id' => 0,
            'name' => '所有好友',
            'description' => '展示公司下所有设备的好友',
            'pic' => '',
            'type' => 1, // 系统类型
            'createTime' => '',
            'num' => 0, // 数量将在下面计算
        ];

        // 计算所有好友数量
        try {
            $companyId = $this->getUserInfo('companyId');
            $wechatIds = Db::name('device')->alias('d')
                ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
                ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
                ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
                ->column('dwl.wechatId');
            
            if (!empty($wechatIds)) {
                $allFriendsCount = Db::table('s2_wechat_friend')
                    ->where('ownerWechatId', 'in', $wechatIds)
                    ->where('isDeleted', 0)
                    ->count();
                $allFriendsPackage['num'] = $allFriendsCount;
            }
        } catch (\Exception $e) {
            // 如果查询失败，保持num为0
        }

        // 将"所有好友"添加到列表最前面
        array_unshift($list, $allFriendsPackage);
        $total = $total + 1; // 总数加1

        $rfmRule = 'default';
        foreach ($list as $k => &$v) {
            if ($v['type'] != 1) {
                $v['createTime'] = !empty($v['createTime']) ? formatRelativeTime($v['createTime']) : '';
            } else {
                $v['createTime'] = '';
            }

            // RFM 评分（示例：以创建时间近似最近活跃，num 近似频次；金额若无则为 0）
            $recencyDays = isset($v['createTime']) && is_numeric($v['createTime']) ? floor((time() - (int)$v['createTime']) / 86400) : null;
            // 如果上方被格式化为文本，则尝试从原始结果集取原值
            if (!is_numeric($recencyDays) || $recencyDays === null) {
                $rawCreate = isset($list[$k]['createTime']) ? $list[$k]['createTime'] : null;
                $recencyDays = is_numeric($rawCreate) ? floor((time() - (int)$rawCreate) / 86400) : 9999;
            }
            $frequency = (int)($v['num'] ?? 0);
            $monetary = (float)($v['monetary'] ?? 0);

            $scores = RFMController::calcRfmScores($recencyDays, $frequency, $monetary);
            $v['R'] = $scores['R'];
            $v['F'] = $scores['F'];
            $v['M'] = $scores['M'];
            $v['RFM'] = $scores['R'] + $scores['F'] + $scores['M'];
        }
        unset($v);

        $data = [
            'total' => $total,
            'list' => $list,
        ];

        return ResponseHelper::success($data);
    }

    /**
     * 添加流量池
     * @return \think\response\Json
     * @throws \Exception
     */
    public function addPackage()
    {
        $packageName = $this->request->param('packageName', '');
        $description = $this->request->param('description', '');
        $pic = $this->request->param('pic', '');
        $companyId = $this->getUserInfo('companyId');
        $userId = $this->getUserInfo('id');

        if (empty($packageName)) {
            return ResponseHelper::error('流量池名称不能为空');
        }

        $package = TrafficSourcePackage::where(['isDel' => 0, 'name' => $packageName])
            ->whereIn('companyId', [$companyId, 0])
            ->field('id,name')
            ->find();
        if (!empty($package)) {
            return ResponseHelper::error('该流量池名称已存在');
        }
        $packageId = TrafficSourcePackage::insertGetId([
            'userId' => $userId,
            'companyId' => $companyId,
            'name' => $packageName,
            'description' => $description,
            'pic' => $pic,
            'matchingRules' => json_encode([]),
            'createTime' => time(),
            'isDel' => 0,
        ]);

        if (!empty($packageId)) {
            return ResponseHelper::success($packageId, '该流量添加成功');
        } else {
            return ResponseHelper::error('该流量添加失败');
        }
    }

    /**
     * 编辑流量池
     * @return \think\response\Json
     * @throws \Exception
     */
    public function editPackage()
    {
        $packageId = $this->request->param('packageId', '');
        $packageName = $this->request->param('packageName', '');
        $description = $this->request->param('description', '');
        $pic = $this->request->param('pic', '');
        $companyId = $this->getUserInfo('companyId');
        $userId = $this->getUserInfo('id');

        if (empty($packageId)) {
            return ResponseHelper::error('流量池ID不能为空');
        }

        // 禁止编辑"所有好友"特殊流量池
        if ($packageId === '0' || $packageId === 0) {
            return ResponseHelper::error('"所有好友"流量池不允许编辑');
        }

        if (empty($packageName)) {
            return ResponseHelper::error('流量池名称不能为空');
        }

        // 检查流量池是否存在且属于当前公司
        $package = TrafficSourcePackage::where(['id' => $packageId, 'isDel' => 0])
            ->whereIn('companyId', [$companyId, 0])
            ->find();
        if (empty($package)) {
            return ResponseHelper::error('流量池不存在或已删除');
        }

        // 检查系统流量池是否可编辑
        if ($package['isSys'] == 1) {
            return ResponseHelper::error('系统流量池不允许编辑');
        }

        // 检查名称是否重复（排除当前记录）
        $existPackage = TrafficSourcePackage::where(['isDel' => 0, 'name' => $packageName])
            ->whereIn('companyId', [$companyId, 0])
            ->where('id', '<>', $packageId)
            ->field('id,name')
            ->find();
        if (!empty($existPackage)) {
            return ResponseHelper::error('该流量池名称已存在');
        }

        // 更新流量池信息
        $updateData = [
            'name' => $packageName,
            'updateTime' => time(),
        ];

        // 更新描述字段（允许为空）
        $updateData['description'] = $description;

        // 更新图片字段（允许为空）
        $updateData['pic'] = $pic;

        $result = TrafficSourcePackage::where('id', $packageId)->update($updateData);

        if ($result !== false) {
            return ResponseHelper::success($packageId, '流量池编辑成功');
        } else {
            return ResponseHelper::error('流量池编辑失败');
        }
    }

    /**
     * 删除流量池（假删除）
     * @return \think\response\Json
     * @throws \Exception
     */
    public function deletePackage()
    {
        $packageId = $this->request->param('packageId', '');
        $companyId = $this->getUserInfo('companyId');

        if (empty($packageId)) {
            return ResponseHelper::error('流量池ID不能为空');
        }

        // 禁止删除"所有好友"特殊流量池
        if ($packageId === '0' || $packageId === 0) {
            return ResponseHelper::error('"所有好友"流量池不允许删除');
        }

        // 检查流量池是否存在且属于当前公司
        $package = TrafficSourcePackage::where(['id' => $packageId, 'isDel' => 0])
            ->whereIn('companyId', [$companyId, 0])
            ->find();
        if (empty($package)) {
            return ResponseHelper::error('流量池不存在或已删除');
        }

        // 检查系统流量池是否可删除
        if ($package['isSys'] == 1) {
            return ResponseHelper::error('系统流量池不允许删除');
        }

        // 开启事务
        Db::startTrans();
        try {
            // 执行流量池假删除
            $result = TrafficSourcePackage::where('id', $packageId)->update([
                'isDel' => 1,
                'deleteTime' => time()
            ]);

            if ($result === false) {
                throw new \Exception('流量池删除失败');
            }

            // 删除流量池内容（TrafficSourcePackageItem）假删除
            $itemResult = TrafficSourcePackageItem::where([
                'packageId' => $packageId,
                'companyId' => $companyId,
                'isDel' => 0
            ])->update([
                'isDel' => 1,
                'deleteTime' => time()
            ]);

            // 提交事务
            Db::commit();
            
            return ResponseHelper::success($packageId, '流量池及内容删除成功');
            
        } catch (\Exception $e) {
            // 回滚事务
            Db::rollback();
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }


    /**
     * 获取流量池详情
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getPackageDetail()
    {
        $packageId = $this->request->param('packageId', '');
        $companyId = $this->getUserInfo('companyId');

        if (empty($packageId) && $packageId !== '0' && $packageId !== 0) {
            return ResponseHelper::error('流量池ID不能为空');
        }

        // 特殊处理：packageId为0时，返回"所有好友"的详情
        if ($packageId === '0' || $packageId === 0) {
            $data = [
                'id' => 0,
                'name' => '所有好友',
                'description' => '展示公司下所有设备的好友',
                'pic' => '',
                'type' => 1, // 系统类型
                'isSys' => 1,
                'createTime' => '',
                'updateTime' => '',
                'num' => 0,
            ];

            // 计算所有好友数量
            try {
                $wechatIds = Db::name('device')->alias('d')
                    ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
                    ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
                    ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
                    ->column('dwl.wechatId');
                
                if (!empty($wechatIds)) {
                    $allFriendsCount = Db::table('s2_wechat_friend')
                        ->where('ownerWechatId', 'in', $wechatIds)
                        ->where('isDeleted', 0)
                        ->count();
                    $data['num'] = $allFriendsCount;
                }
            } catch (\Exception $e) {
                // 如果查询失败，保持num为0
            }

            return ResponseHelper::success($data);
        }

        // 查询普通流量池详情
        $package = TrafficSourcePackage::where(['id' => $packageId, 'isDel' => 0])
            ->whereIn('companyId', [$companyId, 0])
            ->find();

        if (empty($package)) {
            return ResponseHelper::error('流量池不存在或已删除');
        }

        // 统计流量池中的数量
        $itemCount = TrafficSourcePackageItem::where([
            'packageId' => $packageId,
            'companyId' => $companyId,
            'isDel' => 0
        ])->count();

        $data = [
            'id' => $package['id'],
            'name' => $package['name'],
            'description' => $package['description'] ?? '',
            'pic' => $package['pic'] ?? '',
            'type' => $package['isSys'] ?? 0,
            'isSys' => $package['isSys'] ?? 0,
            'createTime' => !empty($package['createTime']) ? formatRelativeTime($package['createTime']) : '',
            'updateTime' => !empty($package['updateTime']) ? formatRelativeTime($package['updateTime']) : '',
            'num' => $itemCount,
        ];

        return ResponseHelper::success($data);
    }

    /**
     * 流量池列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getTrafficPoolList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $packageId = $this->request->param('packageId', '');
        $companyId = $this->getUserInfo('companyId');
        $userId = $this->getUserInfo('id');

        if (empty($packageId) && $packageId !== '0' && $packageId !== 0) {
            return ResponseHelper::error('流量包id不能为空');
        }

        // 特殊处理：packageId为0时，查询所有好友
        if ($packageId === '0' || $packageId === 0) {
            return $this->getAllFriendsList($page, $limit, $keyword, $companyId);
        }

        $trafficSourcePackage = TrafficSourcePackage::where(['id' => $packageId, 'isDel' => 0])->whereIn('companyId', [$companyId, 0])->find();
        if (empty($trafficSourcePackage)) {
            return ResponseHelper::error('流量包不存在或已删除');
        }
        $where = [
            ['tspi.companyId', '=', $companyId],
            ['tspi.packageId', '=', $packageId],
        ];

        if (!empty($keyword)) {
            $where[] = ['wa.nickname|wa.phone|wa.alias|wa.wechatId|p.mobile|p.identifier', 'like', '%' . $keyword . '%'];
        }

        $query = TrafficSourcePackageItem::alias('tspi')
            ->field(
                [
                    'p.id', 'p.identifier', 'p.mobile', 'p.wechatId', 'tspi.companyId',
                    'wa.nickname', 'wa.avatar', 'wa.gender', 'wa.phone', 'wa.alias'
                ]
            )
            ->join('traffic_pool p', 'p.identifier=tspi.identifier', 'left')
            ->join('wechat_account wa', 'tspi.identifier=wa.wechatId', 'left')
            ->where($where);

        $query->order('tspi.id DESC,p.id DESC')->group('p.identifier');

        $list = $query->page($page, $limit)->select();
        $total = $query->count();

        foreach ($list as $k => &$v) {
            //流量池筛选
            $package = TrafficSourcePackageItem::alias('tspi')
                ->join('traffic_source_package p', 'tspi.packageId=p.id AND tspi.companyId=p.companyId')
                ->where(['tspi.identifier' => $v['identifier']])
                ->whereIn('tspi.companyId', [0, $v['companyId']])
                ->column('p.name');
            $v['packages'] = $package;
            $v['phone'] = !empty($v['phone']) ? $v['phone'] : $v['mobile'];
            unset($v['mobile']);


            $scores = RFMController::calcRfmScores(30, 30, 30);
            $v['R'] = $scores['R'];
            $v['F'] = $scores['F'];
            $v['M'] = $scores['M'];
            $v['RFM'] = $scores['R'] + $scores['F'] + $scores['M'];
            $v['money'] = 3;
            $v['msgCount'] = 3  ;
            $v['tag'] = ['test', 'test2'];
        }
        unset($v);


        $data = ['list' => $list, 'total' => $total];
        return ResponseHelper::success($data);
    }

    /**
     * 获取所有好友列表（特殊流量池）
     * @param int $page
     * @param int $limit
     * @param string $keyword
     * @param int $companyId
     * @return \think\response\Json
     */
    private function getAllFriendsList($page, $limit, $keyword, $companyId)
    {
        try {
            // 获取公司下所有设备的微信ID
            $wechatIds = Db::name('device')->alias('d')
                ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
                ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
                ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
                ->column('dwl.wechatId');

            if (empty($wechatIds)) {
                return ResponseHelper::success(['list' => [], 'total' => 0]);
            }

            // 构建查询条件
            $where = [
                ['wf.ownerWechatId', 'in', $wechatIds],
                ['wf.isDeleted', '=', 0],
            ];

            // 关键字搜索
            if (!empty($keyword)) {
                $where[] = ['wf.nickname|wf.alias|wf.wechatId|wf.conRemark', 'like', '%' . $keyword . '%'];
            }

            // 查询好友列表
            $query = Db::table('s2_wechat_friend')->alias('wf')
                ->join(['s2_wechat_account' => 'wa'], 'wa.wechatId = wf.ownerWechatId', 'left')
                ->field([
                    'wf.id', 'wf.wechatId as identifier', 'wf.wechatId',
                    Db::raw($companyId . ' as companyId'), 'wf.nickname', 'wf.avatar', 'wf.gender', 'wf.phone', 'wf.alias'
                ])
                ->where($where);

            $total = $query->count();
            $list = $query->order('wf.id DESC')->page($page, $limit)->select();

            foreach ($list as $k => &$v) {
                // 获取好友所属的流量池包
                $package = TrafficSourcePackageItem::alias('tspi')
                    ->join('traffic_source_package p', 'tspi.packageId=p.id AND tspi.companyId=p.companyId')
                    ->where(['tspi.identifier' => $v['identifier']])
                    ->whereIn('tspi.companyId', [0, $companyId])
                    ->column('p.name');
                $v['packages'] = $package;
                $v['phone'] = !empty($v['phone']) ? $v['phone'] : '';

                // RFM评分（示例数据，实际应该从业务数据计算）
                $scores = RFMController::calcRfmScores(30, 30, 30);
                $v['R'] = $scores['R'];
                $v['F'] = $scores['F'];
                $v['M'] = $scores['M'];
                $v['RFM'] = $scores['R'] + $scores['F'] + $scores['M'];
                $v['money'] = 2222;
                $v['msgCount'] = 2222;
                $v['tag'] = ['test', 'test2'];
            }
            unset($v);

            $data = ['list' => $list, 'total' => $total];
            return ResponseHelper::success($data);
        } catch (\Exception $e) {
            return ResponseHelper::error('获取好友列表失败：' . $e->getMessage());
        }
    }

}