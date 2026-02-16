<?php

namespace library\Interfaces;

use library\Interfaces\WechatAccountWeightAssessment as WechatAccountWeightAssessmentInterface;

/**
 * 微信账号加友权重评估
 */
interface WechatFriendAddLimitAssessment
{
    /**
     * 计算添加好友数量
     *
     * @param WechatAccountWeightAssessmentInterface $weight
     * @return int
     */
    public function maxLimit(WechatAccountWeightAssessmentInterface $weight): int;
}