<?php

namespace library;

use library\Interfaces\CallMap as CallMapInterface;

class ClassTable implements CallMapInterface
{
    /**
     * 类映射表
     *
     * @var array|mixed
     */
    protected $hashTable;

    /**
     * 最近绑定的对象
     *
     * @var array
     */
    protected $latest = [];

    protected static $selfInstance;

    /**
     * 分组
     *
     * @param string $tag
     * @param array $collection
     */
    private function _tag(string $tag, array $collection): void
    {
        $this->{$tag} = (array)($this->{$tag} ?? []);

        // 将值追加到数组中。
        $this->{$tag} = array_merge($this->{$tag}, $collection);
    }

    /**
     * 返回标签的元素
     *
     * @param string $tag
     * @return array|null
     */
    private function getTagElements(string $tag): ?array
    {
        return $this->{'__tag__' . $tag} ?? null;
    }

    /**
     * 创建并返回一个对象
     *
     * @param object|string $class
     * @param array $parameters
     * @return object
     * @throws \Throwable
     */
    private function _getInstance($class, $parameters = []): object
    {
        if ($class instanceof \Closure) {
            return $class();
        }

        if (is_object($class)) {
            return $class;
        }

        if (class_exists(strval($class))) {
            // 创建该类的新实例
            return method_exists($class, 'newInstance') ? $class::newInstance(...$parameters) : new $class(...$parameters);
        }

        throw new \Exception(static::class . ': 调用了未定义的函数', 532341);
    }

    /**
     * 单例
     *
     * @param $container
     * @return void
     */
    public static function getSelfInstance(): CallMapInterface
    {
        if (!self::$selfInstance instanceof self) {
            self::$selfInstance = new self();
        }

        return self::$selfInstance;
    }

    /**
     * @inheritDoc
     */
    public function bind($alias, $instance = null, string $tag = null): void
    {
        if (is_array($alias)) {
            foreach ($alias as $name => $instance) {
                $this->hashTable[$name] = $instance;
            }

            $this->latest = array_keys($alias);

            if ($tag) {
                $this->tag($tag, $this->latest);
            }
        } else {
            $this->hashTable[$alias] = $instance;
            $this->latest = [$alias];

            if ($tag) {
                $this->tag($tag, $this->latest);
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function dealloc($alias): void
    {
        dealloc($this->hashTable, $alias);

        $insects = array_intersect((array)$alias, $this->latest);

        if ($insects) {
            $this->latest = array_diff($this->latest, $insects);
        }
    }

    /**
     * @inheritDoc
     */
    public function revokeShared($alias): void
    {
        $instance = $this->alias($alias);

        $this->bind($alias, get_class($instance));
    }

    /**
     * @inheritDoc
     */
    public function tag(string $tag, array $lastElements = []): CallMapInterface
    {
        $this->_tag('__tag__' . $tag, ($lastElements ?: $this->latest));

        return $this;
    }

    /**
     * @inheritDoc
     */
    public function getInstance($class, ...$parameters): object
    {
        $name = is_object($class) ? get_class($class) : $class;

        if (!$this->has($name)) {
            return $this->hashTable[$name] = $this->_getInstance($class, $parameters);
        }

        return $this->_getInstance($this->hashTable[$name], $parameters);
    }

    /**
     * @inheritDoc
     */
    public function copy($class, string $name = null): object
    {
        $instance = clone $this->getInstance($class);

        if (!is_null($name)) {
            $this->bind($name, $instance);
        }

        return $instance;
    }

    /**
     * @inheritDoc
     */
    public function getClassByTag(string $tag): ?array
    {
        $elements = $this->getTagElements($tag);

        if ($elements) {
            foreach ($elements as $alias) {
                if ($this->has($alias)) {
                    $consequences[$alias] = $this->hashTable[$alias];
                }
            }
        }

        return $consequences ?? null;
    }

    /**
     * @inheritDoc
     */
    public function has(string $alias): bool
    {
        return isset($this->hashTable[$alias]);
    }

    /**
     * @inheritDoc
     */
    public function detect(string $precept, $class, string $alias = null): ?object
    {
        // Scheme 是临时对象，不会被保存
        if (!$this->has($precept)) {
            // 如果想共享该对象，可以调用 bind 方法将其注册到哈希表中
            $instance = $this->_getInstance($class);

            if ($alias) {
                $this->hashTable[$alias] = $instance;
            }

            return $instance;
        }

        return $this->hashTable[$precept];
    }

    /**
     * @inheritDoc
     */
    public function alias($alias, array $parameters = []): ?object
    {
        return $this->getInstance($alias, ...$parameters);
    }

    /**
     * @inheritDoc
     */
    public function getShared($alias, array $parameters = []): ?object
    {
        $instance = $this->alias($alias, $parameters);

        $this->bind($alias, $instance);

        return $instance;
    }
}
