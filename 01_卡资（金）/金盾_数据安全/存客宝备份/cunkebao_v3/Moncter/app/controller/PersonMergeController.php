<?php

namespace app\controller;

use app\service\PersonMergeService;
use app\service\IdentifierService;
use app\repository\UserProfileRepository;
use app\repository\UserTagRepository;
use app\repository\UserPhoneRelationRepository;
use app\service\UserPhoneService;
use app\service\TagService;
use app\repository\TagDefinitionRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\ApiResponseHelper;
use app\utils\LoggerHelper;
use support\Request;
use support\Response;

/**
 * 身份合并控制器
 * 
 * 提供身份合并相关接口，实现场景4：手机号发现身份证后合并
 */
class PersonMergeController
{
    /**
     * 合并手机号到身份证（场景4的实现）
     * 
     * 如果某个手机号发现了对应的身份证号，查询该身份下是否有标签，
     * 如果有就会将对应的这个身份证号的所有标签重新计算同步。
     * 
     * POST /api/person-merge/phone-to-id-card
     */
    public function mergePhoneToIdCard(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/person-merge/phone-to-id-card');

            $rawBody = $request->rawBody();
            
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }
            
            $body = json_decode($rawBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponseHelper::error('JSON 格式错误: ' . json_last_error_msg(), 400);
            }

            // 验证必填字段
            if (empty($body['phone_number'])) {
                throw new \InvalidArgumentException('缺少必填字段：phone_number');
            }
            if (empty($body['id_card'])) {
                throw new \InvalidArgumentException('缺少必填字段：id_card');
            }

            $phoneNumber = (string)$body['phone_number'];
            $idCard = (string)$body['id_card'];

            // 创建服务实例
            $mergeService = new PersonMergeService(
                new UserProfileRepository(),
                new UserTagRepository(),
                new UserPhoneService(
                    new UserPhoneRelationRepository()
                ),
                new TagService(
                    new TagDefinitionRepository(),
                    new UserProfileRepository(),
                    new UserTagRepository(),
                    new TagHistoryRepository(),
                    new SimpleRuleEngine()
                )
            );

            // 执行合并
            $formalUserId = $mergeService->mergePhoneToIdCard($phoneNumber, $idCard);

            LoggerHelper::logBusiness('person_merge_phone_to_id_card', [
                'phone_number' => $phoneNumber,
                'id_card_provided' => true,
                'formal_user_id' => $formalUserId,
            ]);

            return ApiResponseHelper::success([
                'phone_number' => $phoneNumber,
                'formal_user_id' => $formalUserId,
                'message' => '身份合并成功，标签已重新计算',
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 合并临时人到正式人
     * 
     * POST /api/person-merge/temporary-to-formal
     */
    public function mergeTemporaryToFormal(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/person-merge/temporary-to-formal');

            $rawBody = $request->rawBody();
            
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }
            
            $body = json_decode($rawBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponseHelper::error('JSON 格式错误: ' . json_last_error_msg(), 400);
            }

            // 验证必填字段
            if (empty($body['user_id'])) {
                throw new \InvalidArgumentException('缺少必填字段：user_id');
            }
            if (empty($body['id_card'])) {
                throw new \InvalidArgumentException('缺少必填字段：id_card');
            }

            $tempUserId = (string)$body['user_id'];
            $idCard = (string)$body['id_card'];

            // 创建服务实例
            $mergeService = new PersonMergeService(
                new UserProfileRepository(),
                new UserTagRepository(),
                new UserPhoneService(
                    new UserPhoneRelationRepository()
                ),
                new TagService(
                    new TagDefinitionRepository(),
                    new UserProfileRepository(),
                    new UserTagRepository(),
                    new TagHistoryRepository(),
                    new SimpleRuleEngine()
                )
            );

            // 执行合并
            $formalUserId = $mergeService->mergeTemporaryToFormal($tempUserId, $idCard);

            LoggerHelper::logBusiness('person_merge_temporary_to_formal', [
                'temp_user_id' => $tempUserId,
                'formal_user_id' => $formalUserId,
            ]);

            return ApiResponseHelper::success([
                'temp_user_id' => $tempUserId,
                'formal_user_id' => $formalUserId,
                'message' => '临时人已转为正式人，标签已重新计算',
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
}

