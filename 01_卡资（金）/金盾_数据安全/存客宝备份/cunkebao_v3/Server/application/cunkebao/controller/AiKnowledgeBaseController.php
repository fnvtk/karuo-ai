<?php

namespace app\cunkebao\controller;

use app\ai\controller\CozeAI;
use app\chukebao\model\AiKnowledgeBaseType;
use app\chukebao\model\AiKnowledgeBase;
use app\chukebao\model\AiSettings as AiSettingsModel;
use library\ResponseHelper;

/**
 * AI知识库管理控制器
 * 负责管理AI知识库类型和知识库内容
 */
class AiKnowledgeBaseController extends BaseController
{
    // ==================== 知识库类型管理 ====================

    /**
     * 获取知识库类型列表
     *
     * @return \think\response\Json
     */
    public function typeList()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取分页参数
            $page = $this->request->param('page', 1);
            $pageSize = $this->request->param('pageSize', 20);
            $includeSystem = $this->request->param('includeSystem', 1); // 是否包含系统类型

            // 构建查询条件
            $where = [['isDel', '=', 0]];

            if ($includeSystem == 1) {
                // 包含系统类型和本公司创建的类型
                $where[] = ['companyId', 'in', [$companyId, 0]];
            } else {
                // 只显示本公司创建的类型
                $where[] = ['companyId', '=', $companyId];
                $where[] = ['type', '=', AiKnowledgeBaseType::TYPE_USER];
            }
            
            // 统计开启的类型总数
            $enabledCountWhere = $where;
            $enabledCountWhere[] = ['status', '=', 1];
            $enabledCount = AiKnowledgeBaseType::where($enabledCountWhere)->count();
            
            // 查询数据
            $list = AiKnowledgeBaseType::where($where)
                ->order('type', 'asc') // 系统类型排在前面
                ->order('createTime', 'desc')
                ->paginate($pageSize, false, ['page' => $page]);

            // 为每个类型添加素材数量统计
            $listData = $list->toArray();
            foreach ($listData['data'] as &$item) {
                // 统计该类型下的知识库数量（素材数量）
                $item['materialCount'] = AiKnowledgeBase::where([
                    ['typeId', '=', $item['id']],
                    ['isDel', '=', 0]
                ])->count();
            }
            
            // 重新构造返回数据
            $result = [
                'total' => $listData['total'],
                'data' => $listData['data'],
                'enabledCount' => $enabledCount, // 开启的类型总数
            ];

