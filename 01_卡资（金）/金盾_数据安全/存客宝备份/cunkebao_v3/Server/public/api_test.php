<?php
// API测试入口文件

// 检查URL参数
$url = isset($_GET['url']) ? $_GET['url'] : '';
$method = isset($_GET['method']) ? strtoupper($_GET['method']) : 'GET';
$data = isset($_GET['data']) ? $_GET['data'] : '{}';

// 将JSON字符串转为PHP数组
$jsonData = json_decode($data, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $jsonData = [];
}

// 获取token参数
$token = isset($_GET['token']) ? $_GET['token'] : '';

echo '<h1>API测试工具</h1>';
echo '<form method="get">';
echo '<p>API路径: <input type="text" name="url" value="' . htmlspecialchars($url) . '" style="width:300px" placeholder="例如: api/auth/login"/></p>';
echo '<p>请求方法: <select name="method">
        <option value="GET"' . ($method == 'GET' ? ' selected' : '') . '>GET</option>
        <option value="POST"' . ($method == 'POST' ? ' selected' : '') . '>POST</option>
      </select></p>';
echo '<p>请求数据 (JSON): <textarea name="data" style="width:400px;height:100px">' . htmlspecialchars($data) . '</textarea></p>';
echo '<p>Authorization Token: <input type="text" name="token" value="' . htmlspecialchars($token) . '" style="width:400px" placeholder="Bearer token..."/></p>';
echo '<p><input type="submit" value="发送请求"/></p>';
echo '</form>';

// 如果有URL参数，发送API请求
if (!empty($url)) {
    // 构建完整URL
    $fullUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/' . $url;
    
    // 初始化cURL
    $ch = curl_init($fullUrl);
    
    // 设置cURL选项
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // 设置请求方法
    if ($method == 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($jsonData));
    }
    
    // 设置请求头
    $headers = ['Content-Type: application/json'];
    if (!empty($token)) {
        $headers[] = 'Authorization: ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    // 执行请求
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // 检查是否有错误
    if (curl_errno($ch)) {
        echo '<h2>请求错误</h2>';
        echo '<pre>' . htmlspecialchars(curl_error($ch)) . '</pre>';
    } else {
        echo '<h2>响应结果 (HTTP状态码: ' . $httpCode . ')</h2>';
        echo '<pre>' . htmlspecialchars($result) . '</pre>';
        
        // 尝试解析JSON
        $jsonResult = json_decode($result, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo '<h2>格式化JSON响应</h2>';
            echo '<pre>' . htmlspecialchars(json_encode($jsonResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
        }
    }
    
    // 关闭cURL资源
    curl_close($ch);
} 