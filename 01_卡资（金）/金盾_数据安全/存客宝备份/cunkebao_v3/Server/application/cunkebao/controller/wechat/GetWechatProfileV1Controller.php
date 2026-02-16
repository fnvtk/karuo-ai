<?php

namespace app\cunkebao\controller\wechat;

use app\common\model\TrafficPool as TrafficPoolModel;
use app\common\model\WechatAccount as WechatAccountModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 设备微信控制器
 */
class GetWechatProfileV1Controller extends BaseController
{
    /**
     * 获取最近互动时间
     *
     * @param string $wechatId
     * @return string
     */
    protected function getLastPlayTime(string $wechatId): string
    {
        return date('Y-m-d', strtotime('-1 day'));
    }

    /**
     * 获取好友标签
     *
     * @param string $tags
     * @return array
     */
    protected function getWechatTags(string $tags): array
    {
        return json_decode($tags, true);
    }

    /**
     * 获取添加时间
     *
     * @param int|string $timestamp
     * @return string
     */
    protected function getAddShipDate($timestamp): string
    {
        return is_numeric($timestamp) ? date('Y-m-d', $timestamp) : date('Y-m-d', strtotime($timestamp));
    }

    /**
     * 获取流量来源
     *
     * @param string $wechatId
     * @return string|null
     */
    protected function getTrafficSource(string $wechatId): string
    {
        return (string)TrafficPoolModel::alias('p')
            ->field('t.id')
            ->join('traffic_source s', 's.identifier = p.identifier')
            ->where('p.wechatId', $wechatId)
            ->value('fromd');
    }

    /**
     * 获取微信账号
     *
     * @param string $wechatId
     * @return array
     * @throws \Exception
     */
    protected function getWechatAccountProfileByWechatId(string $wechatId): array
    {
        $account = WechatAccountModel::alias('w')
            ->field(
                [
                    'w.id', 'w.avatar', 'w.nickname', 'w.region', 'w.wechatId',
                    'CASE WHEN w.alias IS NULL OR w.alias = "" THEN w.wechatId ELSE w.alias END AS wechatId',
                    'f.createTime', 'f.tags', 'f.memo'
                ]
            )
            ->join('wechat_friendship f', 'w.wechatId=f.wechatId')
            ->where('w.wechatId', $wechatId)
            ->find();

        if (is_null($account)) {
            throw new \Exception('未获取到微信账号数据', 404);
        }

        return $account->toArray();
    }

    /**
     * 获取微信好友详情
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $results = $this->getWechatAccountProfileByWechatId(
                $this->request->param('wechatId/s')
            );

            return ResponseHelper::success(
                array_merge($results, [
                    'playDate' => $this->getLastPlayTime($results['wechatId']),
                    'source'   => $this->getTrafficSource($results['wechatId']),
                    'tags'     => $this->getWechatTags($results['tags']),
                    'addDate'  => $this->getAddShipDate($results['createTime']),
                ])
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 