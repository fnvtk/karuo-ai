<?php

namespace library\Interfaces;

/**
 * 微信账号加友权重评估结果数据
 */
interface WechatAccountWeightResultSet
{
    /**
     * 设置测算因子
     *
     * @param mixed $params
     * @return WechatAccountWeightResultSet
     */
    public function settingFactor($params): WechatAccountWeightResultSet;

    /**
     * 返回微信账号加友权重评估结果数据
     *
     * @return int
     */
    public function getResult(): int;
}