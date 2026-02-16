<?php

namespace app\common;

class Logger {

    const INFO = 'INFO';
    const WARN = 'WARN';
    const ERROR = 'ERROR';

    static protected $loggers = [];

    /**
     * 获取日志对象
     *
     * @param $name
     * @return Logger
     */
    static public function _($name) {
        $lower = strtolower($name);
        if (!isset(static::$loggers[$lower])) {
            static::$loggers[$lower] = new Logger($name);
        }
        return static::$loggers[$lower];
    }

    protected $name;
    protected $print = TRUE;

    /**
     * Logger constructor.
     *
     * @param $name
     */
    protected function __construct($name) {
        $this->name = $name;
    }

    /**
     * 写入信息
     *
     * @param $message
     * @param array $params
     */
    public function info($message, array $params = []) {
        $this->write(static::INFO, $message, $params);
    }

    /**
     * 写入警告
     *
     * @param $message
     * @param array $params
     */
    public function warn($message, array $params = []) {
        $this->write(static::WARN, $message, $params);
    }

    /**
     * 写入错误
     *
     * @param $message
     * @param array $params
     */
    public function error($message, array $params = []) {
        $this->write(static::ERROR, $message, $params);
    }

    /**
     * 写入日志
     *
     * @param $type
     * @param $message
     * @param array $params
     */
    public function write($type, $message, array $params = []) {
        foreach ($params as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }

        $data = '[' . date('Y-m-d H:i:s') . '][' . $type . '] ' . $message . PHP_EOL;
        $file = ROOT_PATH . DS . 'runtime' . DS . $this->name . '_' . date('Ymd') . '.txt';

        file_put_contents($file, $data, FILE_APPEND);

        if ($this->print) {
            echo '[' . date('Y-m-d H:i:s') . '][' . $this->name . '][' . $type . '] ' . $message . PHP_EOL;;
        }
    }
}