<?php

namespace app\chukebao\controller;

use library\ResponseHelper;
use think\Db;

class AccountsController extends BaseController
{
    /**
     * 获取账号列表（过滤掉后缀为 _offline 与 _delete 的账号）
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 401);
        }

        if (empty($companyId)) {
            return ResponseHelper::error('请先登录', 401);
        }

        $page = max(1, intval($this->request->param('page', 1)));
        $limit = max(1, intval($this->request->param('limit', 10)));
        $keyword = trim((string)$this->request->param('keyword', ''));

        $query = Db::table('s2_company_account')
            ->alias('a')
            ->join('users u', 'a.id = u.s2_accountId')
            ->where([
                ['a.departmentId', '=', $companyId],
                ['a.status', '=', 0],
            ])
            ->whereNotLike('a.userName', '%_offline')
            ->whereNotLike('a.userName', '%_delete');

        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $likeKeyword = '%' . $keyword . '%';
                $subQuery->whereLike('a.userName', $likeKeyword)
                    ->whereOrLike('a.realName', $likeKeyword)
                    ->whereOrLike('a.nickname', $likeKeyword);
            });
        }

        $total = (clone $query)->count();
        $list = $query->field([
                'a.id',
                'u.id as uid',
                'a.userName',
                'a.realName',
                'a.nickname',
                'a.departmentId',
                'a.departmentName',
                'a.avatar'
            ])
            ->order('a.id', 'desc')
            ->page($page, $limit)
            ->select();



        return ResponseHelper::success([
            'total' => $total,
            'list' => $list,
        ]);
    }
}