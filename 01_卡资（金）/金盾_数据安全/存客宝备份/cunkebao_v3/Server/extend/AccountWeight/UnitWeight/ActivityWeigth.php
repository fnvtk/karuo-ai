<?php

namespace AccountWeight\UnitWeight;

use app\common\model\WechatCustomer as WechatCustomerModel;
use library\Interfaces\WechatAccountWeightResultSet as WechatAccountWeightResultSetInterface;

class ActivityWeigth implements WechatAccountWeightResultSetInterface
{
    private $weight;

    /**
     * 获取每天聊天次数。
     *
     * @param string $wechatId
     * @return int
     */
    private function getChatTimesPerDay(string $wechatId): int
    {
        $activity = (string)WechatCustomerModel::where([
                'wechatId' => $wechatId,
            ]
        )
            ->value('activity');

        return json_decode($activity)->yesterdayMsgCount ?? 0;
    }

    /**
     * @inheritDoc
     */
    public function settingFactor($wechatId): WechatAccountWeightResultSetInterface
    {
        $times = intval($this->getChatTimesPerDay($wechatId) / 50 * 100);

        // 规定每天发送50条消息起拥有最高权重
        $this->weight = $times > 100 ? 100 : $times;

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