<?php

namespace app\cunkebao\controller\plan;

use library\ResponseHelper;
use think\Controller;
use think\Db;
use app\cunkebao\service\DistributionRewardService;

/**
 * 对外API接口控制器
 */
class PostExternalApiV1Controller extends Controller
{

    /**
     * 验证签名
     *
     * @param array $params 请求参数
     * @param string $apiKey API密钥
     * @param string $sign 签名
     * @return bool
     */
    private function validateSign($params, $apiKey, $sign)
    {
        // 1. 从参数中移除sign和apiKey
        unset($params['sign'], $params['apiKey'],$params['portrait']);
        
        // 2. 移除空值
        $params = array_filter($params, function($value) {
            return !is_null($value) && $value !== '';
        });
        
        // 3. 参数按键名升序排序
        ksort($params);
        
        // 4. 直接拼接参数值
        $stringToSign = implode('', array_values($params));
        
        // 5. 第一次MD5加密
        $firstMd5 = md5($stringToSign);
        
        // 6. 拼接apiKey并第二次MD5加密
        $expectedSign = md5($firstMd5 . $apiKey);
        
        // 7. 比对签名
        return $expectedSign === $sign;
    }

    /**
     * 对外API接口入口
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            
            // 验证必填参数
            if (empty($params['apiKey'])) {
                return ResponseHelper::error('apiKey不能为空', 400);
            }
            
            if (empty($params['sign'])) {
                return ResponseHelper::error('sign不能为空', 400);
            }
            
            if (empty($params['timestamp'])) {
                return ResponseHelper::error('timestamp不能为空', 400);
            }

            // 验证时间戳（允许5分钟误差）
            if (abs(time() - intval($params['timestamp'])) > 300) {
                return ResponseHelper::error('请求已过期', 400);
            }

            // 查询API密钥是否存在
            $plan = Db::name('customer_acquisition_task')
                ->where('apiKey', $params['apiKey'])
                ->where('status', 1)
                ->find();

            if (!$plan) {
                return ResponseHelper::error('无效的apiKey', 401);
            }

            // 验证签名
            if (!$this->validateSign($params,$params['apiKey'], $params['sign'])) {
                return ResponseHelper::error('签名验证失败', 401);
            }

            $identifier = !empty($params['wechatId']) ? $params['wechatId'] : $params['phone'];

            // 渠道ID（cid），对应 distribution_channel.id
            $channelId = !empty($params['cid']) ? intval($params['cid']) : 0;


            $trafficPool = Db::name('traffic_pool')->where('identifier', $identifier)->find();
            if (!$trafficPool) {
                $trafficPoolId =Db::name('traffic_pool')->insertGetId([
                    'identifier' => $identifier,
                    'mobile' => !empty($params['phone']) ? $params['phone'] : '',
                    'createTime' => time()
                ]);
            }else{
                $trafficPoolId = $trafficPool['id'];
            }
          
            $taskCustomer = Db::name('task_customer')
                ->where('task_id', $plan['id'])
                ->where('phone', $identifier)
                ->find();
           
            // 处理用户画像
            if(!empty($params['portrait']) && is_array($params['portrait'])){
              $this->updatePortrait($params['portrait'],$trafficPoolId,$plan['companyId']);
            }
            if (!$taskCustomer) {
                $tags = !empty($params['tags']) ?  explode(',', $params['tags']) : [];
                $siteTags = !empty($params['siteTags']) ?  explode(',', $params['siteTags']) : [];

                // 处理渠道ID：只有在分销配置中允许、且渠道本身正常时，才记录到task_customer
                $finalChannelId = 0;
                if ($channelId > 0) {
                    $sceneConf = json_decode($plan['sceneConf'], true) ?: [];
                    $distributionConfig = $sceneConf['distribution'] ?? null;
                    $allowedChannelIds = $distributionConfig['channels'] ?? [];
                    if (!empty($distributionConfig) && !empty($distributionConfig['enabled']) && in_array($channelId, $allowedChannelIds)) {
                        // 验证渠道是否存在且正常
                        $channel = Db::name('distribution_channel')
                            ->where([
                                ['id', '=', $channelId],
                                ['companyId', '=', $plan['companyId']],
                                ['status', '=', 'enabled'],
                                ['deleteTime', '=', 0]
                            ])
                            ->find();
                        if ($channel) {
                            $finalChannelId = intval($channelId);
                        }
                    }
                }

                $customerId = Db::name('task_customer')->insertGetId([
                    'task_id' => $plan['id'],
                    'channelId' => $finalChannelId,
                    'phone' => $identifier,
                    'name' =>  !empty($params['name']) ? $params['name'] : '',
                    'source' => !empty($params['source']) ? $params['source'] : '',
                    'remark' => !empty($params['remark']) ? $params['remark'] : '',
                    'tags' => json_encode($tags,256),
                    'siteTags' => json_encode($siteTags,256),
                    'createTime' => time(),
                ]);

                // 记录获客奖励（异步处理，不影响主流程）
                if ($customerId) {
                    try {
                        // 只有在存在有效渠道ID时才触发分佣
                        if ($finalChannelId > 0) {
                            DistributionRewardService::recordCustomerReward($plan['id'], $customerId, $identifier, $finalChannelId);
                        }
                    } catch (\Exception $e) {
                        // 记录错误但不影响主流程
                        \think\facade\Log::error('记录获客奖励失败：' . $e->getMessage());
                    }
                }

                return json([
                    'code' => 200,
                    'message' => '新增成功',
                    'data' => $identifier
                ]);
            }else{
                $siteTags = !empty($params['siteTags']) ?  explode(',',$params['siteTags']) : [];
                
                // 更新新老标签数据，实现去重
                $this->updateSiteTags($taskCustomer['id'], $siteTags);

                return json([
                    'code' => 200,
                    'message' => '已存在',
                    'data' => $identifier
                ]);
            }
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 用户画像
     * @param array $data 用户画像数据
     * @param int $trafficPoolId 流量池id
     */
    public function updatePortrait($data,$trafficPoolId,$companyId)
    {
        if(empty($data) || empty($trafficPoolId) || !is_array($data)){
            return;
        }

        $type = !empty($data['type']) ? $data['type'] : 0;
        $source = !empty($data['source']) ? $data['source'] : 0;
        $sourceData = !empty($data['sourceData']) ? $data['sourceData'] : [];
        $remark = !empty($data['remark']) ? $data['remark'] : '';
        $uniqueId = !empty($data['uniqueId']) ? $data['uniqueId'] : 0;
        ksort($sourceData);
        $sourceData = json_encode($sourceData,256);


        $data = [
            'companyId' => $companyId,
            'trafficPoolId' => $trafficPoolId,
            'type' => $type,
            'source' => $source,
            'sourceData' => $sourceData,
            'remark' => $remark,
            'uniqueId' => $uniqueId,
            'count' => 1,
            'createTime' => time(),
            'updateTime' => time(),
        ];

        $res= Db::name('user_portrait')
        ->where(['trafficPoolId'=>$trafficPoolId,'type'=>$type,'source'=>$source,'uniqueId'=>$uniqueId])
        ->where('createTime','>',time()-1800)
        ->find();
        if($res){
            $count = $res['count'] + 1;
            Db::name('user_portrait')->where(['id'=>$res['id']])->update(['count'=>$count,'updateTime'=>time()]);
        }else{
            Db::name('user_portrait')->insert($data);
        }

    }

