<?php

namespace app\api\controller;

use app\api\model\CompanyAccountModel;
use app\api\model\CompanyModel;
use Library\S2\Logics\AccountLogic;
use think\Db;
use think\facade\Request;

/**
 * 账号管理控制器
 * 包含账号管理和部门管理的相关功能
 */
class AccountController extends BaseController
{
    /************************ 账号管理相关接口 ************************/

    /**
     * 获取公司账号列表
     * @param string $pageIndex 页码
     * @param string $pageSize 每页数量
     * @param bool $isInner 是否为定时任务调用
     * @return \think\response\Json
     */
    public function getlist($data = [], $isInner = false)
    {

        $pageIndex = !empty($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = !empty($data['pageSize']) ? $data['pageSize'] : 20;
        $showNormalAccount = !empty($data['showNormalAccount']) ? $data['showNormalAccount'] : '';
        $keyword = !empty($data['keyword']) ? $data['keyword'] : '';
        $departmentId = !empty($data['departmentId']) ? $data['departmentId'] : '';

        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
            } else {
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 构建请求参数
            $params = [
                'showNormalAccount' => $showNormalAccount,
                'keyword' => $keyword,
                'departmentId' => $departmentId,
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取公司账号列表
            $result = requestCurl($this->baseUrl . 'api/Account/myTenantPageAccounts', $params, 'GET', $header);
            $response = handleApiResponse($result);

            // 保存数据到数据库
            if (!empty($response['results'])) {
                foreach ($response['results'] as $item) {
                    $this->saveAccount($item);
                }
            }

            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => '获取公司账号列表成功', 'data' => $response]);
            } else {

                return successJson($response);
            }
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取公司账号列表失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取公司账号列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 创建新账号
     * @return \think\response\Json
     */
    public function createAccount()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取并验证请求参数
            $userName = $this->request->param('userName', '');
            $password = $this->request->param('password', '');
            $realName = $this->request->param('realName', '');
            $nickname = $this->request->param('nickname', '');
            $memo = $this->request->param('memo', '');
            $departmentId = $this->request->param('departmentId', 0);


            // 参数验证
            if (empty($userName)) {
                return errorJson('用户名不能为空');
            }
            // if (!preg_match('/^[a-zA-Z][a-zA-Z0-9]{5,9}$/', $userName)) {
            //     return errorJson('用户名必须以字母开头，只能包含字母和数字，长度6-10位');
            // }
            if (empty($password)) {
                return errorJson('密码不能为空');
            }

            if (empty($realName)) {
                return errorJson('真实姓名不能为空');
            }
            if (empty($departmentId)) {
                return errorJson('公司ID不能为空');
            }

            // 检查账号是否已存在
            $existingAccount = CompanyAccountModel::where('userName', $userName)->find();
            if (!empty($existingAccount)) {
                return errorJson('账号已存在');
            }


