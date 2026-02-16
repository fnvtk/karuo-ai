<?php

namespace library\s2\interfaces;

interface DeviceInterface
{
    /**
     * 获取设备列表
     * @param array $params
     * @return array
     */
    public function getlist(array $params): array;
}
