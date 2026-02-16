<?php

namespace app\superadmin\controller\company;

use app\common\model\Company as CompanyModel;
use app\common\model\User as UserModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\Db;
use think\Validate;

/**
 * 公司控制器
 */
class DeleteCompanyController extends BaseController
{
    /**
     * 数据验证
     *
     * @param array $params
     * @return $this
     * @throws \Exception
     */
    protected function dataValidate(array $params): self
    {
        $validate = Validate::make([
            'id' => 'require|regex:/^[1-9]\d*$/',
        ], [
            'id.regex'   => '非法请求',
            'id.require' => '非法请求',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 删除项目
     *
     * @param int $id
     * @throws \Exception
     */
    protected function deleteCompany(int $id): void
    {
        $company = CompanyModel::where('id', $id)->find();

        if (!$company) {
            throw new \Exception('项目不存在', 404);
        }

        if (!$company->delete()) {
            throw new \Exception('项目删除失败', 400);
        }
    }

    /**
     * 删除用户
     *
     * @param int $companId
     * @throws \Exception
     */
    protected function deleteUsers(int $companId): void
    {
        $users = UserModel::where('companyId', $companId)->select();

        foreach ($users as $user) {
            if (!$user->delete()) {
                throw new \Exception($user->username . ' 用户删除失败', 400);
            }
        }
    }

    /**
     * 删除存客宝数据
     *
     * @param int $companId
     * @return self
     * @throws \Exception
     */
    protected function delteCkbAbout(int $companId): self
    {
        // 1. 删除项目
        $this->deleteCompany($companId);

        // 2. 删除用户
        $this->deleteUsers($companId);

        return $this;
    }

    /**
     * 删除 s2 数据
     *
     * @return void
     */
    protected function deleteS2About()
    {

    }

    /**
     * 删除项目
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->only('id');
            $companId = $params['id'];

            Db::startTrans();

            $this->dataValidate($params)->delteCkbAbout($companId)->deleteS2About($companId);

            Db::commit();
            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
}