            // 构建请求参数
            $params = [
                'userName' => $userName,
                'password' => $password,
                'realName' => $realName,
                'nickname' => $nickname,
                'memo' => $memo,
                'departmentId' => $departmentId,
                'departmentIdArr' => empty($departmentId) ? [914] : [914, $departmentId]
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求创建账号
            $result = requestCurl($this->baseUrl . 'api/account/newAccount', $params, 'POST', $header, 'json');

            if (is_numeric($result)) {
                $res = CompanyAccountModel::create([
                    'id' => $result,
                    'tenantId' => 242,
                    'userName' => $userName,
                    'realName' => $realName,
                    'nickname' => $nickname,
                    'passwordMd5' => md5($password),
                    'passwordLocal' => localEncrypt($password),
                    'memo' => $memo,
                    'accountType' => 11,
                    'departmentId' => $departmentId,
                    'createTime' => time(),
                    'privilegeIds' => json_encode([])
                ]);
                $this->setPrivileges(['id' => $result]);
                return successJson($res);
            } else {
                return errorJson($result);
            }
        } catch (\Exception $e) {
            return errorJson('创建账号失败：' . $e->getMessage());
        }
    }


    /**
     * 创建新账号（包含创建部门）
     * @return \think\response\Json
     */
    public function createNewAccount()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        DB::startTrans();
        try {
            // 获取参数
            $departmentName = $this->request->param('departmentName', '');
            $departmentMemo = $this->request->param('departmentMemo', '');
            $accountName = $this->request->param('accountName', '');
            $accountPassword = $this->request->param('accountPassword', '');
            $accountRealName = $this->request->param('accountRealName', '');
            $accountNickname = $this->request->param('accountNickname', '');
            $accountMemo = $this->request->param('accountMemo', '');

            // 验证参数
            if (empty($departmentName)) {
                return errorJson('部门名称不能为空');
            }
            if (empty($accountName)) {
                return errorJson('账号名称不能为空');
            }
            if (empty($accountPassword)) {
                return errorJson('账号密码不能为空');
            }

            // 检查部门是否已存在
            $existingDepartment = CompanyModel::where('name', $departmentName)->find();
            if (!empty($existingDepartment)) {
                return errorJson('部门以存在');
            }

            // 检查账号是否已存在
            $existingAccount = CompanyAccountModel::where('userName', $accountName)->find();
            if (!empty($existingAccount)) {
                return errorJson('账号已存在');
            }


            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 1. 创建部门
            $departmentParams = [
                'name' => $departmentName,
                'memo' => $departmentMemo,
                'departmentIdArr' => [914],
                'parentId' => 914
            ];

            $departmentResult = requestCurl($this->baseUrl . 'api/Department/createDepartment', $departmentParams, 'POST', $header, 'json');
            if (is_numeric($departmentResult)) {
                // 保存部门到数据库
                CompanyModel::create([
                    'id' => $departmentResult,
                    'name' => $departmentName,
                    'memo' => $departmentMemo,
                    'tenantId' => 242,
                    'isTop' => 0,
                    'level' => 1,
                    'parentId' => 914,
                    'privileges' => '',
                    'createTime' => time(),
                    'lastUpdateTime' => 0
                ]);

                $this->setPrivileges(['id' => $departmentResult]);

            } else {
                DB::rollback();
                return errorJson('创建部门失败：' . $departmentResult);
            }

            // 2. 创建账号
            $accountParams = [
                'userName' => $accountName,
                'password' => $accountPassword,
                'realName' => $accountRealName,
                'nickname' => $accountNickname,
                'memo' => $accountMemo,
                'departmentId' => $departmentResult,
                'departmentIdArr' => [914, $departmentResult]
            ];

            $accountResult = requestCurl($this->baseUrl . 'api/Account/newAccount', $accountParams, 'POST', $header, 'json');

            if (is_numeric($accountResult)) {
                $res = CompanyAccountModel::create([
                    'id' => $accountResult,
                    'tenantId' => 242,
                    'userName' => $accountName,
                    'realName' => $accountRealName,
                    'nickname' => $accountNickname,
                    'passwordMd5' => md5($accountPassword),
                    'passwordLocal' => localEncrypt($accountPassword),
                    'memo' => $accountMemo,
                    'accountType' => 11,
                    'departmentId' => $departmentResult,
                    'createTime' => time(),
                    'privilegeIds' => json_encode([])
                ]);
                DB::commit();
                return successJson($res, '账号创建成功');
            } else {
                // 如果创建账号失败，删除已创建的部门
                $this->deleteDepartment($accountResult);
                DB::rollback();
                return errorJson('创建账号失败：' . $accountResult);
            }

        } catch (\Exception $e) {
            DB::rollback();
            return errorJson('创建账号失败：' . $e->getMessage());
        }
    }



    /************************ 部门管理相关接口 ************************/

    /**
     * 获取部门列表
     * @return \think\response\Json
     */
    public function getDepartmentList($isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
            } else {
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取部门列表
            $url = $this->baseUrl . 'api/Department/fetchMyAndSubordinateDepartment';
            $result = requestCurl($url, [], 'GET', $header, 'json');

            // 处理返回结果
            $response = handleApiResponse($result);

            // 保存数据到数据库
            if (!empty($response)) {
                CompanyModel::where('1=1')->delete();
                $this->processDepartments($response);
            }

            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => '获取部门列表成功', 'data' => $response]);
            } else {
                return successJson($response, '获取部门列表成功');
            }
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取部门列表失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取部门列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 创建部门
     * @return \think\response\Json
     */
    public function createDepartment()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取并验证请求参数
            $name = $this->request->param('name', '');
            $memo = $this->request->param('memo', '');
            if (empty($name)) {
                return errorJson('请输入公司名称');
            }

            // 检查部门名称是否已存在
            $departmentId = CompanyModel::where('name', $name)->find();
            if (!empty($departmentId)) {
                return errorJson('部门已存在');
            }

            // 构建请求参数
            $params = [
                'name' => $name,
                'memo' => $memo,
                'departmentIdArr' => [914],
                'parentId' => 914
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求创建部门
            $result = requestCurl($this->baseUrl . 'api/Department/createDepartment', $params, 'POST', $header, 'json');

            // 处理返回结果
            if (is_numeric($result)) {
                $res = CompanyModel::create([
                    'id' => $result,
                    'name' => $name,
                    'memo' => $memo,
                    'tenantId' => 242,
                    'isTop' => 0,
                    'level' => 1,
                    'parentId' => 914,
                    'privileges' => '',
                    'createTime' => time(),
                    'lastUpdateTime' => 0
                ]);
                return successJson($res);
            } else {
                return errorJson($result);
            }
        } catch (\Exception $e) {
            return errorJson('创建部门失败：' . $e->getMessage());
        }
    }

    /**
     * 修改部门信息
     * @return \think\response\Json
     */
    public function updateDepartment()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取并验证请求参数
            $id = $this->request->param('id', 0);
            $name = $this->request->param('name', '');
            $memo = $this->request->param('memo', '');

            if (empty($id)) {
                return errorJson('部门ID不能为空');
            }
            if (empty($name)) {
                return errorJson('部门名称不能为空');
            }

            // 验证部门是否存在
            $department = CompanyModel::where('id', $id)->find();
            if (empty($department)) {
                return errorJson('部门不存在');
            }

            // 构建请求参数
            $departmentIdArr = $department->parentId == 914 ? [914] : [914, $department->parentId];
            $params = [
                'id' => $id,
                'name' => $name,
                'memo' => $memo,
                'departmentIdArr' => $departmentIdArr,
                'tenantId' => 242,
                'createTime' => $department->createTime,
                'isTop' => $department->isTop,
                'level' => $department->level,
                'parentId' => $department->parentId,
                'lastUpdateTime' => $department->lastUpdateTime,
                'privileges' => $department->privileges
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求修改部门
            $result = requestCurl($this->baseUrl . 'api/Department/department', $params, 'PUT', $header, 'json');
            $response = handleApiResponse($result);

            // 更新本地数据库
            $department->name = $name;
            $department->memo = $memo;
            $department->save();

            return successJson([], '部门修改成功');
        } catch (\Exception $e) {
            return errorJson('修改部门失败：' . $e->getMessage());
        }
    }

    /**
     * 删除部门
     * @return \think\response\Json
     */
    public function deleteDepartment($id = '')
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取并验证部门ID
            $id = !empty($id) ? $id : $this->request->param('id', '');
            if (empty($id)) {
                return errorJson('部门ID不能为空');
            }

            // 验证部门是否存在
            $department = CompanyModel::where('id', $id)->find();
            if (empty($department)) {
                return errorJson('部门不存在');
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送删除请求
            $result = requestCurl($this->baseUrl . 'api/Department/del/' . $id, [], 'DELETE', $header);

            if ($result) {
                return errorJson($result);
            } else {
                // 删除本地数据库记录
                $department->delete();
                return successJson([], '部门删除成功');
            }


        } catch (\Exception $e) {
            return errorJson('删除部门失败：' . $e->getMessage());
        }
    }

     /**
     * 修改部门权限
     * @return \think\response\Json
     */
    public function setPrivileges($data = [])
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取并验证请求参数
            $id = !empty($data['id']) ? $data['id'] : $this->request->param('id', 0);
            if (empty($id)) {
                return errorJson('部门ID不能为空');
            }
       
            $privilegeIds = !empty($data['privilegeIds']) ? $data['privilegeIds'] : '1001,1002,1004,1023,1406,20003,20021,20022,20023,20032,20041,20049,20054,20055,20060,20100,20102,20107';
            $privilegeIds = explode(',',$privilegeIds);

            // 验证部门是否存在
            $department = CompanyModel::where('id', $id)->find();
            if (empty($department)) {
                return errorJson('部门不存在');
            }
            
           

            // 构建请求参数
            $params = [
                'departmentId' => $id,
                'privilegeIds' => $privilegeIds,
                'syncPrivilege' => true
            ];


            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求修改部门
            $result = requestCurl($this->baseUrl . 'api/Department/privileges', $params, 'PUT', $header, 'json');
            $response = handleApiResponse($result);


            return successJson([], '部门权限修改成功');
        } catch (\Exception $e) {
            return errorJson('修改部门权限失败：' . $e->getMessage());
        }
    }



    public function accountModify($data = [])
    {
        // 获取授权token
        $authorization =  $this->authorization;
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }


        $id = !empty($data['id']) ? $data['id'] : '';
        if (empty($id)) {
            return errorJson('账号ID不能为空');
        }

        $account = CompanyAccountModel::where('id', $id)->find();



        if (empty($account)) {
            return errorJson('账号不存在');
        }
        $privilegeIds = json_decode($account->privilegeIds,true);
        $privilegeIds = !empty($privilegeIds) ? $privilegeIds : [1001,1002,1004,1023,1406,20003,20021,20022,20023,20032,20041,20049,20054,20055,20060,20100,20102,20107,20055];

        // 构建请求参数
        $params = [
            'accountType' => !empty($data['accountType']) ? $data['accountType'] : $account->accountType,
            'alive' => !empty($data['alive']) ? $data['alive'] : $account->alive,
            'avatar' => !empty($data['avatar']) ? $data['avatar'] : $account->avatar,
            'createTime' => !empty($data['createTime']) ? $data['createTime'] : $account->createTime,
            'creator' => !empty($data['creator']) ? $data['creator'] : $account->creator,
            'creatorRealName' => !empty($data['creatorRealName']) ? $data['creatorRealName'] : $account->creatorRealName,
            'creatorUserName' => !empty($data['creatorUserName']) ? $data['creatorUserName'] : $account->creatorUserName,
            'departmentId' => !empty($data['departmentId']) ? $data['departmentId'] : $account->departmentId,
            'departmentIdArr' => !empty($data['departmentIdArr']) ? $data['departmentIdArr'] : [914,$account->departmentId],
            'departmentName' => !empty($data['departmentName']) ? $data['departmentName'] : $account->departmentName,
            'hasXiakeAccount' => !empty($data['hasXiakeAccount']) ? $data['hasXiakeAccount'] : false,
            'id' => !empty($data['id']) ? $data['id'] : $account->id,
            'memo' => !empty($data['memo']) ? $data['memo'] : $account->memo,
            'nickname' => !empty($data['nickname']) ? $data['nickname'] : $account->nickname,
            'privilegeIds' => !empty($data['privilegeIds']) ? $data['privilegeIds'] : $privilegeIds,
            'realName' => !empty($data['realName']) ? $data['realName'] : $account->realName,
            'status' => !empty($data['status']) ? $data['status'] : $account->status,
            'tenantId' => !empty($data['tenantId']) ? $data['tenantId'] : $account->tenantId,
            'userName' => !empty($data['userName']) ? $data['userName'] : $account->userName,
        ];
         // 设置请求头
        $headerData = ['client:system'];
        $header = setHeader($headerData, $authorization, 'json');

        // 发送请求修改部门
        $result = requestCurl($this->baseUrl . 'api/account/modify', $params, 'PUT', $header, 'json');
        $response = handleApiResponse($result);


        if(empty($response)){
            $newData = [
                'nickname' => $params['nickname'],
                'avatar' => $params['avatar'],
            ];
            CompanyAccountModel::where('id', $id)->update($newData);
            return json_encode(['code' => 200, 'msg' => '账号修改成功']);
        }else{
            return json_encode(['code' => 500, 'msg' => $response]);
        }
    }






    /************************ 私有辅助方法 ************************/

    /**
     * 递归处理部门列表
     * @param array $departments 部门数据
     */
    private function processDepartments($departments)
    {
        if (empty($departments) || !is_array($departments)) {
            return;
        }

        foreach ($departments as $item) {
            // 保存当前部门
            $this->saveDepartment($item);

            // 递归处理子部门
            if (!empty($item['children']) && is_array($item['children'])) {
                $this->processDepartments($item['children']);
            }
        }
    }

    /**
     * 保存部门数据到数据库
     * @param array $item 部门数据
     */
    private function saveDepartment($item)
    {
        $data = [
            'id' => isset($item['id']) ? $item['id'] : 0,
            'name' => isset($item['name']) ? $item['name'] : '',
            'memo' => isset($item['memo']) ? $item['memo'] : '',
            'level' => isset($item['level']) ? $item['level'] : 0,
            'isTop' => isset($item['isTop']) ? $item['isTop'] : false,
            'parentId' => isset($item['parentId']) ? $item['parentId'] : 0,
            'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
            'privileges' => isset($item['privileges']) ? (is_array($item['privileges']) ? json_encode($item['privileges']) : $item['privileges']) : '',
            'createTime' => isset($item['createTime']) ? strtotime($item['createTime']) : 0,
            'lastUpdateTime' => isset($item['lastUpdateTime']) ? ($item['lastUpdateTime'] == '0001-01-01T00:00:00' ? 0 : strtotime($item['lastUpdateTime'])) : 0
        ];

        // 使用id作为唯一性判断
        $department = CompanyModel::where('id', $item['id'])->find();
        if ($department) {
            $department->save($data);
        } else {
            CompanyModel::create($data);
        }
    }

    /**
     * 保存账号数据到数据库
     * @param array $item 账号数据
     */
    private function saveAccount($item)
    {
        // 将日期时间字符串转换为时间戳
        $createTime = isset($item['createTime']) ? strtotime($item['createTime']) : null;
        $deleteTime = isset($item['deleteTime']) ? strtotime($item['deleteTime']) : null;

        $data = [
            'id' => $item['id'],
            'accountType' => isset($item['accountType']) ? $item['accountType'] : 0,
            'status' => isset($item['status']) ? $item['status'] : 0,
            'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
            'userName' => isset($item['userName']) ? $item['userName'] : '',
            'realName' => isset($item['realName']) ? $item['realName'] : '',
            'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
            'avatar' => isset($item['avatar']) ? $item['avatar'] : '',
            'phone' => isset($item['phone']) ? $item['phone'] : '',
            'memo' => isset($item['memo']) ? $item['memo'] : '',
            'createTime' => $createTime,
            'creator' => isset($item['creator']) ? $item['creator'] : 0,
            'creatorUserName' => isset($item['creatorUserName']) ? $item['creatorUserName'] : '',
            'creatorRealName' => isset($item['creatorRealName']) ? $item['creatorRealName'] : '',
            'departmentId' => isset($item['departmentId']) ? $item['departmentId'] : 0,
            'departmentName' => isset($item['departmentName']) ? $item['departmentName'] : '',
            'privilegeIds' => isset($item['privilegeIds']) ? json_encode($item['privilegeIds']) : json_encode([]),
            'alive' => isset($item['alive']) ? $item['alive'] : false,
            'hasXiakeAccount' => isset($item['hasXiakeAccount']) ? $item['hasXiakeAccount'] : false,
            'isDeleted' => isset($item['isDeleted']) ? $item['isDeleted'] : false,
            'deleteTime' => $deleteTime
        ];

        // 使用tenantId作为唯一性判断
        $account = CompanyAccountModel::where('id', $item['id'])->find();
        if ($account) {
            $account->save($data);
        } else {
            CompanyAccountModel::create($data);
        }
    }
} 