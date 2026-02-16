<?php

namespace app\cunkebao\controller\wechat;

use app\common\model\WechatCustomer as WechatCustomerModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\common\model\WechatRestricts as WechatRestrictsModel;
use app\cunkebao\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use library\ResponseHelper;
use think\Db;

class GetWechatController extends BaseController
{
    /**
     * 获取微信客服信息
     *
     * @param string $wechatId
     * @return WechatCustomerModel|null
     * @throws \Exception
     */
    private function getWechatCustomerModel(string $wechatId): ?WechatCustomerModel
    {
        if (!isset($this->WechatCustomerModel)) {
            $this->WechatCustomerModel = WechatCustomerModel::where(
                [
                    'wechatId'  => $wechatId,
                    'companyId' => $this->getUserInfo('companyId')
                ]
            )
                ->find();
        }

        return $this->WechatCustomerModel;
    }


    /**
     * 获取昨日聊天次数
     *
     * @param WechatCustomerModel $customer
     * @return int
     */
    protected function getChatTimesPerDay(?WechatCustomerModel $customer): int
    {
        return $customer->activity->yesterdayMsgCount ?? 0;
    }

    /**
     * 总聊天数量
     *
     * @param WechatCustomerModel $customer
     * @return int
     */
    protected function getChatTimesTotal(?WechatCustomerModel $customer): int
    {
        return $customer->activity->totalMsgCount ?? 0;
    }

    /**
     * 计算活跃程度（根据消息数）
     *
     * @param string $wechatId
     * @return string
     */
    protected function getActivityLevel(string $wechatId): array
    {
        $customer = $this->getWechatCustomerModel($wechatId);

        return [
            'allTimes' => $this->getChatTimesTotal($customer),
            'dayTimes' => $this->getChatTimesPerDay($customer),
        ];
    }

    /**
     * 获取限制记录
     *
     * @param string $wechatId
     * @return array
     */
    protected function getRestrict(string $wechatId): array
    {
        return WechatRestrictsModel::alias('r')
            ->field(
                [
                    'r.id', 'r.restrictTime date', 'r.level', 'r.reason'
                ]
            )
            ->where('r.wechatId', $wechatId)->select()
            ->toArray();
    }

    /**
     * 获取账号权重
     *
     * @param string $wechatId
     * @return array
     */
    protected function getAccountWeight(string $wechatId): array
    {
        $customer = $this->getWechatCustomerModel($wechatId);
        $seeders  = $customer ? (array)$customer->weight : array();

        // 严谨返回
        return ArrHelper::getValue('ageWeight,activityWeigth,restrictWeight,realNameWeight,scope', $seeders, 0);
    }

    /**
     * 获取当日最高添加好友记录
     *
     * @param string $wechatId
     * @return int
     * @throws \Exception
     */
    protected function getAccountWeightAddLimit(string $wechatId): int
    {
        return $this->getWechatCustomerModel($wechatId)->weight->addLimit ?? 20;
    }

    /**
     * 计算今日新增好友数量
     *
     * @param string $ownerWechatId
     * @return int
     */
    protected function getTodayNewFriendCount(string $ownerWechatId): int
    {

        return Db::table('s2_friend_task')
            ->where('wechatId',$ownerWechatId)
            ->whereBetween('createTime', [strtotime(date('Y-m-d 00:00:00')), strtotime(date('Y-m-d 23:59:59'))])
            ->count();
    }

    /**
     * 获取账号加友统计数据.
     *
     * @param string $wechatId
     * @return array
     */
    protected function getStatistics(string $wechatId): array
    {
        return [
            'todayAdded' => $this->getTodayNewFriendCount($wechatId),
            'addLimit'   => $this->getAccountWeightAddLimit($wechatId)
        ];
    }




    public function getWechatInfo()
    {
        $wechatId = $this->request->param('wechatId','');
        if (empty($wechatId)) {
            return ResponseHelper::error('微信id不能为空');
        }
        $userInfo = Db::name('wechat_customer')->alias('wc')
            ->join('wechat_account wa','wc.wechatId = wa.wechatId')
            ->where(['wc.wechatId' => $wechatId])
            ->field('wc.*,wa.nickname,wa.alias,wa.avatar,wa.gender')
            ->find();

        if (empty($userInfo)){
            return ResponseHelper::error('该微信不存在');
        }
        $accountAge= !empty($userInfo['createTime']) ? date('Y-m-d H:i:s',$userInfo['createTime']) : date('Y-m-d H:i:s');
        unset($userInfo['basic'],$userInfo['companyId'],$userInfo['createTime'],$userInfo['updateTime'],$userInfo['id']);

        $userInfo['weight'] = json_decode($userInfo['weight'],true);
        $userInfo['activity'] = json_decode($userInfo['activity'],true);
        $userInfo['friendShip'] = json_decode($userInfo['friendShip'],true);


        $newData = [
            'userInfo' => $userInfo,
            'accountAge'    => $accountAge,
            'activityLevel' => $this->getActivityLevel($wechatId),
            'accountWeight' => $this->getAccountWeight($wechatId),
            'statistics'    => $this->getStatistics($wechatId),
//            'restrictions'  => $this->getRestrict($wechatId),
        ];



        return ResponseHelper::success($newData);
    }
}