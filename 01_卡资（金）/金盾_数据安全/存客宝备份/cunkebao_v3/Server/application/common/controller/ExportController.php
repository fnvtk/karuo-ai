<?php

namespace app\common\controller;

use PHPExcel;
use PHPExcel_IOFactory;
use PHPExcel_Worksheet_Drawing;
use think\Controller;
use think\Exception;

/**
 * 通用导出控制器，提供 Excel 导出与图片插入能力
 */
class ExportController extends Controller
{
    /**
     * @var array<string> 需要在请求结束时清理的临时文件
     */
    protected static $tempFiles = [];

    /**
     * 导出 Excel（支持指定列插入图片）
     *
     * @param string $fileName      输出文件名（可不带扩展名）
     * @param array  $headers       列定义，例如 ['name' => '姓名', 'phone' => '电话']
     * @param array  $rows          数据行，需与 $headers 的 key 对应
     * @param array  $imageColumns  需要渲染为图片的列 key 列表
     * @param string $sheetName     工作表名称
     * @param array  $options       额外选项：
     *                               - imageWidth(图片宽度，默认100)
     *                               - imageHeight(图片高度，默认100)
     *                               - imageColumnWidth(图片列宽，默认15)
     *                               - titleRow(标题行内容，支持多行文本数组)
     *
     * @throws Exception
     */
    public static function exportExcelWithImages(
        $fileName,
        array $headers,
        array $rows,
        array $imageColumns = [],
        $sheetName = 'Sheet1',
        array $options = []
    ) {
        if (empty($headers)) {
            throw new Exception('导出列定义不能为空');
        }
        if (empty($rows)) {
            throw new Exception('导出数据不能为空');
        }

        // 抑制 PHPExcel 库中已废弃的大括号语法警告（PHP 7.4+）
        $oldErrorReporting = error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);

        // 默认选项
        $imageWidth = isset($options['imageWidth']) ? (int)$options['imageWidth'] : 100;
        $imageHeight = isset($options['imageHeight']) ? (int)$options['imageHeight'] : 100;
        $imageColumnWidth = isset($options['imageColumnWidth']) ? (float)$options['imageColumnWidth'] : 15;
        $rowHeight = isset($options['rowHeight']) ? (int)$options['rowHeight'] : ($imageHeight + 10);

        $excel = new PHPExcel();
        $sheet = $excel->getActiveSheet();
        $sheet->setTitle($sheetName);

        $columnKeys = array_keys($headers);
        $totalColumns = count($columnKeys);
        $lastColumnLetter = self::columnLetter($totalColumns - 1);

        // 定义特定列的固定宽度（如果未指定则使用默认值）
        $columnWidths = isset($options['columnWidths']) ? $options['columnWidths'] : [];
        
        // 检查是否有标题行
        $titleRow = isset($options['titleRow']) ? $options['titleRow'] : null;
        $dataStartRow = 1; // 数据开始行（表头行）
        
