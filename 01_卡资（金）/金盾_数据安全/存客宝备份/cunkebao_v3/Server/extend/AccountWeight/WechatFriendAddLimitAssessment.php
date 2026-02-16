<?php

namespace AccountWeight;

use library\Interfaces\WechatAccountWeightAssessment as WechatAccountWeightAssessmentInterface;
use library\Interfaces\WechatFriendAddLimitAssessment as WechatFriendAddLimitAssessmentInterface;

class WechatFriendAddLimitAssessment implements WechatFriendAddLimitAssessmentInterface
{
    /**
     * @inheritDoc
     */
    public function maxLimit(WechatAccountWeightAssessmentInterface $weight): int
    {
        $adjusted  = $scope = $weight->getWeightScope();
        $lastDigit = $scope % 10;

        if ($scope < 10) {
            $adjusted = $lastDigit < 5 ? 5 : 10;
        }

        // 每5权重=1好友，最多20个
        return min(20, floor($adjusted / 5));
    }
} 