<?php

namespace AccountWeight\UnitWeight;

use app\common\model\WechatRestricts as WechatRestrictsModel;
use library\Interfaces\WechatAccountWeightResultSet as WechatAccountWeightResultSetInterface;

class RestrictWeight implements WechatAccountWeightResultSetInterface
{
    private $weight;

    /**
     * 获取限制记录
     *
     * @param string $wechatId
     * @return int
     */
    private function getRestrictCount(string $wechatId): int
    {
        return WechatRestrictsModel::alias('r')
            ->field(
                [
                    'r.id', 'r.restrictTime date', 'r.level', 'r.reason'
                ]
            )
            ->where('r.wechatId', $wechatId)->select()
            ->count('*');
    }

    /**
     * @inheritDoc
     */
    public function settingFactor($wechatId): WechatAccountWeightResultSetInterface
    {
        $restrict = 10 - $this->getRestrictCount($wechatId);

        // 规定没有限制记录拥有最高权重，10条以上权重为0
        $this->weight = ($restrict < 0 ? 0 : $restrict) * 10;

        return $this;
    }

    /**
     * @inheritDoc
     */
    public function getResult(): int
    {
        return $this->weight ?: 0;
    }
}