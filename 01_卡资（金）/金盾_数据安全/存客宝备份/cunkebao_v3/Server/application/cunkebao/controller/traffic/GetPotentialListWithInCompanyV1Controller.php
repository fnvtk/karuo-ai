<?php

namespace app\cunkebao\controller\traffic;

use app\common\model\TrafficPool as TrafficPoolModel;
use app\common\model\TrafficSource as TrafficSourceModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 流量池控制器
 */
class GetPotentialListWithInCompanyV1Controller extends BaseController
{
    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        $keyword = $this->request->param('keyword', '');
        $device = $this->request->param('deviceId');
        $status = $this->request->param('addStatus', '');
        $taskId = $this->request->param('taskId', '');
        $packageId = $this->request->param('packageId', '');
        $where = [];
        if (!empty($keyword)) {
            $where[] = ['p.identifier|wa.nickname|wa.phone|wa.wechatId|wa.alias', 'like', '%' . $keyword . '%'];
        }

        // 状态筛选
        if (!empty($status)) {
            if ($status == 1) {
                $where[] = ['s.status', '=', 4];
            } elseif ($status == 2) {
                $where[] = ['s.status', '=', 0];
            } elseif ($status == -1) {
                $where[] = ['s.status', '=', 2];
            } elseif ($status == 3) {
                $where[] = ['s.status', '=', 2];
            }
        }

        // 来源的筛选
        if ($packageId) {
            if ($packageId != -1) {
                $where[] = ['tsp.id', '=', $packageId];
            } else {
                $where[] = ['tsp.id', '=', null];
            }

        }

        if (!empty($device)) {
//            $where[] = ['d.deviceId', '=', $device];
        }

        if (!empty($taskId)) {
            //$where[] = ['t.sceneId', '=', $taskId];
        }
        $where[] = ['s.companyId', '=', $this->getUserInfo('companyId')];