            return ResponseHelper::success($result, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 添加知识库类型
     *
     * @return \think\response\Json
     */
    public function addType()
    {
        try {
            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');

            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $name = $this->request->param('name', '');
            $description = $this->request->param('description', '');
            $label = $this->request->param('label', []);
            $prompt = $this->request->param('prompt', '');
            $status = $this->request->param('status', 1); // 默认启用

            // 参数验证
            if (empty($name)) {
                return ResponseHelper::error('类型名称不能为空');
            }

            // 检查名称是否重复
            $exists = AiKnowledgeBaseType::where([
                ['companyId', '=', $companyId],
                ['name', '=', $name],
                ['isDel', '=', 0]
            ])->find();

            if ($exists) {
                return ResponseHelper::error('该类型名称已存在');
            }

            // 创建类型
            $typeModel = new AiKnowledgeBaseType();
            $data = [
                'type' => AiKnowledgeBaseType::TYPE_USER,
                'name' => $name,
                'description' => $description,
                'label' => json_encode($label,256),
                'prompt' => $prompt,
                'status' => $status,
                'companyId' => $companyId,
                'userId' => $userId,
                'createTime' => time(),
                'updateTime' => time(),
                'isDel' => 0
            ];

            if ($typeModel->save($data)) {
                return ResponseHelper::success(['id' => $typeModel->id], '添加成功');
            } else {
                return ResponseHelper::error('添加失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 编辑知识库类型
     *
     * @return \think\response\Json
     */
    public function editType()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);
            $name = $this->request->param('name', '');
            $description = $this->request->param('description', '');
            $label = $this->request->param('label', []);
            $prompt = $this->request->param('prompt', '');
            $status = $this->request->param('status', '');

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('类型ID不能为空');
            }

            if (empty($name)) {
                return ResponseHelper::error('类型名称不能为空');
            }

            // 查找类型
            $typeModel = AiKnowledgeBaseType::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeModel) {
                return ResponseHelper::error('类型不存在');
            }

            // 检查是否为系统类型
            if ($typeModel->isSystemType()) {
                return ResponseHelper::error('系统类型不允许编辑');
            }

            // 检查权限（只能编辑本公司的类型）
            if ($typeModel->companyId != $companyId) {
                return ResponseHelper::error('无权限编辑该类型');
            }

            // 检查名称是否重复（排除自己）
            $exists = AiKnowledgeBaseType::where([
                ['companyId', '=', $companyId],
                ['name', '=', $name],
                ['id', '<>', $id],
                ['isDel', '=', 0]
            ])->find();

            if ($exists) {
                return ResponseHelper::error('该类型名称已存在');
            }

            // 更新数据
            $typeModel->name = $name;
            $typeModel->description = $description;
            $typeModel->label = json_encode($label,256);
            $typeModel->prompt = $prompt;
            if ($status !== '') {
                $typeModel->status = $status;
            }
            $typeModel->updateTime = time();

            if ($typeModel->save()) {
                return ResponseHelper::success([], '更新成功');
            } else {
                return ResponseHelper::error('更新失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 修改知识库类型状态
     *
     * @return \think\response\Json
     */
    public function updateTypeStatus()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);
            $status = $this->request->param('status', -1);

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('类型ID不能为空');
            }

            if ($status != 0 && $status != 1) {
                return ResponseHelper::error('状态参数错误');
            }

            // 查找类型
            $typeModel = AiKnowledgeBaseType::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeModel) {
                return ResponseHelper::error('类型不存在');
            }

            // 检查是否为系统类型
            if ($typeModel->isSystemType()) {
                return ResponseHelper::error('系统类型不允许修改状态');
            }

            // 检查权限（只能修改本公司的类型）
            if ($typeModel->companyId != $companyId) {
                return ResponseHelper::error('无权限修改该类型');
            }

            // 更新状态
            $typeModel->status = $status;
            $typeModel->updateTime = time();

            if ($typeModel->save()) {
                $message = $status == 0 ? '禁用成功' : '启用成功';
                return ResponseHelper::success([], $message);
            } else {
                return ResponseHelper::error('操作失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 获取知识库类型详情
     *
     * @return \think\response\Json
     */
    public function detailType()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('类型ID不能为空');
            }

            // 查找类型
            $typeModel = AiKnowledgeBaseType::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeModel) {
                return ResponseHelper::error('类型不存在');
            }

            // 检查权限（系统类型或本公司的类型都可以查看）
            if ($typeModel->companyId != 0 && $typeModel->companyId != $companyId) {
                return ResponseHelper::error('无权限查看该类型');
            }

            return ResponseHelper::success($typeModel, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 删除知识库类型
     *
     * @return \think\response\Json
     */
    public function deleteType()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('类型ID不能为空');
            }

            // 查找类型
            $typeModel = AiKnowledgeBaseType::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeModel) {
                return ResponseHelper::error('类型不存在');
            }

            // 检查是否为系统类型
            if ($typeModel->isSystemType()) {
                return ResponseHelper::error('系统类型不允许删除');
            }

            // 检查权限（只能删除本公司的类型）
            if ($typeModel->companyId != $companyId) {
                return ResponseHelper::error('无权限删除该类型');
            }

            // 检查是否有关联的知识库
            $hasKnowledge = AiKnowledgeBase::where([
                ['typeId', '=', $id],
                ['isDel', '=', 0]
            ])->count();

            if ($hasKnowledge > 0) {
                return ResponseHelper::error('该类型下存在知识库，无法删除');
            }

            // 软删除
            $typeModel->isDel = 1;
            $typeModel->delTime = time();

