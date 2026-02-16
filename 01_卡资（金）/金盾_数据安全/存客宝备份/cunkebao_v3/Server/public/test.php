<?php
// 测试登录API

$url = 'http://localhost/api/auth/login';
$data = json_encode([
    'username' => 'admin',
    'password' => '123456'
]);

// 初始化cURL
$ch = curl_init($url);

// 设置cURL选项
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data)
]);

// 执行请求
$result = curl_exec($ch);

// 检查是否有错误
if (curl_errno($ch)) {
    echo '请求错误: ' . curl_error($ch);
} else {
    // 输出结果
    echo '<pre>';
    print_r(json_decode($result, true));
    echo '</pre>';
}

// 关闭cURL资源
curl_close($ch); 