        return $where;
    }

    /**
     * 获取流量池列表
     *
     * @param array $where
     * @return \think\Paginator
     */
    protected function getPoolListByCompanyId(array $where, $isPage = true)
    {
        $query = TrafficPoolModel::alias('p')
            ->field(
                [
                    'p.id', 'p.identifier', 'p.mobile', 'p.wechatId', 'p.identifier',
                    's.fromd', 's.status', 's.createTime', 's.companyId', 's.sourceId', 's.type',
                    'wa.nickname', 'wa.avatar', 'wa.gender', 'wa.phone', 'wa.alias'
                ]
            )
            ->join('traffic_source s', 'p.identifier=s.identifier')
            ->join('wechat_account wa', 'p.identifier=wa.wechatId', 'left')
            ->join('traffic_source_package_item tspi', 'p.identifier = tspi.identifier AND s.companyId = tspi.companyId', 'left')
            ->join('traffic_source_package tsp', 'tspi.packageId=tsp.id', 'left')
            ->join('device_wechat_login d', 's.sourceId=d.wechatId', 'left')
            ->where($where);


        $result = $query->order('p.id DESC,s.id DESC')->group('p.identifier');

        if ($isPage) {
            $result = $query->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
            $list = $result->items();
            $total = $result->total();
        } else {
            $list = $result->select();
            $total = '';
        }


        if ($isPage) {
            foreach ($list as &$item) {
                //流量池筛选
                $package = Db::name('traffic_source_package_item')->alias('tspi')
                    ->join('traffic_source_package p', 'tspi.packageId=p.id AND tspi.companyId=p.companyId')
                    ->where(['tspi.identifier' => $item->identifier])
                    ->whereIn('tspi.companyId', [0, $item->companyId])
                    ->column('p.name');
                $item['packages'] = $package;
                if ($item->type == 1) {
                    $tag = Db::name('wechat_friendship')->where(['wechatId' => $item->wechatId])->column('tags');
                    $tags = [];
                    foreach ($tag as $k => $v) {
                        $v = json_decode($v, true);
                        if (!empty($v)) {
                            $tags = array_merge($tags, $v);
                        }
                    }
                    $item['tags'] = $tags;
                }

            }
        }
        unset($item);
        $data = ['list' => $list, 'total' => $total];
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    /**
     * 获取流量池列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $result = $this->getPoolListByCompanyId($this->makeWhere());
            $result = json_decode($result, true);
            return ResponseHelper::success(
                [
                    'list' => $result['list'],
                    'total' => $result['total'],
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }

    public function getUser()
    {

        $wechatId = $this->request->param('wechatId', '');
        $companyId = $this->getUserInfo('companyId');

        if (empty($wechatId)) {
            return json_encode(['code' => 500, 'msg' => '微信id不能为空']);
        }

        $total = [
            'msg' => 0,
            'money' => 0,
            'isFriend' => false,
            'percentage' => '0.00%',
        ];


        $data = TrafficPoolModel::alias('p')
            ->field(['p.id', 'p.identifier', 'p.wechatId',
                'wa.nickname', 'wa.avatar', 'wa.gender', 'wa.phone', 'wa.alias'])
            ->join('wechat_account wa', 'p.identifier=wa.wechatId', 'left')
            ->order('p.id DESC')
            ->where(['p.identifier' => $wechatId])
            ->group('p.identifier')
            ->find();
        $data['lastMsgTime'] = '';

        //来源
        $source = Db::name('traffic_source')->alias('ts')
            ->field(['wa.nickname', 'wa.avatar', 'wa.gender', 'wa.phone', 'wa.wechatId', 'wa.alias',
                'ts.createTime',
                'wf.id as friendId', 'wf.wechatAccountId'])
            ->join('wechat_account wa', 'ts.sourceId=wa.wechatId', 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'wa.wechatId=wf.ownerWechatId', 'left')
            ->where(['ts.companyId' => $companyId, 'ts.identifier' => $data['identifier'], 'wf.wechatId' => $data['wechatId']])
            ->order('ts.createTime DESC')
            ->select();

        $wechatFriendId = [];
        if (!empty($source)) {
            $total['isFriend'] = true;
            foreach ($source as &$v) {
                $wechatFriendId[] = $v['friendId'];
                //最后消息
                $v['createTime'] = date('Y-m-d H:i:s', $v['createTime']);
                $lastMsgTime = Db::table('s2_wechat_message')
                    ->where(['wechatFriendId' => $v['friendId'], 'wechatAccountId' => $v['wechatAccountId']])
                    ->value('wechatTime');
                $v['lastMsgTime'] = !empty($lastMsgTime) ? date('Y-m-d H:i:s', $lastMsgTime) : '';

                //设备信息
                $device = Db::name('device_wechat_login')->alias('dwl')
                    ->join('device d', 'd.id=dwl.deviceId')
                    ->where(['dwl.wechatId' => $v['wechatId']])
                    ->field('d.id,d.memo,d.imei,d.brand,d.extra,d.alive')
                    ->order('dwl.id DESC')
                    ->find();
                $extra = json_decode($device['extra'], true);
                unset($device['extra']);
                $device['address'] = !empty($extra['address']) ? $extra['address'] : '';
                $v['device'] = $device;
            }
            unset($v);
        }
        $data['source'] = $source;


        //流量池
        $package = Db::name('traffic_source_package_item')->alias('tspi')
            ->join('traffic_source_package p', 'tspi.packageId=p.id AND tspi.companyId=p.companyId')
            ->where(['tspi.companyId' => $companyId, 'tspi.identifier' => $data['identifier']])
            ->column('p.name');
        $package2 = Db::name('traffic_source_package_item')->alias('tspi')
            ->join('traffic_source_package p', 'tspi.packageId=p.id')
            ->where(['tspi.companyId' => $companyId, 'tspi.identifier' => $data['identifier']])
            ->column('p.name');
        $packages = array_merge($package, $package2);
        $data['packages'] = $packages;


        if (!empty($wechatFriendId)) {
            //消息统计
            $msgTotal = Db::table('s2_wechat_message')
                ->whereIn('wechatFriendId', $wechatFriendId)
                ->count();
            $total['msg'] = $msgTotal;

            //金额计算
            $money = Db::table('s2_wechat_message')
                ->whereIn('wechatFriendId', $wechatFriendId)
                ->where(['isSend' => 1, 'msgType' => 419430449])
                ->select();
            if (!empty($money)) {
                foreach ($money as $v) {
                    $content = json_decode($v['content'], true);
                    if ($content['paysubtype'] == 1) {
                        $number = number_format(str_replace("￥", "", $content['feedesc']), 2);
                        $floatValue = floatval($number);
                        $total['money'] += $floatValue;
                    }
                }
            }
        }

        $taskNum = Db::name('task_customer')->alias('tc')
            ->join('customer_acquisition_task t', 'tc.task_id=t.id')
            ->where(['t.companyId' => $companyId, 't.deleteTime' => 0])
            ->whereIn('tc.phone', [$data['phone'], $data['wechatId'], $data['alias']])
            ->count();

        $passNum = Db::name('task_customer')->alias('tc')
            ->join('customer_acquisition_task t', 'tc.task_id=t.id')
            ->where(['t.companyId' => $companyId, 't.deleteTime' => 0, 'tc.status' => 4])
            ->whereIn('tc.phone', [$data['phone'], $data['wechatId'], $data['alias']])
            ->count();

        if (!empty($taskNum) && !empty($passNum)) {
            $percentage = number_format(($taskNum / $passNum) * 100, 2);
            $total['percentage'] = $percentage;
        }


        $data['total'] = $total;
        $data['rmm'] = [
            'r' => 0,
            'f' => 0,
            'm' => 0,
        ];
        return ResponseHelper::success($data);
    }


    /**
     * 用户旅程
     * @return false|string
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getUserJourney()
    {
        $page = $this->request->param('page', 1);
        $pageSize = $this->request->param('pageSize', 10);
        $userId = $this->request->param('userId', '');
        if (empty($userId)) {
            return json_encode(['code' => 500, 'msg' => '用户id不能为空']);
        }

        $query = Db::name('user_portrait')
            ->field('id,type,trafficPoolId,remark,count,createTime,updateTime')
            ->where(['trafficPoolId' => $userId]);

        $total = $query->count();

        $list = $query->order('createTime desc')
            ->page($page, $pageSize)
            ->select();


        foreach ($list as $k => $v) {
            $list[$k]['createTime'] = date('Y-m-d H:i:s', $v['createTime']);
            $list[$k]['updateTime'] = date('Y-m-d H:i:s', $v['updateTime']);
        }
        return ResponseHelper::success(['list' => $list, 'total' => $total]);

    }


    public function getUserTags()
    {
        $userId = $this->request->param('userId', '');
        $companyId = $this->getUserInfo('companyId');
        if (empty($userId)) {
            return json_encode(['code' => 500, 'msg' => '用户id不能为空']);
        }
        $data = Db::name('traffic_pool')->alias('tp')
            ->join('wechat_friendship f', 'tp.wechatId=f.wechatId AND f.companyId=' . $companyId, 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'f.wechatId=wf.wechatId', 'left')
            ->where(['tp.id' => $userId])
            ->order('tp.createTime desc')
            ->column('wf.id,wf.labels,wf.siteLabels');
        if (empty($data)) {
            return ResponseHelper::success(['wechat' => [], 'siteLabels' => []]);
        }


        $tags = [];
        $siteLabels = [];
        foreach ($data as $k => $v) {
            $tag = json_decode($v['labels'], true);
            $tag2 = json_decode($v['siteLabels'], true);
            if (!empty($tag)) {
                $tags = array_merge($tags, $tag);
            }
            if (!empty($tag2)) {
                $siteLabels = array_merge($siteLabels, $tag2);
            }
        }
        $tags = array_unique($tags);
        $tags = array_values($tags);
        $siteLabels = array_unique($siteLabels);
        $siteLabels = array_values($siteLabels);
        return ResponseHelper::success(['wechat' => $tags, 'siteLabels' => $siteLabels]);
    }





    public function addPackage()
    {
        try {
            $type = $this->request->param('type', '');
            $addPackageId = $this->request->param('addPackageId', '');
            $packageName = $this->request->param('packageName', '');
            $userIds = $this->request->param('userIds', []);
            $tableFile = $this->request->param('tableFile', '');


            $companyId = $this->getUserInfo('companyId');
            $userId = $this->getUserInfo('id');
            if (empty($addPackageId) && empty($packageName)) {
                return ResponseHelper::error('存储的流量池不能为空');
            }

            if (empty($type)) {
                return ResponseHelper::error('请选择类型');
            }

            if (!empty($addPackageId)) {
                $package = Db::name('traffic_source_package')
                    ->where(['id' => $addPackageId, 'isDel' => 0])
                    ->whereIn('companyId', [$companyId, 0])
                    ->field('id,name')
                    ->find();
                if (empty($package)) {
                    return ResponseHelper::error('该流量池不存在');
                }
                $packageId = $package['id'];
            } else {
                $package = Db::name('traffic_source_package')
                    ->where(['isDel' => 0, 'name' => $packageName])
                    ->whereIn('companyId', [$companyId, 0])
                    ->field('id,name')
                    ->find();
                if (!empty($package)) {
                    return ResponseHelper::error('该流量池名称已存在');
                }
                $packageId = Db::name('traffic_source_package')->insertGetId([
                    'userId' => $userId,
                    'companyId' => $companyId,
                    'name' => $packageName,
                    'matchingRules' => json_encode($this->makeWhere()),
                    'createTime' => time(),
                    'isDel' => 0,
                ]);
            }


            if ($type == 1) {
                $result = $this->getPoolListByCompanyId($this->makeWhere(), false);
                $result = json_decode($result, true);
                $result = array_column($result['list'], 'identifier');
            } elseif ($type == 2) {
                if (empty($packageId)) {
                    return ResponseHelper::error('选择的用户');
                }
                //================== 表格数据处理 ==================
                if (!is_array($userIds)) {
                    return ResponseHelper::error('选择的用户类型错误');
                }
                $result = Db::name('traffic_pool')->alias('tp')
                    ->join('traffic_source tc', 'tp.identifier=tc.identifier')
                    ->whereIn('tp.id', $userIds)
                    ->where(['companyId' => $companyId])
                    ->group('tp.identifier')
                    ->column('tc.identifier');
            } else {
                /*if (empty($tableFile)){
                    return ResponseHelper::error('请上传用户文件');
                }

                // 先下载到本地临时文件，再分析，最后删除
                $originPath = $tableFile;
                $tmpFile = tempnam(sys_get_temp_dir(), 'user_');
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
                            'source' => isset($cols[2]) ? trim($cols[2]) : '',
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
                                    'source' => isset($cols[2]) ? trim($cols[2]) : '',
                                ];
                            }
                        }
                    }
                } else {
                    unlink($tmpFile);
                    exit('暂不支持的文件类型: ' . $ext);
                }
                // 删除临时文件
                unlink($tmpFile);*/
                //================== 表格数据处理 ==================
            }

            $rows = [
                ['name' => '张三', 'phone' => '18883458888', 'source' => '234'],
                ['name' => '李四', 'phone' => '18878988889', 'source' => '456'],
            ];


            if (in_array($type, [1, 2])) {
                // 1000条为一组进行批量处理
                $batchSize = 1000;
                $totalRows = count($result);

                for ($i = 0; $i < $totalRows; $i += $batchSize) {
                    $batchRows = array_slice($result, $i, $batchSize);
                    if (!empty($batchRows)) {
                        // 2. 批量查询已存在的手机
                        $existing = Db::name('traffic_source_package_item')
                            ->where(['companyId' => $companyId, 'packageId' => $packageId])
                            ->whereIn('identifier', $batchRows)
                            ->field('identifier')
                            ->select();
                        $existingPhones = array_column($existing, 'identifier');
                        // 3. 过滤出新数据，批量插入
                        $newData = [];
                        foreach ($batchRows as $row) {
                            if (!in_array($row, $existingPhones)) {
                                $newData[] = [
                                    'packageId' => $packageId,
                                    'companyId' => $companyId,
                                    'identifier' => $row,
                                    'createTime' => time(),
                                ];
                            }
                        }
                        // 4. 批量插入新数据
                        if (!empty($newData)) {
                            Db::name('traffic_source_package_item')->insertAll($newData);
                        }
                    }
                }
            } else {
                // 1000条为一组进行批量处理
                $batchSize = 1000;
                $totalRows = count($rows);

                try {
                    for ($i = 0; $i < $totalRows; $i += $batchSize) {
                        Db::startTrans();
                        $batchRows = array_slice($rows, $i, $batchSize);
                        if (!empty($batchRows)) {
                            $identifiers = array_column($batchRows, 'phone');
                            //流量池处理
                            $existing = Db::name('traffic_pool')
                                ->whereIn('identifier', $identifiers)
                                ->column('identifier');

                            $newData = [];
                            foreach ($batchRows as $row) {
                                if (!in_array($row['phone'], $existing)) {
                                    $newData[] = [
                                        'identifier' => $row['phone'],
                                        'mobile' => $row['phone'],
                                        'createTime' => time(),
                                    ];
                                }
                            }
                            if (!empty($newData)) {
                                Db::name('traffic_pool')->insertAll($newData);
                            }

                            //流量池来源处理
                            $newData2 = [];
                            $existing2 = Db::name('traffic_source')
                                ->where(['companyId' => $companyId])
                                ->whereIn('identifier', $identifiers)
                                ->column('identifier');
                            foreach ($batchRows as $row) {
                                if (!in_array($row['phone'], $existing2)) {
                                    $newData2[] = [
                                        'type' => 0,
                                        'name' => $row['name'],
                                        'identifier' => $row['phone'],
                                        'fromd' => $row['source'],
                                        'companyId' => $companyId,
                                        'createTime' => time(),
                                        'updateTime' => time(),
                                    ];
                                }
                            }
                            if (!empty($newData2)) {
                                Db::name('traffic_source')->insertAll($newData2);
                            }

                            //流量池包数据处理
                            $newData3 = [];
                            $existing3 = Db::name('traffic_source_package_item')
                                ->where(['companyId' => $companyId, 'packageId' => $packageId])
                                ->whereIn('identifier', $identifiers)
                                ->field('identifier')
                                ->select();
                            foreach ($batchRows as $row) {
                                if (!in_array($row['phone'], $existing3)) {
                                    $newData3[] = [
                                        'packageId' => $packageId,
                                        'companyId' => $companyId,
                                        'identifier' => $row['phone'],
                                        'createTime' => time(),
                                    ];
                                }
                            }
                            if (!empty($newData3)) {
                                Db::name('traffic_source_package_item')->insertAll($newData3);
                            }

                            Db::commit();
                        }
                    }
                } catch (\Exception $e) {
                    DB::rollback();
                }
            }


            return ResponseHelper::success('添加成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }


    /*  public function editUserTags()
      {
          $userId = $this->request->param('userId', '');
          if (empty($userId)) {
              return json_encode(['code' => 500, 'msg' => '用户id不能为空']);
          }
          $tags = $this->request->param('tags', []);
          $tags = $this->request->param('tags', []);
          $isWechat = $this->request->param('isWechat', false);
          $companyId = $this->getUserInfo('companyId');

          $friend = Db::name('traffic_pool')->alias('tp')
              ->join('wechat_friendship f', 'tp.wechatId=f.wechatId AND f.companyId='.$companyId, 'left')
              ->join(['s2_wechat_friend' => 'wf'], 'f.wechatId=wf.wechatId', 'left')
              ->where(['tp.id' => $userId])
              ->order('tp.createTime desc')
              ->column('wf.id,wf.accountId,wf.labels,wf.siteLabels');
          if (empty($data)) {
              return ResponseHelper::error('该用户不存在');
          }


      }*/


}