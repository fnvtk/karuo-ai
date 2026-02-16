<?php

namespace app\common;

class Fork {

    /**
     * 执行多条任务并等待所有任务执行完成后结束
     *
     * @param array $taskFuncs
     */
    static public function wait(array $taskFuncs) {
        foreach ($taskFuncs as $i => $taskFunc) {
            $pid = pcntl_fork();
            if ($pid == -1) {
                exit('Could not fork.');
            } elseif ($pid == 0) {
                call_user_func_array($taskFunc, [$i]);
                exit(0);
            }
        }
        foreach ($taskFuncs as $taskFunc) {
            pcntl_wait($status);
        }
    }

    /**
     * 并发执行多条任务
     *
     * @param array $taskFuncs
     */
    static public function invoke(array $taskFuncs) {
        $taskRuns = [];
        $signal   = FALSE;
        if (function_exists('pcntl_async_signals')) {
            pcntl_async_signals(TRUE);
        }
        while (TRUE) {
            foreach ($taskFuncs as $i => $taskFunc) {
                if (!in_array($i, $taskRuns)) {
                    $pid = pcntl_fork();
                    if ($pid == -1) {
                        exit('Could not fork.');
                    } elseif ($pid > 0) {
                        $taskRuns[$pid] = $i;
                        if (!$signal) {
                            $signal = TRUE;
                            static::signalHandler();
                        }
                    } else {
                        call_user_func_array($taskFunc, [$i]);
                        exit(0);
                    }
                }
            }
            if ($pid = pcntl_wait($status, WNOHANG)) {
                unset($taskRuns[$pid]);
            } else {
                sleep(1);
            }
        }
    }

    /**
     * 按指定数量并发执行相同任务
     *
     * @param $count
     * @param $taskFunc
     * @param int $destroy
     */
    static public function execute($count, $taskFunc, $destroy = 100) {
        $runSum  = 0;
        $runNum  = 0;
        $signal  = FALSE;
        if (function_exists('pcntl_async_signals')) {
            pcntl_async_signals(TRUE);
        }
        while (TRUE) {
            if ($runNum >= $count) {
                if (pcntl_wait($status, WNOHANG) > 0) {
                    $runNum --;
                } else {
                    sleep(1);
                    continue;
                }
            }

            $pid = pcntl_fork();
            if ($pid == -1) {
                exit('Could not fork.');
            } elseif ($pid > 0) {
                $runSum ++;
                $runNum ++;
                if (!$signal) {
                    $signal = TRUE;
                    static::signalHandler();
                }
            } else {
                for ($i = 0; $i < $destroy; $i ++) {
                    call_user_func_array($taskFunc, [$runSum % $count]);
                }

                exit;
            }
        }
    }

    /**
     * 设置信息处理器
     *
     */
    static public function signalHandler() {
        $handler = function () {
            posix_kill(0, SIGKILL);
            exit(0);
        };
        pcntl_signal(SIGINT, $handler);
        pcntl_signal(SIGTERM, $handler);
        pcntl_signal(SIGUSR1, $handler);
        pcntl_signal(SIGUSR2, $handler);
    }
}