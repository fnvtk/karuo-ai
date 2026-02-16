<?php

namespace library\Interfaces;

interface CallMap
{
    /**
     * 创建并返回一个对象。
     * 
     * 如果需要获取需要初始化参数的对象实例，请使用此方法。
     *
     * @param object|string $class
     * @param null|mixed $parameters
     * @return object
     */
    public function getInstance($class, ...$parameters): object;

    /**
     * 通过别名获取对象。
     *
     * @param string|int $alias
     * @param array $parameters
     * @return object|null
     */
    public function alias($alias, array $parameters = []): ?object;

    /**
     * 返回对象的副本。
     *
     * @param object|string|alias $class
     * @param string|null $name
     * @return object
     */
    public function copy($class, string $name = null): object;

    /**
     * 解析一个服务，解析后的服务会被存储在DI容器中，
     * 后续对此服务的请求将返回同一个实例
     *
     * @param string|int $alias
     * @param array $parameters
     * @return object|null
     */
    public function getShared($alias, array $parameters = []): ?object;

    /**
     * 查询一个对象，如果没有则返回另一个对象。
     *
     * @param string $precept
     * @param string|object $scheme
     * @param string $alias
     * @return object|null
     */
    public function detect(string $precept, $scheme, string $stored = null): ?object;

    /**
     * 通过标签从哈希表中获取集合。此方法通常返回一个数组。
     *
     * @param string $tag
     * @return array
     */
    public function getClassByTag(string $tag): ?array;

    /**
     * 创建标签。
     *
     * @param string $tag
     * @param array $lastElements
     * @return mixed
     */
    public function tag(string $tag, array $lastElements = []);

    /**
     * 检查对象是否存在于类表中。
     *
     * @param string $alias
     * @return mixed
     */
    public function has(string $alias): bool;

    /**
     * 通过别名注册延迟加载对象。（此方法是延迟加载的）
     *
     * @param string|array $alias
     * @param string|object|null $object
     * @param string|null $tag
     * @return mixed
     */
    public function bind($alias, $object = null, string $tag = null);

    /**
     * 撤销共享实例。
     *
     * @param string|int|object $alias
     * @return mixed
     */
    public function revokeShared($alias);

    /**
     * 释放内存。
     *
     * @param array|string $alias
     * @return mixed
     */
    public function dealloc($alias);
}