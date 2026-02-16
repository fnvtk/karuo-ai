<?php
namespace WeChatDeviceApi;

use think\facade\Config;
use WeChatDeviceApi\Contracts\WeChatServiceInterface;

class Manager
{
    /**
     * @var array 适配器实例缓存
     */
    protected $adapters = [];

    /**
     * @var array 配置
     */
    protected $config;

    public function __construct(array $config = null)
    {
        $this->config = $config ?: Config::get('wechat_device_api.');
        if (empty($this->config)) {
            throw new \InvalidArgumentException("WeChat Device API configuration not found.");
        }
    }

    /**
     * 获取指定的适配器实例
     *
     * @param string|null $name 适配器名称 (例如 'vendor_a', 'vendor_b')，null 则使用默认
     * @return WeChatServiceInterface
     * @throws \InvalidArgumentException
     */
    public function adapter(string $name = null): WeChatServiceInterface
    {
        $name = $name ?: $this->getDefaultAdapterName();

        if (!isset($this->config['adapters'][$name])) {
            throw new \InvalidArgumentException("Adapter [{$name}] configuration not found.");
        }

        if (!isset($this->adapters[$name])) {
            $this->adapters[$name] = $this->createAdapter($name);
        }

        return $this->adapters[$name];
    }

    /**
     * 创建适配器实例
     *
     * @param string $name
     * @return WeChatServiceInterface
     */
    protected function createAdapter(string $name): WeChatServiceInterface
    {
        $adapterConfig = $this->config['adapters'][$name];
        $driverClass = $adapterConfig['driver'] ?? null;

        if (!$driverClass || !class_exists($driverClass)) {
            throw new \InvalidArgumentException("Driver class for adapter [{$name}] not found or not specified.");
        }

        $adapterInstance = new $driverClass($adapterConfig);

        if (!$adapterInstance instanceof WeChatServiceInterface) {
            throw new \LogicException("Driver class [{$driverClass}] must implement WeChatServiceInterface.");
        }

        return $adapterInstance;
    }

    /**
     * 获取默认适配器名称
     *
     * @return string
     */
    public function getDefaultAdapterName(): string
    {
        return $this->config['default_adapter'] ?? '';
    }

    /**
     * 动态调用默认适配器的方法
     *
     * @param string $method
     * @param array $parameters
     * @return mixed
     */
    public function __call(string $method, array $parameters)
    {
        return $this->adapter()->{$method}(...$parameters);
    }
}