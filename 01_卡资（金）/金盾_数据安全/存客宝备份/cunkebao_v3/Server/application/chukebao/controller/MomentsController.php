<?php

namespace app\chukebao\controller;

use app\chukebao\model\KfMoments;
use library\ResponseHelper;
use think\Db;

class MomentsController extends BaseController
{
    /**
     * 创建朋友圈
     * @return \think\response\Json
     */
    public function create()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        
        // 获取请求参数
        $text = $this->request->param('content', ''); // 朋友圈内容
        $picUrlList = $this->request->param('picUrlList', []); // 图片列表
        $videoUrl = $this->request->param('videoUrl', ''); // 视频链接
        $link = $this->request->param('link', []); // 链接信息
        $momentContentType = (int)$this->request->param('type', 1); // 内容类型 1文本 2图文 3视频 4链接
        $publicMode = (int)$this->request->param('publicMode', 0); // 公开模式
        $wechatIds = $this->request->param('wechatIds', []); // 微信账号ID列表
        $labels = $this->request->param('labels', []); // 标签列表
        $timingTime = $this->request->param('timingTime', date('Y-m-d H:i:s')); // 定时发布时间
        $immediately = $this->request->param('immediately', false); // 是否立即发布
        
        // 格式化时间字符串为统一格式
        $timingTime = $this->normalizeTimingTime($timingTime);
        if ($timingTime === false) {
            return ResponseHelper::error('定时发布时间格式不正确');
        }
 
        // 参数验证
        if (empty($text) && empty($picUrlList) && empty($videoUrl)) {
            return ResponseHelper::error('朋友圈内容不能为空');
        }
        
        if (empty($wechatIds)) {
            return ResponseHelper::error('请选择发布账号');
        }
        
        // 校验内容类型
        if (!in_array($momentContentType, [1, 2, 3, 4])) {
            return ResponseHelper::error('内容类型不合法，支持：1文本 2图文 3视频 4链接');
        }

        if(!empty($labels)){
            $publicMode = 2;
        }
        
        // 根据内容类型校验必要参数
        switch ($momentContentType) {
            case 1: // 文本
                if (empty($text)) {
                    return ResponseHelper::error('文本类型必须填写内容');
                }
                break;
            case 2: // 图文
                if (empty($text) || empty($picUrlList)) {
                    return ResponseHelper::error('图文类型必须填写内容和上传图片');
                }
                break;
            case 3: // 视频
                if (empty($videoUrl)) {
                    return ResponseHelper::error('视频类型必须上传视频');
                }
                break;
            case 4: // 链接
                if (empty($link)) {
                    return ResponseHelper::error('链接类型必须填写链接信息');
                }
                if (empty($link['url'])) {
                    return ResponseHelper::error('链接类型必须填写链接地址');
                }
                if (empty($link['desc'])) {
                    return ResponseHelper::error('链接类型必须填写链接描述');
                }
                if (empty($link['image'])) {
                    return ResponseHelper::error('链接类型必须填写链接图片');
                }
                break;
        }
        
        // 处理链接信息 - 所有链接都必须验证
        if (!empty($link)) {
            $link = [
                'desc' => $link['desc'] ?? '',
                'image' => $link['image'] ?? '',
                'url' => $link['url'] ?? ''
            ];
            
            // 验证链接URL格式
            if (!empty($link['url']) && !filter_var($link['url'], FILTER_VALIDATE_URL)) {
                return ResponseHelper::error('链接地址格式不正确');
            }
        } else {
            $link = ['desc' => '', 'image' => '', 'url' => ''];
        }
        
        // 构建发布账号列表
        $jobPublishWechatMomentsItems = $this->buildJobPublishWechatMomentsItems($wechatIds, $labels);
        if (empty($jobPublishWechatMomentsItems)) {
            return ResponseHelper::error('无法获取有效的发布账号信息');
        }
        