    /**
     * 更新站点标签数据，实现去重
     * @param int $taskCustomerId 任务客户ID
     * @param array $newSiteTags 新的站点标签数组
     */
    private function updateSiteTags($taskCustomerId, $newSiteTags)
    {

        if (empty($taskCustomerId) || empty($newSiteTags) || !is_array($newSiteTags)) {
            return;
        }

        try {
            // 获取当前任务客户的站点标签
            $taskCustomer = Db::name('task_customer')->where('id', $taskCustomerId)->find();

            if (!$taskCustomer) {
                return;
            }

            // 解析现有的站点标签
            $existingSiteTags = [];
            if (!empty($taskCustomer['siteTags'])) {
                $existingSiteTags = json_decode($taskCustomer['siteTags'], true);
                if (!is_array($existingSiteTags)) {
                    $existingSiteTags = [];
                }
            }

            // 合并新老标签并去重
            $mergedSiteTags = array_merge($existingSiteTags, $newSiteTags);
            $uniqueSiteTags = array_unique($mergedSiteTags);

            // 过滤空值并重新索引数组
            $uniqueSiteTags = array_values(array_filter($uniqueSiteTags, function($tag) {
                return !empty(trim($tag));
            }));

     
            // 更新数据库中的站点标签
            Db::name('task_customer')->where('id', $taskCustomerId)->update([
                'siteTags' => json_encode($uniqueSiteTags, JSON_UNESCAPED_UNICODE),
                'updateTime' => time()
            ]);

        } catch (\Exception $e) {
            // 记录错误日志，但不影响主流程
            \think\facade\Log::error('更新站点标签失败: ' . $e->getMessage());
        }
    }
} 