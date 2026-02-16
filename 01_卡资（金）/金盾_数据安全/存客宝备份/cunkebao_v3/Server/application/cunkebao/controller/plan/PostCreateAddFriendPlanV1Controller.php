<?php

namespace app\cunkebao\controller\plan;

use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;
use think\facade\Request;

/**
 * 获客场景控制器
 */
class PostCreateAddFriendPlanV1Controller extends BaseController
{


    /**
     * 生成唯一API密钥
     *
     * @return string
     */
    public function generateApiKey()
    {
        // 生成5组随机字符串，每组5个字符
        $chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $apiKey = '';

        for ($i = 0; $i < 5; $i++) {
            $segment = '';
            for ($j = 0; $j < 5; $j++) {
                $segment .= $chars[mt_rand(0, strlen($chars) - 1)];
            }
            $apiKey .= ($i > 0 ? '-' : '') . $segment;
        }

        // 检查是否已存在
        $exists = Db::name('customer_acquisition_task')
            ->where('apiKey', $apiKey)
            ->find();

        if ($exists) {
            // 如果已存在，递归重新生成
            return $this->generateApiKey();
        }

        return $apiKey;
    }

    /**
     * 添加计划任务
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->param();

            // 验证必填字段
            if (empty($params['name'])) {
                return ResponseHelper::error('计划名称不能为空', 400);
            }

            if (empty($params['sceneId'])) {
                return ResponseHelper::error('场景ID不能为空', 400);
            }

            if (empty($params['deviceGroups'])) {
                return ResponseHelper::error('请选择设备', 400);
            }

            // 拉群配置校验
            // groupInviteEnabled：拉群开关（0/1）
            // groupName：群名称
            // groupFixedMembers：固定成员（数组）
            $groupInviteEnabled = !empty($params['groupInviteEnabled']) ? 1 : 0;
            if ($groupInviteEnabled) {
                if (empty($params['groupName'])) {
                    return ResponseHelper::error('拉群群名不能为空', 400);
                }

                if (empty($params['groupFixedMembers']) || !is_array($params['groupFixedMembers'])) {
                    return ResponseHelper::error('固定成员不能为空', 400);
                }
            }

            $companyId = $this->getUserInfo('companyId');

            // 处理分销配置
            $distributionConfig = $this->processDistributionConfig($params, $companyId);

            // 归类参数
            $msgConf = isset($params['messagePlans']) ? $params['messagePlans'] : [];
            $tagConf = [
                'scenarioTags' => $params['scenarioTags'] ?? [],
                'customTags' => $params['customTags'] ?? [],
            ];
            $reqConf = [
                'device' => $params['deviceGroups'] ?? [],
                'remarkType' => $params['remarkType'] ?? '',
                'greeting' => $params['greeting'] ?? '',
                'addFriendInterval' => $params['addFriendInterval'] ?? '',
                'startTime' => $params['startTime'] ?? '',
                'endTime' => $params['endTime'] ?? '',
            ];
            // 其余参数归为sceneConf
            $sceneConf = $params;
            unset(
                $sceneConf['id'],
                $sceneConf['apiKey'],
                $sceneConf['userId'],
                $sceneConf['status'],
                $sceneConf['planId'],
                $sceneConf['name'],
                $sceneConf['sceneId'],
                $sceneConf['messagePlans'],
                $sceneConf['scenarioTags'],
                $sceneConf['customTags'],
                $sceneConf['device'],
                $sceneConf['orderTableFileName'],
                $sceneConf['userInfo'],
                $sceneConf['textUrl'],
                $sceneConf['remarkType'],
                $sceneConf['greeting'],
                $sceneConf['addFriendInterval'],
                $sceneConf['startTime'],
                $sceneConf['orderTableFile'],
                $sceneConf['endTime'],
                $sceneConf['distributionEnabled'],
                $sceneConf['distributionChannels'],
                $sceneConf['customerRewardAmount'],
                $sceneConf['addFriendRewardAmount'],
                // 拉群相关字段单独存表，不放到 sceneConf
                $sceneConf['groupInviteEnabled'],
                $sceneConf['groupName'],
                $sceneConf['groupFixedMembers']
            );

            // 将分销配置添加到sceneConf中
            $sceneConf['distribution'] = $distributionConfig;

            // 构建数据
            $data = [
                'name' => $params['name'],
                'sceneId' => $params['sceneId'],
                'sceneConf' => json_encode($sceneConf, JSON_UNESCAPED_UNICODE),
                'reqConf' => json_encode($reqConf, JSON_UNESCAPED_UNICODE),
                'msgConf' => json_encode($msgConf, JSON_UNESCAPED_UNICODE),
                'tagConf' => json_encode($tagConf, JSON_UNESCAPED_UNICODE),
                'userId' => $this->getUserInfo('id'),
                'companyId' => $this->getUserInfo('companyId'),
                'status' => !empty($params['status']) ? 1 : 0,
                // 计划类型：0=全局，1=独立（默认）
                'planType' => isset($params['planType']) ? intval($params['planType']) : 1,
                // 拉群配置
                'groupInviteEnabled' => $groupInviteEnabled,
                'groupName' => $params['groupName'] ?? '',
                'groupFixedMembers' => !empty($params['groupFixedMembers'])
                    ? json_encode($params['groupFixedMembers'], JSON_UNESCAPED_UNICODE)
                    : json_encode([], JSON_UNESCAPED_UNICODE),
                'apiKey' => $this->generateApiKey(), // 生成API密钥
                'createTime' => time(),
                'updateTime' => time(),
            ];


            try {
                Db::startTrans();
                // 插入数据
                $planId = Db::name('customer_acquisition_task')->insertGetId($data);

                if (!$planId) {
                    throw new \Exception('添加计划失败');
                }


                //订单
                if ($params['sceneId'] == 2) {
                    if (!empty($params['orderFileUrl'])) {
                        // 先下载到本地临时文件，再分析，最后删除
                        $originPath = $params['orderFileUrl'];
                        $tmpFile = tempnam(sys_get_temp_dir(), 'order_');
                        // 判断是否为远程文件
                        if (preg_match('/^https?:\/\//i', $originPath)) {
                            // 远程URL，下载到本地
                            $fileContent = file_get_contents($originPath);
                            if ($fileContent === false) {
                                exit('远程文件下载失败: ' . $originPath);
                            }
                            file_put_contents($tmpFile, $fileContent);
                        } else {
                            // 本地文件，直接copy
                            if (!file_exists($originPath)) {
                                exit('文件不存在: ' . $originPath);
                            }
                            copy($originPath, $tmpFile);
                        }
                        // 解析临时文件
                        $ext = strtolower(pathinfo($originPath, PATHINFO_EXTENSION));
                        $rows = [];
                        if (in_array($ext, ['xls', 'xlsx'])) {
                            // 直接用composer自动加载的PHPExcel
                            $excel = \PHPExcel_IOFactory::load($tmpFile);
                            $sheet = $excel->getActiveSheet();
                            $data = $sheet->toArray();
                            if (count($data) > 1) {
                                array_shift($data); // 去掉表头
                            }

                            foreach ($data as $cols) {
                                $rows[] = [
                                    'name' => isset($cols[0]) ? trim($cols[0]) : '',
                                    'phone' => isset($cols[1]) ? trim($cols[1]) : '',
                                    'wechatId' => isset($cols[2]) ? trim($cols[2]) : '',
                                    'source' => isset($cols[3]) ? trim($cols[3]) : '',
                                    'orderAmount' => isset($cols[4]) ? trim($cols[4]) : '',
                                    'orderDate' => isset($cols[5]) ? trim($cols[5]) : '',
                                ];
                            }
                        } elseif ($ext === 'csv') {
                            $content = file_get_contents($tmpFile);
                            $lines = preg_split('/\r\n|\r|\n/', $content);
                            if (count($lines) > 1) {
                                array_shift($lines); // 去掉表头
                                foreach ($lines as $line) {
                                    if (trim($line) === '') continue;
                                    $cols = str_getcsv($line);
                                    if (count($cols) >= 6) {
                                        $rows[] = [
                                            'name' => isset($cols[0]) ? trim($cols[0]) : '',
                                            'phone' => isset($cols[1]) ? trim($cols[1]) : '',
                                            'wechatId' => isset($cols[2]) ? trim($cols[2]) : '',
                                            'source' => isset($cols[3]) ? trim($cols[3]) : '',
                                            'orderAmount' => isset($cols[4]) ? trim($cols[4]) : '',
                                            'orderDate' => isset($cols[5]) ? trim($cols[5]) : '',
                                        ];
                                    }
                                }
                            }
                        } else {
                            unlink($tmpFile);
                            exit('暂不支持的文件类型: ' . $ext);
                        }
                        // 删除临时文件
                        unlink($tmpFile);
                    }
                }

                //电话获客
                if ($params['sceneId'] == 5) {
                    $rows = Db::name('call_recording')
                        ->where('companyId', $this->getUserInfo('companyId'))
                        ->group('phone')
                        ->field('id,phone')
                        ->select();
                }


                //群获客
                if ($params['sceneId'] == 7) {
                    if (!empty($params['wechatGroups']) && is_array($params['wechatGroups'])) {
                        $rows = Db::name('wechat_group_member')->alias('gm')
                            ->join('wechat_account wa', 'gm.identifier = wa.wechatId')
                            ->whereIn('gm.groupId', $params['wechatGroups'])
                            ->group('gm.identifier')
                            ->column('wa.id,wa.wechatId,wa.alias,wa.phone');
                    }
                }


                if (in_array($params['sceneId'], [2, 5, 7]) && !empty($rows) && is_array($rows)) {
                    // 1000条为一组进行批量处理
                    $batchSize = 1000;
                    $totalRows = count($rows);

                    for ($i = 0; $i < $totalRows; $i += $batchSize) {
                        $batchRows = array_slice($rows, $i, $batchSize);

                        if (!empty($batchRows)) {
                            // 1. 提取当前批次的phone
                            $phones = [];
                            foreach ($batchRows as $row) {
                                if (!empty($row['phone'])) {
                                    $phone = $row['phone'];
                                } elseif (!empty($row['alias'])) {
                                    $phone = $row['alias'];
                                } else {
                                    $phone = $row['wechatId'];
                                }
                                if (!empty($phone)) {
                                    $phones[] = $phone;
                                }
                            }

                            // 2. 批量查询已存在的phone
                            $existingPhones = [];
                            if (!empty($phones)) {
                                $existing = Db::name('task_customer')
                                    ->where('task_id', $planId)
                                    ->where('phone', 'in', $phones)
                                    ->field('phone')
                                    ->select();
                                $existingPhones = array_column($existing, 'phone');
                            }

                            // 3. 过滤出新数据，批量插入
                            $newData = [];
                            foreach ($batchRows as $row) {
                                if (!empty($row['phone'])) {
                                    $phone = $row['phone'];
                                } elseif (!empty($row['alias'])) {
                                    $phone = $row['alias'];
                                } else {
                                    $phone = $row['wechatId'];
                                }
                                if (!empty($phone) && !in_array($phone, $existingPhones)) {
                                    $newData[] = [
                                        'task_id' => $planId,
                                        'name' => '',
                                        'source' => '场景获客_' . $params['name'] ?? '',
                                        'phone' => $phone,
                                        'tags' => json_encode([], JSON_UNESCAPED_UNICODE),
                                        'siteTags' => json_encode([], JSON_UNESCAPED_UNICODE),
                                        'createTime' => time(),
                                    ];
                                }
                            }

                            // 4. 批量插入新数据
                            if (!empty($newData)) {
                                Db::name('task_customer')->insertAll($newData);
                            }
                        }
                    }
                }


                Db::commit();

                return ResponseHelper::success(['planId' => $planId], '添加计划任务成功');

            } catch (\Exception $e) {
                // 回滚事务
                Db::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 验证JSON格式是否正确
     *
     * @param string $string
     * @return bool
     */
    private function validateJson($string)
    {
        if (empty($string)) {
            return true;
        }

        json_decode($string);
        return (json_last_error() == JSON_ERROR_NONE);
    }

