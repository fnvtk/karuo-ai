<?php

namespace app\cunkebao\controller\workbench;

use think\Controller;
use think\Db;

/**
 * 工作台 - 联系人导入相关功能
 */
class WorkbenchImportContactController extends Controller
{
    /**
     * 获取通讯录导入记录列表
     * @return \think\response\Json
     */
    public function getImportContact()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wici.workbenchId', '=', $workbenchId]
        ];

        // 查询发布记录
        $list = Db::name('workbench_import_contact_item')->alias('wici')
            ->join('traffic_pool tp', 'tp.id = wici.poolId', 'left')
            ->join('traffic_source tc', 'tc.identifier = tp.identifier', 'left')
            ->join('wechat_account wa', 'wa.wechatId = tp.wechatId', 'left')
            ->field([
                'wici.id',
                'wici.workbenchId',
                'wici.createTime',
                'tp.identifier',
                'tp.mobile',
                'tp.wechatId',
                'tc.name',
                'wa.nickName',
                'wa.avatar',
                'wa.alias',
            ])
            ->where($where)
            ->order('tc.name DESC,wici.createTime DESC')
            ->group('tp.identifier')
            ->page($page, $limit)
            ->select();

        foreach ($list as &$item) {
            $item['createTime'] = date('Y-m-d H:i:s', $item['createTime']);
        }

        // 获取总记录数
        $total = Db::name('workbench_import_contact_item')->alias('wici')
            ->where($where)
            ->count();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
            ]
        ]);
    }
}