            if ($typeModel->save()) {
                return ResponseHelper::success([], '删除成功');
            } else {
                return ResponseHelper::error('删除失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    // ==================== 知识库管理 ====================

    /**
     * 获取知识库列表
     *
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取分页参数
            $page = $this->request->param('page', 1);
            $pageSize = $this->request->param('pageSize', 20);
            $typeId = $this->request->param('typeId', 0); // 类型筛选
            $keyword = $this->request->param('keyword', ''); // 关键词搜索

            // 构建查询条件
            $where = [
                ['isDel', '=', 0],
                ['companyId', '=', $companyId]
            ];

            if ($typeId > 0) {
                $where[] = ['typeId', '=', $typeId];
            }

            if (!empty($keyword)) {
                $where[] = ['name', 'like', '%' . $keyword . '%'];
            }

            // 查询数据
            $list = AiKnowledgeBase::where($where)
                ->with(['type'])
                ->order('createTime', 'desc')
                ->paginate($pageSize, false, ['page' => $page]);

            foreach ($list as &$v){
                $v['size'] = 0;
            }
            unset($v);

            return ResponseHelper::success($list, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 添加知识库
     *
     * @return \think\response\Json
     */
    public function add()
    {
        try {
            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');

            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            $datasetId = AiSettingsModel::where(['companyId' => $companyId])->value('datasetId');


            // 获取参数
            $typeId = $this->request->param('typeId', 0);
            $name = $this->request->param('name', '');
            $label = $this->request->param('label', []);
            $fileUrl = $this->request->param('fileUrl', '');

            // 参数验证
            if (empty($typeId)) {
                return ResponseHelper::error('请选择知识库类型');
            }

            if (empty($name)) {
                return ResponseHelper::error('知识库名称不能为空');
            }

            if (empty($fileUrl)) {
                return ResponseHelper::error('文件地址不能为空');
            }

            // 检查类型是否存在
            $typeExists = AiKnowledgeBaseType::where([
                ['id', '=', $typeId],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeExists) {
                return ResponseHelper::error('知识库类型不存在');
            }

            // 创建知识库
            $knowledgeModel = new AiKnowledgeBase();
            $data = [
                'typeId' => $typeId,
                'name' => $name,
                'label' => json_encode($label, 256),
                'fileUrl' => $fileUrl,
                'companyId' => $companyId,
                'userId' => $userId,
                'createTime' => time(),
                'updateTime' => time(),
                'isDel' => 0
            ];

            if ($knowledgeModel->save($data)) {
                if (!empty($datasetId)) {
                    $createDocumentData = [
                        'filePath' => $fileUrl,
                        'fileName' => $name,
                        'dataset_id' => $datasetId
                    ];
                    $cozeAI = new CozeAI();
                    $result = $cozeAI->createDocument($createDocumentData);
                    $result = json_decode($result, true);
                    if ($result['code'] == 200) {
                        $documentId = $result['data'][0]['document_id'];
                        AiKnowledgeBase::where('id', $knowledgeModel->id)->update(['documentId' => $documentId, 'updateTime' => time()]);
                        AiSettingsModel::where(['companyId' => $companyId])->update(['isRelease' => 0,'updateTime' => time()]);
                    }
                }
                return ResponseHelper::success(['id' => $knowledgeModel->id], '添加成功');
            } else {
                return ResponseHelper::error('添加失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 编辑知识库
     *
     * @return \think\response\Json
     */
    public function edit()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);
            $typeId = $this->request->param('typeId', 0);
            $name = $this->request->param('name', '');
            $label = $this->request->param('label', []);
            $fileUrl = $this->request->param('fileUrl', '');

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('知识库ID不能为空');
            }

            if (empty($typeId)) {
                return ResponseHelper::error('请选择知识库类型');
            }

            if (empty($name)) {
                return ResponseHelper::error('知识库名称不能为空');
            }

            // 查找知识库
            $knowledgeModel = AiKnowledgeBase::where([
                ['id', '=', $id],
                ['companyId', '=', $companyId],
                ['isDel', '=', 0]
            ])->find();

            if (!$knowledgeModel) {
                return ResponseHelper::error('知识库不存在或无权限编辑');
            }

            // 检查类型是否存在
            $typeExists = AiKnowledgeBaseType::where([
                ['id', '=', $typeId],
                ['isDel', '=', 0]
            ])->find();

            if (!$typeExists) {
                return ResponseHelper::error('知识库类型不存在');
            }

            // 更新数据
            $knowledgeModel->typeId = $typeId;
            $knowledgeModel->name = $name;
            $knowledgeModel->label = json_encode($label, 256);
            if (!empty($fileUrl)) {
                $knowledgeModel->fileUrl = $fileUrl;
            }
            $knowledgeModel->updateTime = time();

            if ($knowledgeModel->save()) {
                return ResponseHelper::success([], '更新成功');
            } else {
                return ResponseHelper::error('更新失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 删除知识库
     *
     * @return \think\response\Json
     */
    public function delete()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('知识库ID不能为空');
            }

            // 查找知识库
            $knowledgeModel = AiKnowledgeBase::where([
                ['id', '=', $id],
                ['companyId', '=', $companyId],
                ['isDel', '=', 0]
            ])->find();

            if (!$knowledgeModel) {
                return ResponseHelper::error('知识库不存在或无权限删除');
            }

            // 软删除
            $knowledgeModel->isDel = 1;
            $knowledgeModel->delTime = time();

            if ($knowledgeModel->save()) {
                if (!empty($knowledgeModel->documentId)){
                    $cozeAI = new CozeAI();
                    $cozeAI->deleteDocument([$knowledgeModel->documentId]);
                    AiSettingsModel::where(['companyId' => $companyId])->update(['isRelease' => 0,'updateTime' => time()]);
                }
                return ResponseHelper::success([], '删除成功');
            } else {
                return ResponseHelper::error('删除失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 获取知识库详情
     *
     * @return \think\response\Json
     */
    public function detail()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取参数
            $id = $this->request->param('id', 0);

            // 参数验证
            if (empty($id)) {
                return ResponseHelper::error('知识库ID不能为空');
            }

            // 查找知识库
            $knowledge = AiKnowledgeBase::where([
                ['id', '=', $id],
                ['companyId', '=', $companyId],
                ['isDel', '=', 0]
            ])->with(['type'])->find();

            if (!$knowledge) {
                return ResponseHelper::error('知识库不存在或无权限查看');
            }

            return ResponseHelper::success($knowledge, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }
}