<?php

namespace app\common;

class Video {

    /**
     * 图片合成视频
     *
     * @param array $images
     * @return string
     * @throws \Exception
     */
    static public function compositing(array $images) {
        if (empty($images)) {
            throw new \Exception('图片列表不能为空');
        }

        // 设置视频参数
        $width = 800;
        $height = 600; // 4:3 比例
        $frameRate = 30; // 调整帧率为30fps，使动画更流畅
        
        // 创建临时文件夹
        $tempDir = ROOT_PATH . DS . 'runtime' . DS . 'video_temp';
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }
        
        // 生成唯一的输出文件名
        $outputFile = $tempDir . DS . uniqid() . '.mp4';
        
        // 准备图片列表文件
        $listFile = $tempDir . DS . uniqid() . '.txt';
        $content = '';
        
        // 生成临时图片序列目录
        $tempImagesDir = $tempDir . DS . uniqid();
        if (!is_dir($tempImagesDir)) {
            mkdir($tempImagesDir, 0777, true);
        }

        // 处理每张图片，生成临时文件
        $tempImages = [];
        foreach ($images as $index => $image) {
            if (!file_exists($image)) {
                throw new \Exception('图片不存在：' . $image);
            }
            $tempImage = $tempImagesDir . DS . sprintf('%04d.jpg', $index);
            copy($image, $tempImage);
            $tempImages[] = $tempImage;
        }

        // 构建 FFmpeg 命令
        $filterComplex = [];
        
        // 处理所有输入流的格式和缩放
        foreach ($tempImages as $i => $image) {
            $filterComplex[] = sprintf('[%d:v]format=yuv420p,scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2[v%d]', 
                $i, $width, $height, $width, $height, $i);
        }

        // 构建转场效果链
        $lastOutput = 'v0';
        for ($i = 1; $i < count($tempImages); $i++) {
            $filterComplex[] = sprintf('[%s][v%d]xfade=transition=fade:duration=1:offset=%d[fade%d]', 
                $lastOutput, $i, ($i * 3) - 1, $i);
            $lastOutput = sprintf('fade%d', $i);
        }

        $inputFiles = '';
        foreach ($tempImages as $image) {
            $inputFiles .= sprintf('-loop 1 -t %d -i "%s" ', count($tempImages) * 3, $image);
        }

        $duration = count($tempImages) * 3 - (count($tempImages) - 1); // 总时长计算
        
        $cmd = sprintf(
            'ffmpeg5 %s -filter_complex "%s" -map "[%s]" -t %d -c:v libx264 -pix_fmt yuv420p -r %d "%s" 2>&1',
            $inputFiles,
            implode(';', $filterComplex),
            $lastOutput,
            $duration,
            $frameRate,
            $outputFile
        );

        // 执行命令
        exec($cmd, $output, $returnCode);

        // 清理临时文件
        array_map('unlink', glob($tempImagesDir . DS . '*'));
        rmdir($tempImagesDir);
        
        if ($returnCode !== 0) {
            throw new \Exception('视频生成失败：' . implode("\n", $output));
        }

        return $outputFile;
    }
}