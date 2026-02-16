<?php

namespace app\cunkebao\controller\traffic;

use app\common\model\TrafficPool as TrafficPoolModel;
use app\common\model\TrafficSource as TrafficSourceModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 流量池控制器
 */
class GetConvertedListWithInCompanyV1Controller extends BaseController
{
    /**
     * 构建返回数据
     *
     * @param \think\Paginator $result
     * @return array
     */
    protected function makeResultedSet(\think\Paginator $result): array
    {
        $resultSets = [];

        foreach ($result->items() as $item) {
            $item->tags = json_decode($item->tags);

            array_push($resultSets, $item->toArray());
        }

        return $resultSets;
    }

    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        if (!empty($keyword = $this->request->param('keyword'))) {
            $where[] = ['exp', "w.alias LIKE '%{$keyword}%' OR w.nickname LIKE '%{$keyword}%'"];
        }

        // 来源的筛选
        if ($fromd = $this->request->param('fromd')) {
            $where['s.fromd'] = $fromd;
        }

        $where['s.companyId'] = $this->getUserInfo('companyId');
        $where['s.status'] = TrafficSourceModel::STATUS_PASSED;

        return array_merge($where, $params);
    }

    /**
     * 获取流量池列表
     *
     * @param array $where
     * @return \think\Paginator
     */
    protected function getPoolListByCompanyId(array $where): \think\Paginator
    {
        $query = TrafficSourceModel::alias('s')
            ->field(
                [
                    'w.id', 'w.nickname', 'w.avatar',
                    'CASE WHEN w.alias IS NULL OR w.alias = "" THEN w.wechatId ELSE w.alias END AS wechatId',
                    's.fromd',
                    'f.tags', 'f.createTime', TrafficSourceModel::STATUS_PASSED . ' status'
                ]
            )
            ->join('traffic_pool p', 'p.identifier=s.identifier')
            ->join('wechat_account w', 'p.wechatId=w.wechatId')
            ->join('wechat_friendship f', 'w.wechatId=f.wechatId and f.deleteTime=0')
            ->order('s.id desc');

        foreach ($where as $key => $value) {
            if (is_numeric($key) && is_array($value) && isset($value[0]) && $value[0] === 'exp') {
                $query->whereExp('', $value[1]);
                continue;
            }

            $query->where($key, $value);
        }

        return $query->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
    }

    /**
     * 获取流量池列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $result = $this->getPoolListByCompanyId( $this->makeWhere() );

            return ResponseHelper::success(
                [
                    'list'  => $this->makeResultedSet($result),
                    'total' => $result->total(),
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 