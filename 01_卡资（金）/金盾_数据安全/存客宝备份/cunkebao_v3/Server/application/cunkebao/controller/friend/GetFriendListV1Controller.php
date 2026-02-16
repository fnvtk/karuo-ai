<?php
namespace app\cunkebao\controller\friend;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use app\api\controller\AutomaticAssign;
use think\Db;

/**
 * 设备管理控制器
 */
class GetFriendListV1Controller extends BaseController
{
    

    /**
     * 获取好友列表
     * @return \think\response\Json
     */
    public function index()
    {
        $page = $this->request->param('page',1);
        $limit = $this->request->param('limit',20);
        $keyword = $this->request->param('keyword','');
        $deviceIds = $this->request->param('deviceIds','');

        if(!empty($deviceIds)){
            $deviceIds = explode(',',$deviceIds);
        }

        try {

            $where = [];
            if ($this->getUserInfo('isAdmin') == 1) {
                $where[] = ['isDeleted','=',0];
            } else {
                $where[] = ['isDeleted','=',0];
            }

            if(!empty($keyword)){
                $where[] = ['nickname|alias|wechatId','like','%'.$keyword.'%'];
            }

          /*  $wechatIds = Db::name('device')->alias('d')
                ->join('device_wechat_login dwl','dwl.deviceId=d.id AND dwl.companyId='.$this->getUserInfo('companyId'))
                ->where(['d.companyId' => $this->getUserInfo('companyId'),'d.deleteTime' => 0])
                ->group('dwl.deviceId')
                ->order('dwl.id desc');*/


            $companyId = $this->getUserInfo('companyId');
            
            $wechatIds = Db::name('device')->alias('d')
                // 仅关联每个设备在 device_wechat_login 中的最新一条记录
                ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max','dwl_max.deviceId = d.id')
                ->join('device_wechat_login dwl','dwl.id = dwl_max.id')
                ->where(['d.companyId' => $companyId,'d.deleteTime' => 0]);


            if (!empty($deviceIds)){
                $wechatIds = $wechatIds->where('d.id','in',$deviceIds);
            }
            $wechatIds = $wechatIds->column('dwl.wechatId');

            $where[] = ['ownerWechatId','in',$wechatIds];

            $data = Db::table('s2_wechat_friend')
                ->field([
                    'id', 'nickname', 'avatar', 'alias', 'wechatId', 
                    'gender', 'phone', 'createTime', 'updateTime', 'deleteTime',
                    'ownerNickname', 'ownerAlias', 'ownerWechatId',
                    'accountUserName', 'accountNickname', 'accountRealName'
                ])
                ->where($where);
            $total = $data->count();
            $list = $data->page($page, $limit)->order('id DESC')->select();

            // 格式化时间字段和处理数据
            $formattedList = [];
            foreach ($list as $item) {
                $formattedItem = [
                    'id' => $item['id'],
                    'nickname' => $item['nickname'] ?? '',
                    'avatar' => $item['avatar'] ?? '',
                    'alias' => $item['alias'] ?? '',
                    'wechatId' => $item['wechatId'] ?? '',
                    'gender' => $item['gender'] ?? 0,
                    'phone' => $item['phone'] ?? '',
                    'account' => $item['accountUserName'] ?? '',
                    'username' => $item['accountRealName'] ?? '',
                    'createTime' => !empty($item['createTime']) ? date('Y-m-d H:i:s', $item['createTime']) : '1970-01-01 08:00:00',
                    'updateTime' => !empty($item['updateTime']) ? date('Y-m-d H:i:s', $item['updateTime']) : '1970-01-01 08:00:00',
                    'deleteTime' => !empty($item['deleteTime']) ? date('Y-m-d H:i:s', $item['deleteTime']) : '1970-01-01 08:00:00',
                    'ownerNickname' => $item['ownerNickname'] ?? '',
                    'ownerAlias' => $item['ownerAlias'] ?? '',
                    'ownerWechatId' => $item['ownerWechatId'] ?? '',
                    'accountNickname' => $item['accountNickname'] ?? ''
                ];
                $formattedList[] = $formattedItem;
            }

            return json([
                'code' => 200,
                'msg' => '获取成功',
                'data' => [
                    'list' => $formattedList,
                    'total' => $total,
                    'companyId' => $this->getUserInfo('companyId')
                ]
            ]);
        } catch (\Exception $e) {
            return json([
                'code' => $e->getCode(),
                'msg' => $e->getMessage()
            ]);
        }
    }

    /**
     * 好友转移
     * @return \think\response\Json
     */
    public function transfer()
    {
        $friendId = $this->request->param('friendId', 0);
        $toAccountId = $this->request->param('toAccountId', '');
        $comment =  $this->request->param('comment', '');
        $companyId = $this->getUserInfo('companyId');

        // 参数验证
        if (empty($friendId)) {
            return json([
                'code' => 400,
                'msg' => '好友ID不能为空'
            ]);
        }

        if (empty($toAccountId)) {
            return json([
                'code' => 400,
                'msg' => '目标账号ID不能为空'
            ]);
        }

        try {
            // 验证目标账号是否存在且属于当前公司
            $accountInfo = Db::table('s2_company_account')
                ->where('id', $toAccountId)
                ->where('departmentId', $companyId)
                ->field('id as accountId, userName as accountUserName, realName as accountRealName, nickname as accountNickname, tenantId')
                ->find();

            if (empty($accountInfo)) {
                return json([
                    'code' => 404,
                    'msg' => '目标账号不存在'
                ]);
            }


            // 调用 AutomaticAssign 进行好友转移
            $automaticAssign = new AutomaticAssign();
            $result = $automaticAssign->allotWechatFriend([
                'wechatFriendId' => $friendId,
                'toAccountId' => $toAccountId,
                'comment' => $comment,
                'notifyReceiver' => false,
                'optFrom' => 4
            ], true);

            $resultData = json_decode($result, true);
            
            if (!empty($resultData) && $resultData['code'] == 200) {
                // 转移成功后更新数据库
                $updateData = [
                    'accountId' => $accountInfo['accountId'],
                    'accountUserName' => $accountInfo['accountUserName'],
                    'accountRealName' => $accountInfo['accountRealName'],
                    'accountNickname' => $accountInfo['accountNickname'],
                    'updateTime' => time()
                ];

                Db::table('s2_wechat_friend')
                    ->where('id', $friendId)
                    ->update($updateData);

                return json([
                    'code' => 200,
                    'msg' => '好友转移成功',
                    'data' => [
                        'friendId' => $friendId,
                        'toAccountId' => $toAccountId
                    ]
                ]);
            } else {
                return json([
                    'code' => 500,
                    'msg' => '好友转移失败：' . ($resultData['msg'] ?? '未知错误')
                ]);
            }

        } catch (\Exception $e) {
            return json([
                'code' => 500,
                'msg' => '好友转移失败：' . $e->getMessage()
            ]);
        }
    }
} 