        // 如果有标题行，先写入标题行（支持数组或字符串）
        if (!empty($titleRow)) {
            $dataStartRow = 2; // 数据从第2行开始（第1行是标题，第2行是表头）
            
            // 合并标题行单元格（从第一列到最后一列）
            $titleRange = 'A1:' . $lastColumnLetter . '1';
            $sheet->mergeCells($titleRange);
            
            // 构建标题内容（支持多行数组或字符串）
            $titleContent = '';
            if (is_array($titleRow)) {
                $titleContent = implode("\n", $titleRow);
            } else {
                $titleContent = (string)$titleRow;
            }
            
            // 写入标题
            $sheet->setCellValue('A1', $titleContent);
            
            // 设置标题行样式
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16],
                'alignment' => [
                    'horizontal' => \PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PHPExcel_Style_Alignment::VERTICAL_CENTER,
                    'wrap' => true
                ],
                'fill' => [
                    'type' => \PHPExcel_Style_Fill::FILL_SOLID,
                    'color' => ['rgb' => 'FFF8DC'] // 浅黄色背景
                ],
                'borders' => [
                    'allborders' => [
                        'style' => \PHPExcel_Style_Border::BORDER_THIN,
                        'color' => ['rgb' => '000000']
                    ]
                ]
            ]);
            $sheet->getRowDimension(1)->setRowHeight(80); // 标题行高度
        }
        
        // 写入表头并设置列宽
        $headerRow = $dataStartRow;
        foreach ($columnKeys as $index => $key) {
            $columnLetter = self::columnLetter($index);
            $sheet->setCellValue($columnLetter . $headerRow, $headers[$key]);
            
            // 如果是图片列，设置固定列宽
            if (in_array($key, $imageColumns, true)) {
                $sheet->getColumnDimension($columnLetter)->setWidth($imageColumnWidth);
            } elseif (isset($columnWidths[$key])) {
                // 如果指定了该列的宽度，使用指定宽度
                $sheet->getColumnDimension($columnLetter)->setWidth($columnWidths[$key]);
            } else {
                // 否则自动调整
                $sheet->getColumnDimension($columnLetter)->setAutoSize(true);
            }
        }

        // 设置表头样式
        $headerRange = 'A' . $headerRow . ':' . $lastColumnLetter . $headerRow;
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'size' => 11],
            'alignment' => [
                'horizontal' => \PHPExcel_Style_Alignment::HORIZONTAL_CENTER, 
                'vertical' => \PHPExcel_Style_Alignment::VERTICAL_CENTER,
                'wrap' => true
            ],
            'fill' => [
                'type' => \PHPExcel_Style_Fill::FILL_SOLID,
                'color' => ['rgb' => 'FFF8DC']
            ],
            'borders' => [
                'allborders' => [
                    'style' => \PHPExcel_Style_Border::BORDER_THIN,
                    'color' => ['rgb' => '000000']
                ]
            ]
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(30); // 增加表头行高以确保文本完整显示

        // 写入数据与图片
        $dataRowStart = $dataStartRow + 1; // 数据从表头行下一行开始
        foreach ($rows as $rowIndex => $rowData) {
            $excelRow = $dataRowStart + $rowIndex; // 数据行
            $maxRowHeight = $rowHeight; // 记录当前行的最大高度
            
            foreach ($columnKeys as $colIndex => $key) {
                $columnLetter = self::columnLetter($colIndex);
                $cell = $columnLetter . $excelRow;
                $value = isset($rowData[$key]) ? $rowData[$key] : '';

                if (in_array($key, $imageColumns, true) && !empty($value)) {
                    $imagePath = self::resolveImagePath($value);
                    if ($imagePath) {
                        // 获取图片实际尺寸并等比例缩放
                        $imageSize = @getimagesize($imagePath);
                        if ($imageSize) {
                            $originalWidth = $imageSize[0];
                            $originalHeight = $imageSize[1];
                            
                            // 计算等比例缩放后的尺寸
                            $ratio = min($imageWidth / $originalWidth, $imageHeight / $originalHeight);
                            $scaledWidth = $originalWidth * $ratio;
                            $scaledHeight = $originalHeight * $ratio;
                            
                            // 确保不超过最大尺寸
                            if ($scaledWidth > $imageWidth) {
                                $scaledWidth = $imageWidth;
                                $scaledHeight = $originalHeight * ($imageWidth / $originalWidth);
                            }
                            if ($scaledHeight > $imageHeight) {
                                $scaledHeight = $imageHeight;
                                $scaledWidth = $originalWidth * ($imageHeight / $originalHeight);
                            }
                            
                            $drawing = new PHPExcel_Worksheet_Drawing();
                            $drawing->setPath($imagePath);
                            $drawing->setCoordinates($cell);
                            
                            // 居中显示图片（Excel列宽1单位≈7像素，行高1单位≈0.75像素）
                            $cellWidthPx = $imageColumnWidth * 7;
                            $cellHeightPx = $maxRowHeight * 0.75;
                            $offsetX = max(2, ($cellWidthPx - $scaledWidth) / 2);
                            $offsetY = max(2, ($cellHeightPx - $scaledHeight) / 2);
                            
                            $drawing->setOffsetX((int)$offsetX);
                            $drawing->setOffsetY((int)$offsetY);
                            $drawing->setWidth((int)$scaledWidth);
                            $drawing->setHeight((int)$scaledHeight);
                            $drawing->setWorksheet($sheet);
                            
                            // 更新行高以适应图片（留出一些边距）
                            $neededHeight = (int)($scaledHeight / 0.75) + 10;
                            if ($neededHeight > $maxRowHeight) {
                                $maxRowHeight = $neededHeight;
                            }
                        } else {
                            // 如果无法获取图片尺寸，使用默认尺寸
                            $drawing = new PHPExcel_Worksheet_Drawing();
                            $drawing->setPath($imagePath);
                            $drawing->setCoordinates($cell);
                            $drawing->setOffsetX(5);
                            $drawing->setOffsetY(5);
                            $drawing->setWidth($imageWidth);
                            $drawing->setHeight($imageHeight);
                            $drawing->setWorksheet($sheet);
                        }
                    } else {
                        $sheet->setCellValue($cell, '');
                    }
                } else {
                    $sheet->setCellValue($cell, $value);
                    // 设置文本对齐和换行
                    $style = $sheet->getStyle($cell);
                    $style->getAlignment()->setVertical(\PHPExcel_Style_Alignment::VERTICAL_CENTER);
                    $style->getAlignment()->setWrapText(true);
                    // 根据列类型设置水平对齐
                    if (in_array($key, ['date', 'postTime'])) {
                        $style->getAlignment()->setHorizontal(\PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
                    } else {
                        $style->getAlignment()->setHorizontal(\PHPExcel_Style_Alignment::HORIZONTAL_LEFT);
                    }
                }
            }
            
            // 设置行高
            $sheet->getRowDimension($excelRow)->setRowHeight($maxRowHeight);
        }

        $safeName = preg_replace('/[^\w\-]/', '_', $fileName ?: 'export_' . date('Ymd_His'));
        if (stripos($safeName, '.xlsx') === false) {
            $safeName .= '.xlsx';
        }

        if (ob_get_length()) {
            ob_end_clean();
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Cache-Control: max-age=0');
        header('Content-Disposition: attachment;filename="' . $safeName . '"');

        try {
            $writer = PHPExcel_IOFactory::createWriter($excel, 'Excel2007');
            $writer->save('php://output');
        } catch (\Exception $e) {
            // 恢复错误报告级别
            error_reporting($oldErrorReporting);
            throw $e;
        }
        
        // 恢复错误报告级别
        error_reporting($oldErrorReporting);
        self::cleanupTempFiles();
        exit;
    }

    /**
     * 根据列序号生成 Excel 列字母
     *
     * @param int $index
     * @return string
     */
    protected static function columnLetter($index)
    {
        $letters = '';
        do {
            $letters = chr($index % 26 + 65) . $letters;
            $index = intval($index / 26) - 1;
        } while ($index >= 0);

        return $letters;
    }

    /**
     * 将远程或本地图片路径转换为可用的本地文件路径
     *
     * @param string $path
     * @return string|null
     */
    protected static function resolveImagePath($path)
    {
        if (empty($path)) {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $path)) {
            $tempFile = tempnam(sys_get_temp_dir(), 'export_img_');
            $stream = @file_get_contents($path);
            if ($stream === false) {
                return null;
            }
            file_put_contents($tempFile, $stream);
            self::$tempFiles[] = $tempFile;
            return $tempFile;
        }

        if (file_exists($path)) {
            return $path;
        }

        return null;
    }

    /**
     * 清理所有临时文件
     */
    protected static function cleanupTempFiles()
    {
        foreach (self::$tempFiles as $file) {
            if (file_exists($file)) {
                @unlink($file);
            }
        }
        self::$tempFiles = [];
    }
}