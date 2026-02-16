<?php

namespace app\superadmin\controller\traffic;

use app\common\model\Company as CompanyModel;
use app\common\model\TrafficPool as TrafficPoolModel;
use app\common\model\TrafficSource as TrafficSourceModel;
use app\common\model\WechatAccount as WechatAccountModel;
use app\common\model\WechatTag as WechatTagModel;
use think\Controller;
use think\facade\Request;

/**
 * 客户池控制器
 */
class GetPoolDetailController extends Controller
{
    /**
     * 获取客户详情
     * @return \think\response\Json
     */
    public function index()
    {
        // 获取参数
        $id = Request::param('id/d');
        if (!$id) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        try {
            // 查询流量来源信息
            $sourceInfo = TrafficSourceModel::alias('ts')
                ->join('company c', 'ts.companyId = c.companyId', 'LEFT')
                ->field([
                    'ts.fromd as source',
                    'ts.createTime as addTime',
                    'c.name as projectName',
                    'ts.identifier'
                ])
                ->where('ts.id', $id)
                ->find();

            if (!$sourceInfo) {
                return json(['code' => 404, 'msg' => '记录不存在']);
            }

            // 查询客户池信息
            $poolInfo = TrafficPoolModel::where('identifier', $sourceInfo['identifier'])
                ->field('wechatId')
                ->find();

            $result = [
                'source' => $sourceInfo['source'],
                'addTime' => $sourceInfo['addTime'] ? date('Y-m-d H:i:s', $sourceInfo['addTime']) : null,
                'projectName' => $sourceInfo['projectName']
            ];

            // 如果存在微信ID，查询微信账号信息
            if ($poolInfo && $poolInfo['wechatId']) {
                // 查询微信账号信息
                $wechatInfo = WechatAccountModel::where('wechatId', $poolInfo['wechatId'])
                    ->field('avatar,nickname,region,gender')
                    ->find();

                if ($wechatInfo) {
                    $result = array_merge($result, [
                        'avatar' => $wechatInfo['avatar'],
                        'nickname' => $wechatInfo['nickname'],
                        'region' => $wechatInfo['region'],
                        'gender' => $this->formatGender($wechatInfo['gender'])
                    ]);

                    // 查询标签信息
                    $tagInfo = WechatTagModel::where('wechatId', $poolInfo['wechatId'])
                        ->field('tags')
                        ->find();

                    if ($tagInfo) {
                        $result['tags'] = is_string($tagInfo['tags']) ?
                            json_decode($tagInfo['tags'], true) :
                            $tagInfo['tags'];
                    } else {
                        $result['tags'] = [];
                    }
                }
            } else {
                $result = array_merge($result, [
                    'avatar' => '',
                    'nickname' => '未知',
                    'region' => '未知',
                    'gender' => $this->formatGender(0),
                    'tags' => []
                ]);
            }

            return json([
                'code' => 200,
                'msg' => '获取成功',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return json([
                'code' => 500,
                'msg' => '系统错误：' . $e->getMessage()
            ]);
        }
    }

    /**
     * 格式化性别显示
     * @param int $gender
     * @return string
     */
    protected function formatGender($gender)
    {
        switch ($gender) {
            case 1:
                return '男';
            case 2:
                return '女';
            default:
                return '保密';
        }
    }
} 