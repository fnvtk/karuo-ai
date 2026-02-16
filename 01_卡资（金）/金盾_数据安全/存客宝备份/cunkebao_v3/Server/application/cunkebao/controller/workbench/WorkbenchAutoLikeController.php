<?php

namespace app\cunkebao\controller\workbench;

use think\Controller;
use think\Db;

/**
 * 工作台 - 自动点赞相关功能
 */
class WorkbenchAutoLikeController extends Controller
{
    /**
     * 获取点赞记录列表
     * @return \think\response\Json
     */
    public function getLikeRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wali.workbenchId', '=', $workbenchId]
        ];

        // 查询点赞记录
        $list = Db::name('workbench_auto_like_item')->alias('wali')
            ->join(['s2_wechat_moments' => 'wm'], 'wali.snsId = wm.snsId')
            ->field([
                'wali.id',
                'wali.workbenchId',
                'wali.momentsId',
                'wali.snsId',
                'wali.wechatAccountId',
                'wali.wechatFriendId',
                'wali.createTime as likeTime',
                'wm.content',
                'wm.resUrls',
                'wm.createTime as momentTime',
                'wm.userName',
            ])
            ->where($where)
            ->order('wali.createTime', 'desc')
            ->group('wali.id')
            ->page($page, $limit)
            ->select();


        // 处理数据
        foreach ($list as &$item) {
            //处理用户信息
            $friend = Db::table('s2_wechat_friend')
                ->where(['id' => $item['wechatFriendId']])
                ->field('nickName,avatar')
                ->find();
            if (!empty($friend)) {
                $item['friendName'] = $friend['nickName'];
                $item['friendAvatar'] = $friend['avatar'];
            } else {
                $item['friendName'] = '';
                $item['friendAvatar'] = '';
            }


            //处理客服
            $friend = Db::table('s2_wechat_account')
                ->where(['id' => $item['wechatAccountId']])
                ->field('nickName,avatar')
                ->find();
            if (!empty($friend)) {
                $item['operatorName'] = $friend['nickName'];
                $item['operatorAvatar'] = $friend['avatar'];
            } else {
                $item['operatorName'] = '';
                $item['operatorAvatar'] = '';
            }

            // 处理时间格式
            $item['likeTime'] = date('Y-m-d H:i:s', $item['likeTime']);
            $item['momentTime'] = !empty($item['momentTime']) ? date('Y-m-d H:i:s', $item['momentTime']) : '';

            // 处理资源链接
            if (!empty($item['resUrls'])) {
                $item['resUrls'] = json_decode($item['resUrls'], true);
            } else {
                $item['resUrls'] = [];
            }
        }

        // 获取总记录数
        $total = Db::name('workbench_auto_like_item')->alias('wali')
            ->where($where)
            ->count();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]
        ]);
    }
}



