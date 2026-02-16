<?php


namespace AccountWeight\UnitWeight;

use library\Interfaces\WechatAccountWeightResultSet as WechatAccountWeightResultSetInterface;

class RealNameWeight implements WechatAccountWeightResultSetInterface
{
    private $weight;

    /**
     * 使用微信要求必须得实名，所以统一返回满分
     *
     * @return int
     */
    private function hereWeGo(): int
    {
        return 100;
    }

    /**
     * @inheritDoc
     */
    public function settingFactor($wechatId): WechatAccountWeightResultSetInterface
    {
        $this->weight = $this->hereWeGo();

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