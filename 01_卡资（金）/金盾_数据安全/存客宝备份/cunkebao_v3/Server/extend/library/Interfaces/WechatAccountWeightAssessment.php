<?php

namespace library\Interfaces;

use AccountWeight\Exceptions\WechatAccountWeightAssessmentException as WeightAssessmentException;

/**
 * 微信账号加友权重评估
 */
interface WechatAccountWeightAssessment
{
    /**
     * 设置测算因子
     *
     * @param $params
     * @return WechatAccountWeightAssessment
     */
    public function settingFactor($params): WechatAccountWeightAssessment;

    /**
     * 计算账号年龄权重
     *
     * @return WechatAccountWeightResultSet
     */
    public function calculAgeWeight(): WechatAccountWeightResultSet;

    /**
     * 计算活跃度权重
     *
     * @return WechatAccountWeightResultSet
     */
    public function calculActivityWeigth(): WechatAccountWeightResultSet;

    /**
     * 计算限制影响权重
     *
     * @return WechatAccountWeightResultSet
     */
    public function calculRestrictWeigth(): WechatAccountWeightResultSet;

    /**
     * 计算实名认证权重
     *
     * @return WechatAccountWeightResultSet
     */
    public function calculRealNameWeigth(): WechatAccountWeightResultSet;

    /**
     * 获取总得分
     *
     * @return int
     */
    public function getWeightScope(): int;
}