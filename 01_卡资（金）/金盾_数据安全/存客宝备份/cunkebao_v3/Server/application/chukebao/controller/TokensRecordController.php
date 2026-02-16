<?php

namespace app\chukebao\controller;

use app\chukebao\model\TokensCompany;
use app\chukebao\model\TokensRecord;
use library\ResponseHelper;
use think\Db;

class TokensRecordController extends BaseController
{


    public function getList(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $type =  $this->request->param('type', '');
        $form =  $this->request->param('form', '');
        $startTime = $this->request->param('startTime', '');
        $endTime = $this->request->param('endTime', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');


        $where = [
            ['companyId','=',$companyId],
            ['userId' ,'=', $userId]
        ];

        if ($type != '') {
            $where[] = ['type','=',$type];
        }
        if ($form != '') {
            $where[] = ['form','=',$form];
        }

        // 时间筛选
        if (!empty($startTime)) {
            // 支持时间戳或日期字符串格式
            $startTimestamp = is_numeric($startTime) ? intval($startTime) : strtotime($startTime);
            if ($startTimestamp !== false) {
                $where[] = ['createTime', '>=', $startTimestamp];
            }
        }
        
        if (!empty($endTime)) {
            // 支持时间戳或日期字符串格式
            $endTimestamp = is_numeric($endTime) ? intval($endTime) : strtotime($endTime);
            if ($endTimestamp !== false) {
                // 如果是日期字符串，自动设置为当天的23:59:59
                if (!is_numeric($endTime)) {
                    $endTimestamp = strtotime(date('Y-m-d 23:59:59', $endTimestamp));
                }
                $where[] = ['createTime', '<=', $endTimestamp];
            }
        }

        $query = TokensRecord::where($where);
        $total = $query->count();
        $list = $query->where($where)->page($page,$limit)->order('id desc')->select();


        foreach ($list as &$item) {
            if (in_array($item['type'],[1])){
                $nickname = Db::table('s2_wechat_friend')->where(['id' => $item['friendIdOrGroupId']])->value('nickname');
                $item['nickname'] = !empty($nickname) ? $nickname : '-';
            }
            if (in_array($item['type'],[2,3])){
                $nickname = Db::table('s2_wechat_chatroom')->where(['id' => $item['friendIdOrGroupId']])->value('nickname');
                $item['nickname'] = !empty($nickname) ? $nickname : '-';
            }
        }
        unset($item);

        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    public function consumeTokens($data = [])
    {
        if (empty($data)){
            return ResponseHelper::error('数据缺失');
        }

        $tokens = isset($data['tokens']) ? intval($data['tokens']) : 0;
        $type = isset($data['type']) ? intval($data['type']) : 0;
        $form = isset($data['form']) ? intval($data['form']) : 0;
        $wechatAccountId = isset($data['wechatAccountId']) ? intval($data['wechatAccountId']) : 0;
        $friendIdOrGroupId = isset($data['friendIdOrGroupId']) ? intval($data['friendIdOrGroupId']) : 0;
        $remarks = isset($data['remarks']) ? $data['remarks'] : '';
        $companyId = isset($data['companyId']) ? intval($data['companyId']) : $this->getUserInfo('companyId');
        $userId = isset($data['userId']) ? intval($data['userId']) : $this->getUserInfo('id');

        // 验证必要参数
        if ($tokens <= 0) {
            return ResponseHelper::error('tokens数量必须大于0');
        }

        if (!in_array($type, [0, 1])) {
            return ResponseHelper::error('类型参数错误，0为减少，1为增加');
        }


        // 重试机制，最多重试3次
        $maxRetries = 3;
        $retryCount = 0;
        while ($retryCount < $maxRetries) {
            try {
                return $this->doConsumeTokens($userId, $companyId, $tokens, $type, $form, $wechatAccountId, $friendIdOrGroupId, $remarks);
            } catch (\Exception $e) {
                $retryCount++;
                if ($retryCount >= $maxRetries) {
                    return ResponseHelper::error('操作失败，请稍后重试：' . $e->getMessage());
                }
                // 短暂延迟后重试
                usleep(100000); // 100ms
            }
        }
    }

    /**
     * 执行tokens消费的核心方法
     */
    private function doConsumeTokens($userId, $companyId, $tokens, $type, $form, $wechatAccountId, $friendIdOrGroupId, $remarks)
    {
        // 开启数据库事务
        Db::startTrans();
        try {
            // 使用悲观锁获取用户当前tokens余额，确保并发安全
            $userInfo = TokensCompany::where(['companyId'=> $companyId,'userId' => $userId])->lock(true)->find();
            if (!$userInfo) {
                throw new \Exception('用户不存在');
            }

            $currentTokens = intval($userInfo['tokens']);

            // 计算新的余额
            $newBalance = $type == 1 ? ($currentTokens + $tokens) : ($currentTokens - $tokens);

            // 使用原子更新操作，基于当前值进行更新，防止并发覆盖
            $updateResult = TokensCompany::where('companyId', $companyId)
                ->where('companyId', $companyId)
                ->update([
                    'tokens' => $newBalance,
                    'updateTime' => time()
                ]);

            if (!$updateResult) {
                // 如果更新失败，说明tokens值已被其他事务修改，需要重新获取
                throw new \Exception('tokens余额已被其他操作修改，请重试');
            }

            // 记录tokens变动
            $recordData = [
                'companyId' => $companyId,
                'userId' => $userId,
                'wechatAccountId' => $wechatAccountId,
                'friendIdOrGroupId' => $friendIdOrGroupId,
                'form' => $form,
                'type' => $type,
                'tokens' => $tokens,
                'balanceTokens' => $newBalance,
                'remarks' => $remarks,
                'createTime' => time()
            ];

            $recordId = Db::name('tokens_record')->insertGetId($recordData);

            if (!$recordId) {
                throw new \Exception('记录tokens变动失败');
            }

            // 提交事务
            Db::commit();

            return ResponseHelper::success([
                'recordId' => $recordId,
                'oldBalance' => $currentTokens,
                'newBalance' => $newBalance,
                'changeAmount' => $type == 1 ? $tokens : -$tokens
            ], 'tokens变动记录成功');

        } catch (\Exception $e) {
            // 回滚事务
            Db::rollback();
            throw $e; // 重新抛出异常，让重试机制处理
        }
    }

 

}