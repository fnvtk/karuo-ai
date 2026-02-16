<?php

namespace library\s2\interfaces;

interface AccountInterface
{
    /**
     * 创建账号
     *
     * @param string $accout
     * @param string $password
     * @return mixed
     */
    public function create(string $accout, string $password);

    /**
     * 删除账号
     *
     * @param int $id
     * @return mixed
     */
    public function delete(int $id);
}
