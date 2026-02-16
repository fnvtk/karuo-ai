<?php

namespace app\superadmin\controller\company;

use app\common\model\Company as CompanyModel;
use app\common\model\Device as DeviceModel;
use app\common\model\User as usersModel;
use app\superadmin\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use library\ResponseHelper;

/**
 * 公司控制器
 */
class GetCompanyListController extends BaseController
{
    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        $where = [];

        // 如果有搜索关键词
        if (!empty($keyword = $this->request->param('keyword/s', ''))) {
            $where[] = ['name', 'like', "%{$keyword}%"];
        }

        return array_merge($params, $where);
    }

    /**
     * 获取设备统计
     *
     * @return array
     */
    protected function getDevices()
    {
        $devices = DeviceModel::field('companyId, count(id) as numCount')->group('companyId')->select();
        $devices = $devices ? $devices->toArray() : array();

        return ArrHelper::columnTokey('companyId', $devices);
    }


    /**
     * 获取项目列表
     *
     * @param array $where 查询条件
     * @param int $page 页码
     * @param int $limit 每页数量
     * @return \think\Paginator 分页对象
     */
    protected function getCompanyList(array $where): \think\Paginator
    {
        $query = CompanyModel::alias('c')
            ->field([
                'c.id', 'c.name', 'c.status', 'c.companyId', 'c.memo', 'c.createTime'
            ]);

        foreach ($where as $key => $value) {
            if (is_numeric($key) && is_array($value) && isset($value[0]) && $value[0] === 'exp') {
                $query->whereExp('', $value[1]);
                continue;
            }

            $query->where($key, $value);
        }

        return $query->order('id', 'desc')
            ->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
    }

    /**
     * 统计项目下的用户数量
     *
     * @param int $companyId
     * @return int
     */
    protected function countUserInCompany(int $companyId): int
    {
        return UsersModel::where('companyId', $companyId)->count('id');
    }

    /**
     * 构建返回数据
     *
     * @param \think\Paginator $Companylist
     * @return array
     */
    protected function makeReturnedResult(\think\Paginator $Companylist): array
    {
        $result = [];
        $devices = $this->getDevices();

        foreach ($Companylist->items() as $item) {
            $item->userCount = $this->countUserInCompany($item->companyId);
            $item->deviceCount = $devices[$item->companyId]['numCount'] ?? 0;

            array_push($result, $item->toArray());
        }

        return $result;
    }

    /**
     * 获取项目列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $where = $this->makeWhere();
        $result = $this->getCompanyList($where);

        return ResponseHelper::success(
            [
                'list'  => $this->makeReturnedResult($result),
                'total' => $result->total(),
            ]
        );
    }
} 