<?php
namespace app\common\util;

use OSS\OssClient;
use OSS\Core\OssException;
use think\facade\Env;

class AliyunOSS
{
    // OSS配置信息
    const ACCESS_KEY_ID =  'LTAIxvJUmlt2gLiY';
    const ACCESS_KEY_SECRET = '0WUo8r6BT4I8ZVUQxflmD8rLHrFNHO';
    const ENDPOINT = 'oss-cn-shenzhen.aliyuncs.com';
    const BUCKET = 'karuosiyujzk';
    const ossUrl = 'https://res.quwanzhi.com';
    
    /**
     * 获取OSS客户端实例
     * @return OssClient
     * @throws OssException
     */
    public static function getClient()
    {
        try {
            return new OssClient(
                self::ACCESS_KEY_ID,
                self::ACCESS_KEY_SECRET,
                self::ENDPOINT
            );
        } catch (OssException $e) {
            throw new OssException('创建OSS客户端失败：' . $e->getMessage());
        }
    }
    
    /**
     * 上传文件到OSS
     * @param string $filePath 本地文件路径
     * @param string $objectName OSS对象名称
     * @return array
     * @throws OssException
     */
    public static function uploadFile($filePath, $objectName)
    {
        try {
            $client = self::getClient();
            
            // 上传文件
            $result = $client->uploadFile(self::BUCKET, $objectName, $filePath);
            
            // 获取文件访问URL
            $url = !empty($result['oss-request-url']) ? $result['oss-request-url'] : $client->signUrl(self::BUCKET, $objectName, 3600);
            
            return [
                'success' => true,
                'url' => $url,
                'object_name' => $objectName,
                'size' => filesize($filePath),
                'mime_type' => mime_content_type($filePath)
            ];
        } catch (OssException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 生成OSS对象名称
     * @param string $originalName 原始文件名
     * @return string
     */
    public static function generateObjectName($originalName)
    {
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $name = md5(uniqid(mt_rand(), true));
        return date('Y/m/d/') . $name . '.' . $ext;
    }
} 