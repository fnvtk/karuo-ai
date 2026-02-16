<?php

namespace app\common;

class Utils {

    /**
     * 获取URL
     *
     * @param $url
     * @return string
     */
    static public function absoluteUrl($url) {
        if (!empty($_SERVER['HTTP_HOST'])) {
            return (!empty($_SERVER['HTTPS']) ? 'https' : 'http')
                . '://' . $_SERVER['HTTP_HOST']
                . ($url{0} === '/' ? $url : '/' . $url);
        } else {
            return config('config.domain') . ($url{0} === '/' ? $url : '/' . $url);
        }
    }

    /**
     * 计算熟知
     *
     * @param $total
     * @param $number1
     * @param $number2
     */
     static public function allocNumber($total, & $number1, & $number2) {
         if ($number1 > 0 OR $number2 > 0) {
             $number1 = $total * ($number1 / ($number1 + $number2));
             $number2 = $total - $number1;
         }
     }
}