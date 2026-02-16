<?php

namespace app\cunkebao\controller\device;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\User as UserModel;
use app\common\model\WechatCustomer as WechatCustomerModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 设备管理控制器
 */
class GetDeviceListV1Controller extends BaseController
{
    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        // 关键词搜索（同时搜索IMEI和备注）
        if (!empty($keyword = $this->request->param('keyword'))) {
            $where[] = ['exp', "d.imei LIKE '%{$keyword}%' OR d.memo LIKE '%{$keyword}%'"];
        }

        // 设备在线状态
        if (is_numeric($alive = $this->request->param('alive'))) {
            $where['d.alive'] = $alive;
        }

        $where['d.companyId'] = $this->getUserInfo('companyId');

        return array_merge($params, $where);
    }

    /**
     * 获取指定用户的所有设备ID
     *
     * @return array
     */
    protected function makeDeviceIdsWhere(): array
    {
        $deviceIds = DeviceUserModel::where(
            [
                'userId'    => $this->getUserInfo('id'),
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->column('deviceId');

        if (empty($deviceIds)) {
            throw new \Exception('请联系管理员绑定设备', 403);
        }

        $where['d.id'] = array('in', $deviceIds);

        return $where;
    }

    /**
     * 获取设备列表
     *
     * @param array $where 查询条件
     * @return \think\Paginator 分页对象
     */
    protected function getDeviceList(array $where): \think\Paginator
    {

        $companyId = $this->getUserInfo('companyId');
        $query = DeviceModel::alias('d')
            ->field([
                'd.id', 'd.imei', 'd.memo', 'd.alive',
                'l.wechatId',
                'a.nickname', 'a.alias', 'a.avatar', '0 totalFriend'
            ])
            ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max','dwl_max.deviceId = d.id')
            ->join('device_wechat_login l','l.id = dwl_max.id')
            ->join('wechat_account a', 'l.wechatId = a.wechatId')
            ->order('d.id desc');

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
     * 获取设备最新登录微信的 wechatId
     *
     * @param int $deviceId
     * @return string|null
     * @throws \Exception
     */
    protected function getDeviceLatestWechatLogin(int $deviceId): ?string
    {
        return DeviceWechatLoginModel::where(
            [
                'companyId' => $this->getUserInfo('companyId'),
                'deviceId'  => $deviceId,
                'alive'     => DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE
            ]
        )
            ->value('wechatId');
    }

    /**
     * 获取设备绑定的客服信息
     *
     * @param string $wechatId
     * @return int
     * @throws \Exception
     */
    protected function getWechatCustomerInfo(string $wechatId): int
    {
        $curstomer = WechatCustomerModel::field('friendShip')
            ->where(
                [
                    //'companyId' => $this->getUserInfo('companyId'),
                    'wechatId'  => $wechatId
                ]
            )
            ->find();

        return $curstomer->friendShip->totalFriend ?? 0;
    }

    /**
     * 统计微信好友
     *
     * @param \think\Paginator $list
     * @return array
     */
    protected function countFriend(\think\Paginator $list): array
    {
        $resultSets = [];

        foreach ($list->items() as $item) {
            $wechatId = $this->getDeviceLatestWechatLogin($item->id);

            $item->totalFriend = $wechatId ? $this->getWechatCustomerInfo($wechatId) : 0;

            array_push($resultSets, $item->toArray());
        }

        return $resultSets;
    }

    /**
     * 获取设备列表
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            if ($this->getUserInfo('isAdmin') == UserModel::ADMIN_STP) {
                $where = $this->makeWhere();
                $result = $this->getDeviceList($where);
            }else {
                //$where = $this->makeWhere( $this->makeDeviceIdsWhere() );
                $where = $this->makeWhere();
                $result = $this->getDeviceList($where);
            }

            return ResponseHelper::success(
                [
                    'list'  => $this->countFriend($result),
                    'total' => $result->total(),
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 