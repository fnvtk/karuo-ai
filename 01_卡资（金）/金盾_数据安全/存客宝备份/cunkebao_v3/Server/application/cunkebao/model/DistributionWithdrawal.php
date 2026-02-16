<?php

namespace app\cunkebao\model;

use app\cunkebao\model\BaseModel;
use think\Model;

/**
 * 分销渠道提现申请模型
 */
class DistributionWithdrawal extends BaseModel
{
    // 设置表名
    protected $name = 'distribution_withdrawal';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 类型转换
    protected $type = [
        'id' => 'integer',
        'companyId' => 'integer',
        'channelId' => 'integer',
        'amount' => 'integer',
        'reviewTime' => 'timestamp',
        'applyTime' => 'timestamp',
        'createTime' => 'timestamp',
        'updateTime' => 'timestamp',
    ];

    /**
     * 状态：pending（待审核）
     */
    const STATUS_PENDING = 'pending';

    /**
     * 状态：approved（已通过）
     */
    const STATUS_APPROVED = 'approved';

    /**
     * 状态：rejected（已拒绝）
     */
    const STATUS_REJECTED = 'rejected';

    /**
     * 状态：paid（已打款）
     */
    const STATUS_PAID = 'paid';

    /**
     * 支付类型：wechat（微信）
     */
    const PAY_TYPE_WECHAT = 'wechat';

    /**
     * 支付类型：alipay（支付宝）
     */
    const PAY_TYPE_ALIPAY = 'alipay';

    /**
     * 支付类型：bankcard（银行卡）
     */
    const PAY_TYPE_BANKCARD = 'bankcard';
}




