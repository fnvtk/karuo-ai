<?php

namespace app\ai\controller;

use app\common\util\JwtUtil;
use think\facade\Env;
use think\Controller;

class DouBaoAI extends Controller
{
    protected $apiUrl;
    protected $apiKey;
    protected $headers;

    public function __construct()
    {
        parent::__construct();

        $this->apiUrl = Env::get('doubaoAi.api_url');
        $this->apiKey = Env::get('doubaoAi.api_key');

        // 设置请求头
        $this->headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey
        ];

        if (empty($this->apiKey) || empty($this->apiUrl)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }
    }



    public function text($params = [])
    {

        if (empty($params)){
            $content = $this->request->param('content', '');
            $model = $this->request->param('model', 'doubao-seed-1-8-251215');
            if(empty($content)){
                return json_encode(['code' => 500, 'msg' => '提示词缺失']);
            }
            $params = [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => '你现在是存客宝的AI助理，你精通中国大陆的法律'],
                    ['role' => 'user', 'content' => $content],
                ],
            ];
        }
        $result = requestCurl($this->apiUrl.'/api/v3/chat/completions', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if(isset($result['error'])){
            $error = $result['error'];
            return json_encode(['code' => 500, 'msg' => $error['message']]);
        }else{
            $content = $result['choices'][0]['message']['content'];
            $token = intval($result['usage']['total_tokens']) * 20;

            exit_data($content);
            return json_encode(['code' => 200, 'msg' => '成功','data' => ['token' => $token,'content' => $content]]);
        }

    }

    /**
     * 图片生成功能（基于火山方舟 Seedream 4.0-4.5 API）
     * 参考文档：https://www.volcengine.com/docs/82379/1541523?lang=zh
     * 
     * @param array $params 请求参数，如果为空则从请求中获取
     * @return string JSON格式的响应
     */
    public function image($params = [])
    {
        try {
            // 如果参数为空，从请求中获取
            if (empty($params)){
                $content = $this->request->param('content', '');
                $model = $this->request->param('model', 'doubao-seedream-4-5-251128');
                $size = $this->request->param('size', '16:9'); // 支持档位(1K/2K/4K)、比例(16:9/9:16等)、像素(1280x720等)
                $responseFormat = $this->request->param('response_format', 'url'); // url 或 b64_json
                $sequentialImageGeneration = $this->request->param('sequential_image_generation', 'disabled'); // enabled 或 disabled
                $watermark = $this->request->param('watermark', true); // true 或 false
                
                // 参数验证
                if(empty($content)){
                    return json_encode(['code' => 500, 'msg' => '提示词（prompt）不能为空']);
                }
                
                // 验证和规范化尺寸参数
                $size = $this->validateAndNormalizeSize($size);
                if(!in_array($responseFormat, ['url', 'b64_json'])){
                    $responseFormat = 'url';
                }
                
                if(!in_array($sequentialImageGeneration, ['enabled', 'disabled'])){
                    $sequentialImageGeneration = 'disabled';
                }
                
                // 构建请求参数（根据火山方舟文档）
                $params = [
                    'model' => $model,
                    'prompt' => $content,
                    'sequential_image_generation' => $sequentialImageGeneration,
                    'response_format' => $responseFormat,
                    'size' => $size,
                    'stream' => false,
                    'watermark' => true
                ];
            }
            
            // 确保API URL正确（图片生成API的endpoint）
            $imageApiUrl = $this->apiUrl. '/api/v3/images/generations';
            // 发送请求
            $result = requestCurl($imageApiUrl, $params, 'POST', $this->headers, 'json');
            $result = json_decode($result, true);
            // 错误处理
            if(isset($result['error'])){
                $error = $result['error'];
                $errorMsg = isset($error['message']) ? $error['message'] : '图片生成失败';
                $errorCode = isset($error['code']) ? $error['code'] : 'unknown';
                
                \think\facade\Log::error('火山方舟图片生成失败', [
                    'error' => $error,
                    'params' => $params
                ]);
                
                return json_encode([
                    'code' => 500, 
                    'msg' => $errorMsg,
                    'error_code' => $errorCode
                ]);
            }
            
            // 成功响应处理（根据火山方舟文档的响应格式）
            if(isset($result['data']) && is_array($result['data']) && !empty($result['data'])){
                $imageData = $result['data'][0];
                
                // 根据 response_format 获取图片数据
                $imageUrl = null;
                $imageB64 = null;
                
                if(isset($imageData['url'])){
                    $imageUrl = $imageData['url'];
                }
                
                if(isset($imageData['b64_json'])){
                    $imageB64 = $imageData['b64_json'];
                }
                
                // 计算token（如果有usage信息）
                $token = 0;
                if(isset($result['usage']['total_tokens'])){
                    $token = intval($result['usage']['total_tokens']) * 20;
                }
                
                // 构建返回数据
                $responseData = [
                    'token' => $token,
                    'image_url' => $imageUrl,
                    'image_b64' => $imageB64,
                    'model' => $params['model'] ?? '',
                    'size' => $params['size'] ?? '2K',
                    'created' => isset($result['created']) ? $result['created'] : time()
                ];
                
                // 根据请求的response_format返回对应的数据
                if($params['response_format'] == 'url' && $imageUrl){
                    $responseData['content'] = $imageUrl;
                } elseif($params['response_format'] == 'b64_json' && $imageB64){
                    $responseData['content'] = $imageB64;
                }
                
                return json_encode([
                    'code' => 200, 
                    'msg' => '图片生成成功',
                    'data' => $responseData
                ]);
            } else {
                // 响应格式不符合预期
                \think\facade\Log::warning('火山方舟图片生成响应格式异常', [
                    'result' => $result,
                    'params' => $params
                ]);
                
                return json_encode([
                    'code' => 500, 
                    'msg' => '图片生成响应格式异常',
                    'raw_response' => $result
                ]);
            }
            
        } catch (\Exception $e) {
            \think\facade\Log::error('火山方舟图片生成异常', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return json_encode([
                'code' => 500, 
                'msg' => '图片生成异常：' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * 验证和规范化尺寸参数
     * 支持三种格式：
     * 1. 档位形式：1K, 2K, 4K（不区分大小写）
     * 2. 比例形式：16:9, 9:16, 1:1, 4:3, 3:4 等
     * 3. 像素形式：1280x720, 2048x2048 等（宽度1280-4096，高度720-4096，宽高比0.0625-16）
     * 
     * @param string $size 尺寸参数
     * @return string 规范化后的尺寸值
     */
    private function validateAndNormalizeSize($size)
    {
        if (empty($size)) {
            return '2K';
        }
        
        $size = trim($size);
        
        // 1. 检查是否为档位形式（1K, 2K, 4K）
        $sizeUpper = strtoupper($size);
        if (in_array($sizeUpper, ['1K', '2K', '4K'])) {
            return $sizeUpper;
        }
        
        // 2. 检查是否为比例形式（如 16:9, 9:16, 1:1）
        if (preg_match('/^(\d+):(\d+)$/', $size, $matches)) {
            $width = intval($matches[1]);
            $height = intval($matches[2]);
            
            if ($width > 0 && $height > 0) {
                $ratio = $width / $height;
                // 验证宽高比范围：0.0625 ~ 16
                if ($ratio >= 0.0625 && $ratio <= 16) {
                    return $size; // 返回比例形式，如 "16:9"
                }
            }
        }
        
        // 3. 检查是否为像素形式（如 1280x720, 2048x2048）
        if (preg_match('/^(\d+)x(\d+)$/i', $size, $matches)) {
            $width = intval($matches[1]);
            $height = intval($matches[2]);
            
            // 验证宽度范围：1280 ~ 4096
            if ($width < 1280 || $width > 4096) {
                return '2K'; // 默认返回 2K
            }
            
            // 验证高度范围：720 ~ 4096
            if ($height < 720 || $height > 4096) {
                return '2K'; // 默认返回 2K
            }
            
            // 验证宽高比范围：0.0625 ~ 16
            $ratio = $width / $height;
            if ($ratio < 0.0625 || $ratio > 16) {
                return '2K'; // 默认返回 2K
            }
            
            return $size; // 返回像素形式，如 "1280x720"
        }
        
        // 如果都不匹配，返回默认值
        return '2K';
    }


}