        try {
            // 构建发送数据
            $sendData = [
                'altList' => '',
                'beginTime' => $timingTime,
                'endTime' => date('Y-m-d H:i:s', strtotime($timingTime) + 3600),
                'immediately' => $immediately,
                'isUseLocation' => false,
                'jobPublishWechatMomentsItems' => $jobPublishWechatMomentsItems,
                'lat' => 0,
                'lng' => 0,
                'link' => $link,
                'momentContentType' => $momentContentType,
                'picUrlList' => $picUrlList,
                'poiAddress' => '',
                'poiName' => '',
                'publicMode' => $publicMode,
                'text' => $text,
                'timingTime' => $timingTime ?: date('Y-m-d H:i:s'),
                'videoUrl' => $videoUrl
            ];
            
            // 保存到数据库
            $moments = new KfMoments();
            $moments->companyId = $companyId;
            $moments->userId = $userId;
            $moments->sendData = json_encode($sendData, 256);
            $nowTs = time();
            $moments->createTime = $nowTs;
            $moments->updateTime = $nowTs;
            $moments->isDel = 0;
            $moments->delTime = null;
            $moments->isSend = $immediately ? 1 : 0;
            $moments->sendTime = $immediately ? $nowTs : strtotime($timingTime);
            $moments->save();
            
            // 如果立即发布，调用发布接口
            if ($immediately) {
                $this->publishMoments($sendData);
            }
            return ResponseHelper::success('', '朋友圈创建成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('创建失败：' . $e->getMessage());
        }
    }
    
