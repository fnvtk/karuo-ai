<?php

namespace app\cunkebao\controller;

use app\ai\controller\CozeAI;
use app\api\model\CompanyModel;
use app\chukebao\model\AiSettings as AiSettingsModel;
use library\ResponseHelper;

/**
 * AI设置控制器
 * 负责管理公司的AI智能体配置，包括创建智能体、知识库等
 */
class AiSettingsController extends BaseController
{
    /**
     * 初始化AI设置
     * 检查公司是否已有AI配置，如果没有则创建默认配置
     * 自动创建智能体和知识库
     *
     * @return \think\response\Json
     */
    public function init()
    {
        try {
            // 获取当前用户信息
            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');

            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 查找公司AI设置
            $settings = $this->getOrCreateAiSettings($companyId, $userId);

            if (!$settings) {
                return ResponseHelper::error('AI设置初始化失败');
            }

            // 确保智能体已创建
            if (empty($settings->botId)) {
                $settings->releaseTime = 0;
                $botCreated = $this->createBot($settings);
                if (!$botCreated) {
                    return ResponseHelper::error('智能体创建失败');
                }
            }

            // 确保知识库已创建
            if (empty($settings->datasetId)) {
                $settings->releaseTime = 0;
                $knowledgeCreated = $this->createKnowledge($settings);
                if (!$knowledgeCreated) {
                    return ResponseHelper::error('知识库创建失败');
                }
            }
            if (!empty($settings->botId) && !empty($settings->datasetId) && $settings->releaseTime <= 0) {
                $cozeAI = new CozeAI();
                $config = json_decode($settings->config,true);
                $config['bot_id'] = $settings->botId;
                $config['dataset_ids'] = [$settings->datasetId];
                $cozeAI->updateBot($config);
            }

            // 解析配置信息
            $settings->config = json_decode($settings->config, true);

            return ResponseHelper::success($settings, 'AI设置初始化成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 获取或创建AI设置
     *
     * @param int $companyId 公司ID
     * @param int $userId 用户ID
     * @return AiSettingsModel|false
     */
    private function getOrCreateAiSettings($companyId, $userId)
    {
        // 查找现有设置
        $settings = AiSettingsModel::where(['companyId' => $companyId])->find();

        if (empty($settings)) {
            // 获取公司信息
            $company = CompanyModel::where('id', $companyId)->find();
            if (empty($company)) {
                return false;
            }

            // 创建默认配置
            $config = $this->getDefaultConfig($company['name']);

            // 保存AI设置
            $settings = $this->saveAiSettings($companyId, $userId, $config);
        }

        return $settings;
    }

    /**
     * 获取默认AI配置
     *
     * @param string $companyName 公司名称
     * @return array
     */
    private function getDefaultConfig($companyName)
    {
        return [
            'name' => $companyName,
            'model_id' => '1737521813', // 默认模型ID
            'prompt_info' => $this->getDefaultPrompt()
        ];
    }

    /**
     * 获取默认提示词
     *
     * @return string
     */
    private function getDefaultPrompt()
    {
        return '# 角色
你是一位全能知识客服，作为专业的客服智能体，具备全面的知识储备，能够回答用户提出的各类问题。在回答问题前，会仔细查阅知识库内容，并且始终严格遵守中国法律法规。

## 技能
### 技能 1: 回答用户问题
1. 当用户提出问题时，首先在知识库中进行搜索查找相关信息。
2. 依据知识库中的内容，为用户提供准确、清晰、完整的回答。
                
## 限制
- 仅依据知识库内容回答问题，对于知识库中没有的信息，如实告知用户无法回答。
- 回答必须严格遵循中国法律法规，不得出现任何违法违规内容。
- 回答需简洁明了，避免冗长复杂的表述（尽量在100字内）。
- 适当加些表情点缀。';
    }

    /**
     * 保存AI设置到数据库
     *
     * @param int $companyId 公司ID
     * @param int $userId 用户ID
     * @param array $config 配置信息
     * @return AiSettingsModel|false
     */
    private function saveAiSettings($companyId, $userId, $config)
    {
        $data = [
            'companyId' => $companyId,
            'userId' => $userId,
            'config' => json_encode($config, JSON_UNESCAPED_UNICODE),
            'createTime' => time(),
            'updateTime' => time(),
            'botId' => 0,
            'datasetId' => 0,
        ];

        $aiSettingsModel = new AiSettingsModel();
        $result = $aiSettingsModel->save($data);

        if ($result) {
            return AiSettingsModel::where(['companyId' => $companyId])->find();
        }

        return false;
    }

    /**
     * 创建AI智能体
     *
     * @param AiSettingsModel $settings AI设置对象
     * @return bool
     */
    private function createBot($settings)
    {
        if (empty($settings)) {
            return false;
        }

        try {
            $config = json_decode($settings->config, true);
            if (empty($config)) {
                return false;
            }

            // 调用CozeAI创建智能体
            $cozeAI = new CozeAI();
            $result = $cozeAI->createBot($config);
            $result = json_decode($result, true);

            if ($result['code'] != 200) {
                \think\facade\Log::error('智能体创建失败：' . ($result['msg'] ?? '未知错误'));
                return false;
            }

            // 更新智能体ID
            $settings->botId = $result['data']['bot_id'];
            $settings->updateTime = time();

            return $settings->save();

        } catch (\Exception $e) {
            \think\facade\Log::error('创建智能体异常：' . $e->getMessage());
            return false;
        }
    }

    /**
     * 创建知识库
     *
     * @param AiSettingsModel $settings AI设置对象
     * @return bool
     */
    private function createKnowledge($settings)
    {
        if (empty($settings)) {
            return false;
        }

        try {
            $config = json_decode($settings->config, true);
            if (empty($config)) {
                return false;
            }

            // 调用CozeAI创建知识库
            $cozeAI = new CozeAI();
            $result = $cozeAI->createKnowledge(['name' => $config['name']]);
            $result = json_decode($result, true);

            if ($result['code'] != 200) {
                \think\facade\Log::error('知识库创建失败：' . ($result['msg'] ?? '未知错误'));
                return false;
            }

            // 更新知识库ID
            $settings->datasetId = $result['data']['dataset_id'];
            $settings->updateTime = time();

            return $settings->save();

        } catch (\Exception $e) {
            \think\facade\Log::error('创建知识库异常：' . $e->getMessage());
            return false;
        }
    }

    /**
     * 更新AI配置
     *
     * @return \think\response\Json
     */
    public function updateConfig()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取请求参数
            $config = $this->request->param('config', []);
            if (empty($config)) {
                return ResponseHelper::error('配置参数不能为空');
            }

            // 查找现有设置
            $settings = AiSettingsModel::where(['companyId' => $companyId])->find();
            if (empty($settings)) {
                return ResponseHelper::error('AI设置不存在，请先初始化');
            }

            // 更新配置
            $settings->config = json_encode($config, JSON_UNESCAPED_UNICODE);
            $settings->updateTime = time();

            if ($settings->save()) {
                return ResponseHelper::success([], '配置更新成功');
            } else {
                return ResponseHelper::error('配置更新失败');
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 获取AI设置详情
     *
     * @return \think\response\Json
     */
    public function getSettings()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            $settings = AiSettingsModel::where(['companyId' => $companyId])->find();
            if (empty($settings)) {
                return ResponseHelper::error('AI设置不存在');
            }

            // 解析配置信息
            $settings->config = json_decode($settings->config, true);

            return ResponseHelper::success($settings, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }


    /**
     * 发布智能体
     * @return \think\response\Json
     * @throws \Exception
     */
    public function release()
    {
        $companyId = $this->getUserInfo('companyId');
        $settings = AiSettingsModel::where(['companyId' => $companyId])->find();
        if (!empty($settings->isRelease)) {
            return ResponseHelper::success('', '已发布，无需重复发布');
        }

        $cozeAI = new CozeAI();
        $res = $cozeAI->botPublish(['bot_id' => $settings->botId]);
        $res = json_decode($res, true);

        if ($res['code'] != 200) {
            $msg = '发布失败失败：' . ($res['msg'] ?? '未知错误');
            return ResponseHelper::error($msg);
        }
        $settings->isRelease = 1;
        $settings->releaseTime = time();
        $settings->save();
        return ResponseHelper::success('', '发布成功');
    }

    /**
     * 保存统一提示词
     * 先更新数据库，再调用CozeAI接口更新智能体
     *
     * @return \think\response\Json
     */
    public function savePrompt()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取提示词参数
            $promptInfo = $this->request->param('promptInfo', '');
            if (empty($promptInfo)) {
                return ResponseHelper::error('提示词内容不能为空');
            }

            // 查找AI设置
            $settings = AiSettingsModel::where(['companyId' => $companyId])->find();
            if (empty($settings)) {
                return ResponseHelper::error('AI设置不存在，请先初始化');
            }

            // 检查智能体是否已创建
            if (empty($settings->botId)) {
                return ResponseHelper::error('智能体未创建，请先初始化AI设置');
            }

            // 解析现有配置
            $config = json_decode($settings->config, true);
            if (!is_array($config)) {
                $config = [];
            }

            // 更新提示词
            $config['prompt_info'] = $promptInfo;

            // 第一步：更新数据库
            $settings->config = json_encode($config, JSON_UNESCAPED_UNICODE);
            $settings->isRelease = 0; // 标记为未发布状态
            $settings->updateTime = time();

            if (!$settings->save()) {
                return ResponseHelper::error('数据库更新失败');
            }

            // 第二步：调用CozeAI接口更新智能体
            try {
                $cozeAI = new CozeAI();
                
                // 参考 init 方法的参数格式，传递完整的 config
                $updateData = $config;
                $updateData['bot_id'] = $settings->botId;
                
                // 如果有知识库，也一并传入
                if (!empty($settings->datasetId)) {
                    $updateData['dataset_ids'] = [$settings->datasetId];
                }

                $result = $cozeAI->updateBot($updateData);
                $result = json_decode($result, true);

                if ($result['code'] != 200) {
                    \think\facade\Log::error('更新智能体提示词失败：' . json_encode($result));
                    return ResponseHelper::error('更新智能体失败：' . ($result['msg'] ?? '未知错误'));
                }

                return ResponseHelper::success([
                    'prompt_info' => $promptInfo,
                    'isRelease' => 0
                ], '提示词保存成功，请重新发布智能体');

            } catch (\Exception $e) {
                \think\facade\Log::error('调用CozeAI更新接口异常：' . $e->getMessage());
                return ResponseHelper::error('更新智能体接口调用失败：' . $e->getMessage());
            }

        } catch (\Exception $e) {
            \think\facade\Log::error('保存提示词异常：' . $e->getMessage());
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }
}