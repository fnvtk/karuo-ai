<?php

namespace library\s2\interfaces;

interface LoginInterface
{
    /**
     * 创建账号
     *
     * @param string $accout
     * @param string $password
     * @return mixed
     */
    public function login(string $accout, string $password): LoginInterface;
}
