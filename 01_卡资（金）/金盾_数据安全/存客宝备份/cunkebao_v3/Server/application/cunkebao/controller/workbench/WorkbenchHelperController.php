<?php

namespace app\cunkebao\controller\workbench;

use think\Controller;
use think\Db;
use think\facade\Env;

/**
 * 工作台 - 辅助功能
 */
class WorkbenchHelperController extends Controller
{
    /**
     * 获取所有微信好友标签及数量统计
     * @return \think\response\Json
     */
    public function getDeviceLabels()
    {
        $deviceIds = $this->request->param('deviceIds', '');
        $companyId = $this->request->userInfo['companyId'];
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');

        $where = [
            ['wc.companyId', '=', $companyId],
        ];

        if (!empty($deviceIds)) {
            $deviceIds = explode(',', $deviceIds);
            $where[] = ['dwl.deviceId', 'in', $deviceIds];
        }

        $wechatAccounts = Db::name('wechat_customer')->alias('wc')
            ->join('device_wechat_login dwl', 'dwl.wechatId = wc.wechatId AND dwl.companyId = wc.companyId AND dwl.alive = 1')
            ->join(['s2_wechat_account' => 'wa'], 'wa.wechatId = wc.wechatId')
            ->where($where)
            ->field('wa.id,wa.wechatId,wa.nickName,wa.labels')
            ->select();
        $labels = [];
        $wechatIds = [];
        foreach ($wechatAccounts as $account) {
            $labelArr = json_decode($account['labels'], true);
            if (is_array($labelArr)) {
                foreach ($labelArr as $label) {
                    if ($label !== '' && $label !== null) {
                        $labels[] = $label;
                    }
                }
            }
            $wechatIds[] = $account['wechatId'];
        }
        // 去重（只保留一个）
        $labels = array_values(array_unique($labels));
        $wechatIds = array_unique($wechatIds);

        // 搜索过滤
        if (!empty($keyword)) {
            $labels = array_filter($labels, function ($label) use ($keyword) {
                return mb_stripos($label, $keyword) !== false;
            });
            $labels = array_values($labels); // 重新索引数组
        }

        // 分页处理
        $labels2 = array_slice($labels, ($page - 1) * $limit, $limit);

        // 统计数量
        $newLabel = [];
        foreach ($labels2 as $label) {
            $friendCount = Db::table('s2_wechat_friend')
                ->whereIn('ownerWechatId', $wechatIds)
                ->where('labels', 'like', '%"' . $label . '"%')
                ->count();
            $newLabel[] = [
                'label' => $label,
                'count' => $friendCount
            ];
        }

        // 返回结果
        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $newLabel,
                'total' => count($labels),
            ]
        ]);
    }

    /**
     * 获取群列表
     * @return \think\response\Json
     */
    public function getGroupList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');

        $where = [
            ['wg.deleteTime', '=', 0],
            ['wg.companyId', '=', $this->request->userInfo['companyId']],
        ];

        if (!empty($keyword)) {
            $where[] = ['wg.name', 'like', '%' . $keyword . '%'];
        }

        $query = Db::name('wechat_group')->alias('wg')
            ->join('wechat_account wa', 'wa.wechatId = wg.ownerWechatId')
            ->where($where);

        $total = $query->count();
        $list = $query->order('wg.id', 'desc')
            ->field('wg.id,wg.name as groupName,wg.ownerWechatId,wa.nickName,wg.createTime,wa.avatar,wa.alias,wg.avatar as groupAvatar')
            ->page($page, $limit)
            ->select();

        // 优化：格式化时间，头像兜底
        $defaultGroupAvatar = '';
        $defaultAvatar = '';
        foreach ($list as &$item) {
            $item['createTime'] = $item['createTime'] ? date('Y-m-d H:i:s', $item['createTime']) : '';
            $item['groupAvatar'] = $item['groupAvatar'] ?: $defaultGroupAvatar;
            $item['avatar'] = $item['avatar'] ?: $defaultAvatar;
        }

        return json(['code' => 200, 'msg' => '获取成功', 'data' => ['total' => $total, 'list' => $list]]);
    }

    /**
     * 获取流量池列表
     * @return \think\response\Json
     */
    public function getTrafficPoolList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $companyId = $this->request->userInfo['companyId'];

        $baseQuery = Db::name('traffic_source_package')->alias('tsp')
            ->where('tsp.isDel', 0)
            ->whereIn('tsp.companyId', [$companyId, 0]);

        if (!empty($keyword)) {
            $baseQuery->whereLike('tsp.name', '%' . $keyword . '%');
        }

        $total = (clone $baseQuery)->count();

        $list = $baseQuery
            ->leftJoin('traffic_source_package_item tspi', 'tspi.packageId = tsp.id and tspi.isDel = 0')
            ->field('tsp.id,tsp.name,tsp.description,tsp.pic,tsp.companyId,COUNT(tspi.id) as itemCount,max(tspi.createTime) as latestImportTime')
            ->group('tsp.id')
            ->order('tsp.id', 'desc')
            ->page($page, $limit)
            ->select();

        foreach ($list as &$item) {
            $item['latestImportTime'] = !empty($item['latestImportTime']) ? date('Y-m-d H:i:s', $item['latestImportTime']) : '';
        }
        unset($item);

        return json(['code' => 200, 'msg' => '获取成功', 'data' => ['total' => $total, 'list' => $list]]);
    }

    /**
     * 获取账号列表
     * @return \think\response\Json
     */
    public function getAccountList()
    {
        $companyId = $this->request->userInfo['companyId'];
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $query = Db::table('s2_company_account')
            ->alias('a')
            ->where(['a.departmentId' => $companyId, 'a.status' => 0])
            ->whereNotLike('a.userName', '%_offline%')
            ->whereNotLike('a.userName', '%_delete%');

        $total = $query->count();
        $list = $query->field('a.id,a.userName,a.realName,a.nickname,a.memo')
            ->page($page, $limit)
            ->select();

        return json(['code' => 200, 'msg' => '获取成功', 'data' => ['total' => $total, 'list' => $list]]);
    }

    /**
     * 获取京东联盟导购媒体
     * @return \think\response\Json
     */
    public function getJdSocialMedia()
    {
        $data = Db::name('jd_social_media')->order('id DESC')->select();
        return json(['code' => 200, 'msg' => '获取成功', 'data' => $data]);
    }

    /**
     * 获取京东联盟广告位
     * @return \think\response\Json
     */
    public function getJdPromotionSite()
    {
        $id = $this->request->param('id', '');
        if (empty($id)) {
            return json(['code' => 500, 'msg' => '参数缺失']);
        }

        $data = Db::name('jd_promotion_site')->where('jdSocialMediaId', $id)->order('id DESC')->select();
        return json(['code' => 200, 'msg' => '获取成功', 'data' => $data]);
    }

    /**
     * 京东转链-京推推
     * @param string $content
     * @param string $positionid
     * @return string
     */
    public function changeLink($content = '', $positionid = '')
    {
        $unionId = Env::get('jd.unionId', '');
        $jttAppId = Env::get('jd.jttAppId', '');
        $appKey = Env::get('jd.appKey', '');
        $apiUrl = Env::get('jd.apiUrl', '');

        $content = !empty($content) ? $content : $this->request->param('content', '');
        $positionid = !empty($positionid) ? $positionid : $this->request->param('positionid', '');

        if (empty($content)) {
            return json_encode(['code' => 500, 'msg' => '转链的内容为空']);
        }

        // 验证是否包含链接
        if (!$this->containsLink($content)) {
            return json_encode(['code' => 500, 'msg' => '内容中未检测到有效链接']);
        }

        if (empty($unionId) || empty($jttAppId) || empty($appKey) || empty($apiUrl)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }
        $params = [
            'unionid' => $unionId,
            'content' => $content,
            'appid' => $jttAppId,
            'appkey' => $appKey,
            'v' => 'v2'
        ];

        if (!empty($positionid)) {
            $params['positionid'] = $positionid;
        }

        $res = requestCurl($apiUrl, $params, 'GET', [], 'json');
        $res = json_decode($res, true);
        if (empty($res)) {
            return json_encode(['code' => 500, 'msg' => '未知错误']);
        }
        $result = $res['result'];
        if ($res['return'] == 0) {
            return json_encode(['code' => 200, 'data' => $result['chain_content'], 'msg' => $result['msg']]);
        } else {
            return json_encode(['code' => 500, 'msg' => $result['msg']]);
        }
    }

    /**
     * 验证内容是否包含链接
     * @param string $content 要检测的内容
     * @return bool
     */
    private function containsLink($content)
    {
        // 定义各种链接的正则表达式模式
        $patterns = [
            // HTTP/HTTPS链接
            '/https?:\/\/[^\s]+/i',
            // 京东商品链接
            '/item\.jd\.com\/\d+/i',
            // 京东短链接
            '/u\.jd\.com\/[a-zA-Z0-9]+/i',
            // 淘宝商品链接
            '/item\.taobao\.com\/item\.htm\?id=\d+/i',
            // 天猫商品链接
            '/detail\.tmall\.com\/item\.htm\?id=\d+/i',
            // 淘宝短链接
            '/m\.tb\.cn\/[a-zA-Z0-9]+/i',
            // 拼多多链接
            '/mobile\.yangkeduo\.com\/goods\.html\?goods_id=\d+/i',
            // 苏宁易购链接
            '/product\.suning\.com\/\d+\/\d+\.html/i',
            // 通用域名模式（包含常见电商域名）
            '/(?:jd|taobao|tmall|yangkeduo|suning|amazon|dangdang)\.com[^\s]*/i',
            // 通用短链接模式
            '/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9\-._~:\/?#\[\]@!$&\'()*+,;=]+/i'
        ];

        // 遍历所有模式进行匹配
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }

        return false;
    }
}



