<?php

namespace app\api\controller;

use app\api\model\WechatFriendModel;
use think\facade\Request;
use think\facade\Log;

class WechatFriendController extends BaseController
{
    /**
     * 获取微信好友列表数据
     * @param string $pageIndex 页码
     * @param string $pageSize 每页大小
     * @param string $preFriendId 上一个好友ID
     * @param bool $isInner 是否为任务调用
     * @return \think\response\Json
     */
    public function getlist($data = [], $isInner = false,$isDel = '')
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
            } else {
                return errorJson('缺少授权信息');
            }
        }

        $pageIndex = !empty($data['pageIndex']) ? $data['pageIndex'] : '';
        $pageSize = !empty($data['pageSize']) ? $data['pageSize'] : '';
        $preFriendId = !empty($data['preFriendId']) ? $data['preFriendId'] : '';
        $friendKeyword = !empty($data['friendKeyword']) ? $data['friendKeyword'] : '';
        $wechatAccountKeyword = !empty($data['wechatAccountKeyword']) ? $data['wechatAccountKeyword'] : '';
  

        try {
            // 初始化isUpdate标志为false
            $isUpdate = false;
            
            // 根据isDel设置对应的isDeleted值
            $isDeleted = null; // 默认值
            if ($isDel == '0' || $isDel == 0) {
                $isDeleted = false;
            } elseif ($isDel == '1' || $isDel == 1) {
                $isDeleted = true;
            }
            
            // 构建请求参数
            $params = [
                'accountKeyword' => '',
                'addFrom' => '[]',
                'allotAccountId' => input('allotAccountId', ''),
                'containSubDepartment' => false,
                'departmentId' => '',
                'extendFields' => '{}',
                'gender' => '',
                'groupId' => null,
                'isDeleted' => $isDeleted,
                'isPass' => null,
                'keyword' => input('keyword', ''),
                'labels' => '[]',
                'pageIndex' => !empty($pageIndex) ? $pageIndex : input('pageIndex', 0),
                'pageSize' => !empty($pageSize) ? $pageSize : input('pageSize', 20),
                'preFriendId' => !empty($preFriendId) ? $preFriendId : input('preFriendId', ''),
                'friendKeyword' => !empty($friendKeyword) ? $friendKeyword : input('friendKeyword', ''),
                'wechatAccountKeyword' => !empty($wechatAccountKeyword) ? $wechatAccountKeyword : input('wechatAccountKeyword', '')
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization);

            // 发送请求获取好友列表
            $result = requestCurl($this->baseUrl . 'api/WechatFriend/friendlistData', $params, 'POST', $header, 'json');
            $response = handleApiResponse($result);

            // 保存数据到数据库
            if (is_array($response)) {
                $isUpdate = false;
                foreach ($response as $item) {
                    $updated = $this->saveFriend($item);
                    if($updated && $isDel == 0){
                        $isUpdate = true;
                    }
                }
            }
            
            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => 'success', 'data' => $response, 'isUpdate' => $isUpdate]);
            } else {
                return successJson($response);
            }
            
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取微信好友列表失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取微信好友列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 保存微信好友数据到数据库
     * @param array $item 微信好友数据
     * @return bool 是否创建或更新了记录
     */
    private function saveFriend($item)
    {
        $data = [
            'id' => $item['id'],
            'wechatAccountId' => $item['wechatAccountId'],
            'alias' => $item['alias'],
            'wechatId' => $item['wechatId'],
            'conRemark' => $item['conRemark'],
            'nickname' => $item['nickname'],
            'pyInitial' => $item['pyInitial'],
            'quanPin' => $item['quanPin'],
            'avatar' => $item['avatar'],
            'gender' => $item['gender'],
            'region' => $item['region'],
            'addFrom' => $item['addFrom'],
            'labels' => is_array($item['labels']) ? json_encode($item['labels']) : json_encode([]),
            'siteLabels' => json_encode([]),
            'signature' => $item['signature'],
            'isDeleted' => $item['isDeleted'],
            'isPassed' => $item['isPassed'],
            'deleteTime' => !empty($item['isDeleted']) ? strtotime($item['deleteTime']) : 0,
            'accountId' => $item['accountId'],
            'extendFields' => is_array($item['extendFields']) ? json_encode($item['extendFields']) : json_encode([]),
            'accountUserName' => $item['accountUserName'],
            'accountRealName' => $item['accountRealName'],
            'accountNickname' => $item['accountNickname'],
            'ownerAlias' => $item['ownerAlias'],
            'ownerWechatId' => $item['ownerWechatId'],
            'ownerNickname' => $item['ownerNickname'],
            'ownerAvatar' => $item['ownerAvatar'],
            'phone' => $item['phone'],
            'thirdParty' => is_array($item['thirdParty']) ? json_encode($item['thirdParty']) : json_encode([]),
            'groupId' => $item['groupId'],
            'passTime' => !empty($item['isPassed']) && $item['passTime'] != '0001-01-01T00:00:00' ? strtotime($item['passTime']) : 0,
            'additionalPicture' => $item['additionalPicture'],
            'desc' => $item['desc'],
            'country' => $item['country'],
            'privince' => isset($item['privince']) ? $item['privince'] : '',
            'city' => isset($item['city']) ? $item['city'] : '',
            'createTime' => isset($item['createTime']) ? strtotime($item['createTime']) : 0,
            'updateTime' => time()
        ];

        // 使用ID作为唯一性判断
        $friend = WechatFriendModel::where('id', $item['id'])->find();

        if ($friend) {
            unset($data['siteLabels']);
            $friend->save($data);
            return true;
        } else {
            WechatFriendModel::create($data);
            return false;
        }
    }
} 