    /**
     * 处理分销配置
     *
     * @param array $params 请求参数
     * @param int $companyId 公司ID
     * @return array 分销配置
     */
    private function processDistributionConfig($params, $companyId)
    {
        $distributionEnabled = !empty($params['distributionEnabled']) ? true : false;
        
        $config = [
            'enabled' => $distributionEnabled,
            'channels' => [],
            'customerRewardAmount' => 0, // 获客奖励金额（分）
            'addFriendRewardAmount' => 0, // 添加奖励金额（分）
        ];

        // 如果未开启分销，直接返回默认配置
        if (!$distributionEnabled) {
            return $config;
        }

        // 验证渠道ID
        $channelIds = $params['distributionChannels'] ?? [];
        if (empty($channelIds) || !is_array($channelIds)) {
            throw new \Exception('请选择至少一个分销渠道');
        }

        // 查询有效的渠道（只保留存在且已启用的渠道）
        $channels = Db::name('distribution_channel')
            ->where([
                ['id', 'in', $channelIds],
                ['companyId', '=', $companyId],
                ['status', '=', 'enabled'],
                ['deleteTime', '=', 0]
            ])
            ->field('id,code,name')
            ->select();

        // 如果没有有效渠道，才报错
        if (empty($channels)) {
            throw new \Exception('所选的分销渠道均不存在或已被禁用，请重新选择');
        }

        // 只保留有效的渠道ID
        $config['channels'] = array_column($channels, 'id');

        // 验证获客奖励金额（元转分）
        $customerRewardAmount = isset($params['customerRewardAmount']) ? floatval($params['customerRewardAmount']) : 0;
        if ($customerRewardAmount < 0) {
            throw new \Exception('获客奖励金额不能为负数');
        }
        if ($customerRewardAmount > 0 && !preg_match('/^\d+(\.\d{1,2})?$/', (string)$customerRewardAmount)) {
            throw new \Exception('获客奖励金额格式不正确，最多保留2位小数');
        }
        $config['customerRewardAmount'] = intval(round($customerRewardAmount * 100)); // 元转分

        // 验证添加奖励金额（元转分）
        $addFriendRewardAmount = isset($params['addFriendRewardAmount']) ? floatval($params['addFriendRewardAmount']) : 0;
        if ($addFriendRewardAmount < 0) {
            throw new \Exception('添加奖励金额不能为负数');
        }
        if ($addFriendRewardAmount > 0 && !preg_match('/^\d+(\.\d{1,2})?$/', (string)$addFriendRewardAmount)) {
            throw new \Exception('添加奖励金额格式不正确，最多保留2位小数');
        }
        $config['addFriendRewardAmount'] = intval(round($addFriendRewardAmount * 100)); // 元转分

        return $config;
    }
} 