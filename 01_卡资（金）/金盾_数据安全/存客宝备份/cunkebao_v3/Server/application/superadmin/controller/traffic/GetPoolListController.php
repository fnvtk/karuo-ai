<?php

namespace app\superadmin\controller\traffic;

use app\common\model\TrafficPool as TrafficPoolModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\facade\Request;

/**
 * 客户池控制器
 */
class GetPoolListController extends BaseController
{
    /**
     * 格式化性别显示
     *
     * @param int $gender
     * @return string
     */
    protected function formatGender(?int $gender): string
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

    /**
     * 处理标签显示
     *
     * @param string|null $tags
     * @return array
     */
    protected function handlTags(?string $tags): array
    {
        return is_string($tags) ? json_decode($tags, true) : [];
    }

    /**
     * 格式化时间
     *
     * @param string|null $date
     * @return string|null
     */
    protected function formatDate(?string $date): ?string
    {
        return $date ? date('Y-m-d H:i:s', $date) : null;
    }

    /**
     * 构建返回数据
     *
     * @param \think\Paginator $list
     * @return \think\Paginator
     */
    protected function makeReturnedValue(\think\Paginator $list): \think\Paginator
    {
        $list->each(function ($item) {
            $item->gender  = $this->formatGender($item->gender);
            $item->addTime = $this->formatDate($item->addTime);
            $item->tags    = $this->handlTags($item->tags);
        });

        return $list;
    }

    /**
     * 构建查询.
     *
     * @return TrafficPoolModel|\think\Paginator
     */
    protected function gePoolList(): \think\Paginator
    {
        $query = TrafficPoolModel::alias('tp')
            ->field([
                'tp.wechatId',
                'ts.id', 'ts.createTime as addTime', 'ts.fromd as source',
                'c.name as projectName',
                'wa.avatar', 'wa.gender', 'wa.nickname', 'wa.region',
                'wt.tags'
            ])
            ->join('traffic_source ts', 'tp.identifier = ts.identifier', 'RIGHT')
            ->join('company c', 'ts.companyId = c.companyId', 'LEFT')
            ->join('wechat_account wa', 'tp.wechatId = wa.wechatId', 'LEFT')
            ->join('wechat_tag wt', 'wa.wechatId = wt.wechatId', 'LEFT');

        return $query->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
    }

    /**
     * 获取客户池列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $list = $this->gePoolList();

        return ResponseHelper::success(
            [
                'list'  => $this->makeReturnedValue($list)->items(),
                'total' => $list->total(),
                'page'  => $list->currentPage(),
                'limit' => $list->listRows()
            ]
        );
    }
} 