    /**
     * 编辑朋友圈
     * @return \think\response\Json
     */
    public function update()
    {
        $id = (int)$this->request->param('id', 0);
        if ($id <= 0) {
            return ResponseHelper::error('ID不合法');
        }

        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        // 获取请求参数（与创建一致的字段名）
        $text = $this->request->param('content', '');
        $picUrlList = $this->request->param('picUrlList', []);
        $videoUrl = $this->request->param('videoUrl', '');
        $link = $this->request->param('link', []);
        $momentContentType = (int)$this->request->param('type', 1);
        $publicMode = (int)$this->request->param('publicMode', 0);
        $wechatIds = $this->request->param('wechatIds', []);
        $labels = $this->request->param('labels', []);
        $timingTime = $this->request->param('timingTime', date('Y-m-d H:i:s'));
        $immediately = $this->request->param('immediately', false);
        
        // 格式化时间字符串为统一格式
        $timingTime = $this->normalizeTimingTime($timingTime);
        if ($timingTime === false) {
            return ResponseHelper::error('定时发布时间格式不正确');
        }

        // 读取待编辑记录
        /** @var KfMoments|null $moments */
        $moments = KfMoments::where(['id' => $id, 'companyId' => $companyId, 'userId' => $userId, 'isDel' => 0])->find();
        if (empty($moments)) {
            return ResponseHelper::error('朋友圈不存在');
        }

        // 参数校验
        if (empty($text) && empty($picUrlList) && empty($videoUrl)) {
            return ResponseHelper::error('朋友圈内容不能为空');
        }
        if (empty($wechatIds)) {
            return ResponseHelper::error('请选择发布账号');
        }
        if (!in_array($momentContentType, [1, 2, 3, 4])) {
            return ResponseHelper::error('内容类型不合法，支持：1文本 2图文 3视频 4链接');
        }
        if (!empty($labels)) {
            $publicMode = 2;
        }
        switch ($momentContentType) {
            case 1:
                if (empty($text)) {
                    return ResponseHelper::error('文本类型必须填写内容');
                }
                break;
            case 2:
                if (empty($text) || empty($picUrlList)) {
                    return ResponseHelper::error('图文类型必须填写内容和上传图片');
                }
                break;
            case 3:
                if (empty($videoUrl)) {
                    return ResponseHelper::error('视频类型必须上传视频');
                }
                break;
            case 4:
                if (empty($link)) {
                    return ResponseHelper::error('链接类型必须填写链接信息');
                }
                if (empty($link['url'])) {
                    return ResponseHelper::error('链接类型必须填写链接地址');
                }
                if (empty($link['desc'])) {
                    return ResponseHelper::error('链接类型必须填写链接描述');
                }
                if (empty($link['image'])) {
                    return ResponseHelper::error('链接类型必须填写链接图片');
                }
                break;
        }
        if (!empty($link)) {
            $link = [
                'desc' => $link['desc'] ?? '',
                'image' => $link['image'] ?? '',
                'url' => $link['url'] ?? ''
            ];
            if (!empty($link['url']) && !filter_var($link['url'], FILTER_VALIDATE_URL)) {
                return ResponseHelper::error('链接地址格式不正确');
            }
        } else {
            $link = ['desc' => '', 'image' => '', 'url' => ''];
        }

        // 构建账号列表
        $jobPublishWechatMomentsItems = $this->buildJobPublishWechatMomentsItems($wechatIds, $labels);
        if (empty($jobPublishWechatMomentsItems)) {
            return ResponseHelper::error('无法获取有效的发布账号信息');
        }

        try {
            $sendData = [
                'altList' => '',
                'beginTime' => $timingTime,
                'endTime' => date('Y-m-d H:i:s', strtotime($timingTime) + 1800),
                'immediately' => $immediately,
                'isUseLocation' => false,
                'jobPublishWechatMomentsItems' => $jobPublishWechatMomentsItems,
                'lat' => 0,
                'lng' => 0,
                'link' => $link,
                'momentContentType' => $momentContentType,
                'picUrlList' => $picUrlList,
                'poiAddress' => '',
                'poiName' => '',
                'publicMode' => $publicMode,
                'text' => $text,
                'timingTime' => $timingTime ?: date('Y-m-d H:i:s'),
                'videoUrl' => $videoUrl
            ];

            $moments->sendData = json_encode($sendData, 256);
            $moments->isSend = $immediately ? 1 : 0;
            $moments->sendTime = $immediately ? time() : strtotime($timingTime);
            $moments->updateTime = time();
            $moments->save();

            if ($immediately) {
                $this->publishMoments($sendData);
            }

            return ResponseHelper::success('', '朋友圈更新成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('更新失败：' . $e->getMessage());
        }
    }

    /**
     * 构建发布账号列表
     * @param array $wechatIds 微信账号ID列表
     * @param array $labels 标签列表
     * @return array
     */
    private function buildJobPublishWechatMomentsItems($wechatIds, $labels)
    {
        try {
            // 查询微信账号信息
            $wechatAccounts = Db::table('s2_wechat_account')
                ->whereIn('id', $wechatIds)
                ->field('id,labels')
                ->select();
            if (empty($wechatAccounts)) {
                return [];
            }
            
            $result = [];
            foreach ($wechatAccounts as $account) {
                $accountLabels = [];
                
                // 如果账号有标签，解析标签
                if (!empty($account['labels'])) {
                    $accountLabels = is_string($account['labels']) 
                        ? json_decode($account['labels'], true) 
                        : $account['labels'];
                }
                
                // 取传入标签与账号标签的交集
                $finalLabels = array_intersect($labels, $accountLabels);
                
                $result[] = [
                    'wechatAccountId' => $account['id'],
                    'labels' => array_values($finalLabels), // 重新索引数组
                    'comments' => []
                ];
            }
            
            return $result;
            
        } catch (\Exception $e) {
            \think\facade\Log::error('构建发布账号列表失败：' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 发布朋友圈到微信
     * @param array $sendData
     * @return bool
     */
    private function publishMoments($sendData)
    {
        try {
            // 这里调用实际的朋友圈发布接口
            // 根据您的系统架构，可能需要调用 WebSocket 或其他服务
            // 示例：调用 MomentsController 的 addJob 方法
            $moments = new \app\api\controller\MomentsController();
            return $moments->addJob($sendData);
        } catch (\Exception $e) {
            // 记录错误日志
            \think\facade\Log::error('朋友圈发布失败：' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 获取朋友圈列表
     * @return \think\response\Json
     */
    public function getList()
    {
        $page = (int)$this->request->param('page', 1);
        $limit = (int)$this->request->param('limit', 10);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        
        try {
            $list = KfMoments::where(['companyId' => $companyId, 'userId' => $userId, 'isDel' => 0])
                ->order('createTime desc')
                ->page($page, $limit)
                ->select();
            
            $total = KfMoments::where(['companyId' => $companyId, 'userId' => $userId, 'isDel' => 0])->count();
            
            // 处理数据
            $data = [];
            foreach ($list as $item) {
                $sendData = json_decode($item->sendData,true);
                $data[] = [
                    'id' => $item->id,
                    'content' => $sendData['text'] ?? '',
                    'momentContentType' => $sendData['momentContentType'] ?? 1,
                    'picUrlList' => $sendData['picUrlList'] ?? [],
                    'videoUrl' => $sendData['videoUrl'] ?? '',
                    'link' => $sendData['link'] ?? [],
                    'publicMode' => $sendData['publicMode'] ?? 2,
                    'isSend' => $item->isSend,
                    'sendTime' => date('Y-m-d H:i:s',$item->sendTime),
                    'accountCount' => count($sendData['jobPublishWechatMomentsItems'] ?? [])
                ];
            }
            
            return ResponseHelper::success([
                'list' => $data,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ], '获取成功');
            
        } catch (\Exception $e) {
            return ResponseHelper::error('获取失败：' . $e->getMessage());
        }
    }
    
    /**
     * 删除朋友圈
     * @return \think\response\Json
     */
    public function delete()
    {
        $id = (int)$this->request->param('id', 0);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        
        if ($id <= 0) {
            return ResponseHelper::error('ID不合法');
        }
        
        try {
        $moments = KfMoments::where(['id' => $id, 'companyId' => $companyId, 'userId' => $userId, 'isDel' => 0])->find();
            if (empty($moments)) {
                return ResponseHelper::error('朋友圈不存在');
            }
            
            $moments->isDel = 1;
            $moments->delTime = time();
            $moments->updateTime = time();
            $moments->save();
            return ResponseHelper::success([], '删除成功');
            
        } catch (\Exception $e) {
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }
    
    /**
     * 规范化时间字符串为 Y-m-d H:i:s 格式
     * 支持多种时间格式：
     * - "2026年1月5日15:43:00"
     * - "2026-01-05 15:43:00"
     * - "2026/01/05 15:43:00"
     * - 时间戳
     * @param string|int $timingTime 时间字符串或时间戳
     * @return string|false 格式化后的时间字符串，失败返回false
     */
    private function normalizeTimingTime($timingTime)
    {
        if (empty($timingTime)) {
            return date('Y-m-d H:i:s');
        }
        
        // 如果是时间戳
        if (is_numeric($timingTime) && strlen($timingTime) == 10) {
            return date('Y-m-d H:i:s', $timingTime);
        }
        
        // 如果是毫秒时间戳
        if (is_numeric($timingTime) && strlen($timingTime) == 13) {
            return date('Y-m-d H:i:s', intval($timingTime / 1000));
        }
        
        // 如果已经是标准格式，直接返回
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $timingTime)) {
            return $timingTime;
        }
        
        // 处理中文日期格式：2026年1月5日15:43:00 或 2026年01月05日15:43:00
        if (preg_match('/^(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2}):(\d{1,2}):(\d{1,2})$/', $timingTime, $matches)) {
            $year = $matches[1];
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $day = str_pad($matches[3], 2, '0', STR_PAD_LEFT);
            $hour = str_pad($matches[4], 2, '0', STR_PAD_LEFT);
            $minute = str_pad($matches[5], 2, '0', STR_PAD_LEFT);
            $second = str_pad($matches[6], 2, '0', STR_PAD_LEFT);
            return "{$year}-{$month}-{$day} {$hour}:{$minute}:{$second}";
        }
        
        // 处理中文日期格式（无秒）：2026年1月5日15:43
        if (preg_match('/^(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2}):(\d{1,2})$/', $timingTime, $matches)) {
            $year = $matches[1];
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $day = str_pad($matches[3], 2, '0', STR_PAD_LEFT);
            $hour = str_pad($matches[4], 2, '0', STR_PAD_LEFT);
            $minute = str_pad($matches[5], 2, '0', STR_PAD_LEFT);
            return "{$year}-{$month}-{$day} {$hour}:{$minute}:00";
        }
        
        // 尝试使用 strtotime 解析其他格式
        $timestamp = strtotime($timingTime);
        if ($timestamp !== false) {
            return date('Y-m-d H:i:s', $timestamp);
        }
        
        // 如果所有方法都失败，返回 false
        return false;
    }
}