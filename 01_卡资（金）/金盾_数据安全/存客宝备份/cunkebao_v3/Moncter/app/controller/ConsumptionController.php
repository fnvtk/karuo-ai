<?php

namespace app\controller;

use app\repository\ConsumptionRecordRepository;
use app\repository\UserProfileRepository;
use app\service\ConsumptionService;
use app\utils\ApiResponseHelper;
use app\utils\LoggerHelper;
use support\Request;
use support\Response;

class ConsumptionController
{

    /**
     * 创建消费记录
     *
     * POST /api/consumption/record
     */
    public function store(Request $request): Response
    {
        $startTime = microtime(true);
        
        try {
            // 记录请求日志
            LoggerHelper::logRequest('POST', '/api/consumption/record', [
                'ip' => $request->getRealIp(),
                'user_agent' => $request->header('user-agent'),
            ]);

            // 获取 JSON 请求体
            $rawBody = $request->rawBody();
            
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }
            
            $payload = json_decode($rawBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponseHelper::error('JSON 格式错误: ' . json_last_error_msg(), 400);
            }

            // 验证用户标识：必须提供 user_id、phone_number 或 id_card 之一
            // 注意：如果手机号和身份证号都为空（但提供了user_id），仍然可以处理
            $phoneNumber = trim($payload['phone_number'] ?? '');
            $idCard = trim($payload['id_card'] ?? '');
            if (empty($payload['user_id']) && empty($phoneNumber) && empty($idCard)) {
                throw new \InvalidArgumentException('缺少用户标识：必须提供 user_id、phone_number 或 id_card 之一');
            }

            // 简单手动组装 Service 依赖，后续可接入容器配置
            $tagService = new \app\service\TagService(
                new \app\repository\TagDefinitionRepository(),
                new \app\repository\UserProfileRepository(),
                new \app\repository\UserTagRepository(),
                new \app\repository\TagHistoryRepository(),
                new \app\service\TagRuleEngine\SimpleRuleEngine()
            );
            
            $identifierService = new \app\service\IdentifierService(
                new UserProfileRepository(),
                new \app\service\UserPhoneService(
                    new \app\repository\UserPhoneRelationRepository()
                )
            );
            
            $service = new ConsumptionService(
                new ConsumptionRecordRepository(),
                new UserProfileRepository(),
                $identifierService,
                $tagService
            );

            $result = $service->createRecord($payload);
            
            // 如果返回 null，说明手机号和身份证号都为空，跳过该记录
            if ($result === null) {
                LoggerHelper::logBusiness('consumption_record_skipped_no_identifier', [
                    'reason' => 'phone_number and id_card are both empty',
                    'consume_time' => $payload['consume_time'] ?? null,
                ]);
                return ApiResponseHelper::error('记录已跳过：手机号和身份证号都为空', 400, 400);
            }

            // 记录业务日志
            LoggerHelper::logBusiness('consumption_record_created', [
                'user_id' => $result['user_id'] ?? null,
                'record_id' => $result['record_id'] ?? null,
                'amount' => $payload['amount'] ?? null,
                'phone_number' => $payload['phone_number'] ?? null,
                'id_card_provided' => !empty($payload['id_card']),
            ]);

            $duration = microtime(true) - $startTime;
            LoggerHelper::logPerformance('consumption_record_create', $duration, [
                'user_id' => $result['user_id'] ?? null,
            ]);

            return ApiResponseHelper::success($result);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
}


