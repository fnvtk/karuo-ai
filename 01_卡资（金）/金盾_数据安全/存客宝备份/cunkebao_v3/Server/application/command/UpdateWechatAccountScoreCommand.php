<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\Db;
use app\common\service\WechatAccountHealthScoreService;

/**
 * 更新微信账号评分记录
 * 根据wechatId和alias是否不一致来更新isModifiedAlias字段（仅用于评分，不修复数据）
 */
class UpdateWechatAccountScoreCommand extends Command
{
    protected function configure()
    {
        $this->setName('wechat:update-score')
            ->setDescription('更新微信账号评分记录，根据wechatId和alias不一致情况更新isModifiedAlias字段（仅用于评分）');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln("开始更新微信账号评分记录...");
        
        try {
            // 1. 查找所有需要更新的账号
            $output->writeln("步骤1: 查找需要更新的账号...");
            
            // 查找wechatId和alias不一致的账号
            $inconsistentAccounts = Db::table('s2_wechat_account')
                ->where('isDeleted', 0)
                ->where('wechatId', '<>', '')
                ->where('alias', '<>', '')
                ->whereRaw('wechatId != alias')
                ->field('id, wechatId, alias')
                ->select();
            
            // 查找wechatId和alias一致的账号
            $consistentAccounts = Db::table('s2_wechat_account')
                ->where('isDeleted', 0)
                ->where('wechatId', '<>', '')
                ->where('alias', '<>', '')
                ->whereRaw('wechatId = alias')
                ->field('id, wechatId, alias')
                ->select();
            
            $output->writeln("发现 " . count($inconsistentAccounts) . " 条不一致记录（已修改微信号）");
            $output->writeln("发现 " . count($consistentAccounts) . " 条一致记录（未修改微信号）");
            
            // 2. 更新评分记录表中的isModifiedAlias字段
            $output->writeln("步骤2: 更新评分记录表...");
            $updatedCount = 0;
            $healthScoreService = new WechatAccountHealthScoreService();
            
            // 更新不一致的记录
            foreach ($inconsistentAccounts as $account) {
                $this->updateScoreRecord($account['id'], true, $healthScoreService);
                $updatedCount++;
            }
            
            // 更新一致的记录
            foreach ($consistentAccounts as $account) {
                $this->updateScoreRecord($account['id'], false, $healthScoreService);
                $updatedCount++;
            }
            
            $output->writeln("已更新 " . $updatedCount . " 条评分记录");
            
            // 3. 重新计算健康分（只更新基础信息分，不重新计算基础分）
            $output->writeln("步骤3: 重新计算健康分...");
            $allAccountIds = array_merge(
                array_column($inconsistentAccounts, 'id'),
                array_column($consistentAccounts, 'id')
            );
            
            if (!empty($allAccountIds)) {
                $stats = $healthScoreService->batchCalculateAndUpdate($allAccountIds, 100, false);
                $output->writeln("健康分计算完成：成功 " . $stats['success'] . " 条，失败 " . $stats['failed'] . " 条");
                
                if (!empty($stats['errors'])) {
                    $output->writeln("错误详情：");
                    foreach ($stats['errors'] as $error) {
                        $output->writeln("  账号ID {$error['accountId']}: {$error['error']}");
                    }
                }
            }
            
            $output->writeln("任务完成！");
            
        } catch (\Exception $e) {
            $output->writeln("错误: " . $e->getMessage());
            $output->writeln($e->getTraceAsString());
        }
    }
    
    /**
     * 更新评分记录
     * 
     * @param int $accountId 账号ID
     * @param bool $isModifiedAlias 是否已修改微信号
     * @param WechatAccountHealthScoreService $service 评分服务
     */
    private function updateScoreRecord($accountId, $isModifiedAlias, $service)
    {
        // 获取或创建评分记录
        $accountData = Db::table('s2_wechat_account')
            ->where('id', $accountId)
            ->find();
        
        if (empty($accountData)) {
            return;
        }
        
        // 确保评分记录存在
        $scoreRecord = Db::table('s2_wechat_account_score')
            ->where('accountId', $accountId)
            ->find();
        
        if (empty($scoreRecord)) {
            // 如果记录不存在，创建并计算基础分
            $service->calculateAndUpdate($accountId);
            $scoreRecord = Db::table('s2_wechat_account_score')
                ->where('accountId', $accountId)
                ->find();
        }
        
        if (empty($scoreRecord)) {
            return;
        }
        
        // 更新isModifiedAlias字段
        $updateData = [
            'isModifiedAlias' => $isModifiedAlias ? 1 : 0,
            'updateTime' => time()
        ];
        
        // 如果基础分已计算，需要更新基础信息分和基础分
        if ($scoreRecord['baseScoreCalculated']) {
            $oldBaseInfoScore = $scoreRecord['baseInfoScore'] ?? 0;
            $newBaseInfoScore = $isModifiedAlias ? 10 : 0; // 已修改微信号得10分
            
            if ($oldBaseInfoScore != $newBaseInfoScore) {
                $oldBaseScore = $scoreRecord['baseScore'] ?? 60;
                $newBaseScore = $oldBaseScore - $oldBaseInfoScore + $newBaseInfoScore;
                
                $updateData['baseInfoScore'] = $newBaseInfoScore;
                $updateData['baseScore'] = $newBaseScore;
                
                // 重新计算健康分
                $dynamicScore = $scoreRecord['dynamicScore'] ?? 0;
                $healthScore = $newBaseScore + $dynamicScore;
                $healthScore = max(0, min(100, $healthScore));
                $updateData['healthScore'] = $healthScore;
                $updateData['maxAddFriendPerDay'] = (int)floor($healthScore * 0.2);
            }
        } else {
            // 基础分未计算，只更新标记和基础信息分
            $updateData['baseInfoScore'] = $isModifiedAlias ? 10 : 0;
        }
        
        Db::table('s2_wechat_account_score')
            ->where('accountId', $accountId)
            ->update($updateData);
    }
}

