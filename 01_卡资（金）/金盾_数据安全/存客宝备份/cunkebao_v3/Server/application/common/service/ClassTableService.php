<?php
namespace app\common\service;

use library\ClassTable;
use think\Container;

class ClassTableService
{
    protected $app;
    protected $classTable;

    public function __construct(Container $app)
    {
        $this->app = $app;
        $this->classTable = ClassTable::getSelfInstance();
    }

    /**
     * 绑定实例或类到容器
     * @param string|array $alias
     * @param mixed $instance
     * @param string|null $tag
     */
    public function bind($alias, $instance = null, string $tag = null)
    {
        $this->classTable->bind($alias, $instance, $tag);
        return $this;
    }

    /**
     * 获取实例
     * @param string|object $class
     * @param array $parameters
     * @return object
     */
    public function getInstance($class, ...$parameters)
    {
        return $this->classTable->getInstance($class, ...$parameters);
    }

    /**
     * 获取共享实例
     * @param string $alias
     * @param array $parameters
     * @return object|null
     */
    public function getShared($alias, array $parameters = [])
    {
        return $this->classTable->getShared($alias, $parameters);
    }

    /**
     * 根据标签获取类
     * @param string $tag
     * @return array|null
     */
    public function getClassByTag(string $tag)
    {
        return $this->classTable->getClassByTag($tag);
    }

    /**
     * 检查别名是否存在
     * @param string $alias
     * @return bool
     */
    public function has(string $alias)
    {
        return $this->classTable->has($alias);
    }

    /**
     * 复制实例
     * @param mixed $class
     * @param string|null $name
     * @return object
     */
    public function copy($class, string $name = null)
    {
        return $this->classTable->copy($class, $name);
    }
} 