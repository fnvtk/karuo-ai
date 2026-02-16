<?php

namespace AccountWeight;

use AccountWeight\Exceptions\WechatAccountWeightAssessmentException as WeightAssessmentException;
use library\ClassTable;
use library\Interfaces\WechatAccountWeightResultSet as WechatAccountWeightResultSetInterface;
use library\Interfaces\WechatAccountWeightAssessment as WechatAccountWeightAssessmentInterface;
use AccountWeight\UnitWeight;
use app\common\service\ClassTableService;

class WechatAccountWeightAssessment implements WechatAccountWeightAssessmentInterface
{
    private $wechatId;
    private $ageWeight;
    private $activityWeigth;
    private $restrictWeight;
    private $realNameWeight;
    protected $classTable;

    /**
     * 依赖注入
     *
     * @param ClassTableService|null $classTable
     */
    public function __construct(ClassTableService $classTable = null)
    {
        $this->classTable = $classTable ?? app('ClassTable');
    }

    /**
     * 获取言
     * @return string
     * @throws WechatAccountWeightAssessmentException
     */
    private function getWechatId(): string
    {
        if (empty($this->wechatId)) {
            throw new WeightAssessmentException('缺少验证参数');
        }

        return $this->wechatId;
    }

    /**
     * @inheritDoc
     */
    public function calculAgeWeight(): WechatAccountWeightResultSetInterface
    {
        $AgeWeight = $this->classTable->getInstance(UnitWeight\AgeWeight::class);

        if (!$this->ageWeight) {
            $this->ageWeight = $AgeWeight->settingFactor(
                $this->getWechatId()
            )
                ->getResult();
        }

        return $AgeWeight;
    }

    /**
     * @inheritDoc
     */
    public function calculActivityWeigth(): WechatAccountWeightResultSetInterface
    {
        $ActivityWeigth = $this->classTable->getInstance(UnitWeight\ActivityWeigth::class);

        if (!$this->activityWeigth) {
            $this->activityWeigth = $ActivityWeigth->settingFactor(
                $this->getWechatId()
            )
                ->getResult();
        }

        return $ActivityWeigth;
    }

    /**
     * @inheritDoc
     */
    public function calculRestrictWeigth(): WechatAccountWeightResultSetInterface
    {
        $RestrictWeight = $this->classTable->getInstance(UnitWeight\RestrictWeight::class);

        if (!$this->restrictWeight) {
            $this->restrictWeight = $RestrictWeight->settingFactor(
                $this->getWechatId()
            )
                ->getResult();
        }

        return $RestrictWeight;
    }

    /**
     * @inheritDoc
     */
    public function calculRealNameWeigth(): WechatAccountWeightResultSetInterface
    {
        $AccountWeight = $this->classTable->getInstance(UnitWeight\RealNameWeight::class);

        if (!$this->realNameWeight) {
            $this->realNameWeight = $AccountWeight->settingFactor(
                $this->getWechatId()
            )
                ->getResult();
        }

        return $AccountWeight;
    }

    /**
     * @inheritDoc
     */
    public function getWeightScope(): int
    {
        return ceil(
            (
                $this->calculAgeWeight()->getResult() +
                $this->calculActivityWeigth()->getResult() +
                $this->calculRestrictWeigth()->getResult() +
                $this->calculRealNameWeigth()->getResult()
            ) / 4);
    }

    /**
     * @inheritDoc
     */
    public function settingFactor($params): WechatAccountWeightAssessmentInterface
    {
        if (!is_string($params)) {
            throw new WeightAssessmentException('参数错误，只能传微信ID');
        }

        $this->wechatId = $params;

        return $this;
    }
} 