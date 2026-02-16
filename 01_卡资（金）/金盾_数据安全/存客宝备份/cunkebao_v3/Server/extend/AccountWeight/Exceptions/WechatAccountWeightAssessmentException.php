<?php

namespace AccountWeight\Exceptions;

use Throwable;

class WechatAccountWeightAssessmentException extends \Exception
{
    /**
     * @inheritDoc
     */
    public function __construct($message = '', $code = 22921, Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}