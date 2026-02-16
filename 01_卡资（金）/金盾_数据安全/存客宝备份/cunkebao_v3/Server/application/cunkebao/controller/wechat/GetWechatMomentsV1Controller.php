<?php

namespace app\cunkebao\controller\wechat;

use app\common\controller\ExportController;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 查看微信朋友圈列表（仅限当前操盘手可访问的微信）
 */
class GetWechatMomentsV1Controller extends BaseController
{
    /**
     * 获取用户可访问的微信ID集合
     * 使用 s2_wechat_friend 验证好友归属：
     * - 非管理员：当前账号在好友表中的 ownerWechatId 集合
     * - 管理员：公司下所有账号在好友表中的 ownerWechatId 集合
     *
     * @return array
     * @throws \Exception
     */
    protected function getAccessibleWechatIds(): array
    {
        $companyId = $this->getUserInfo('companyId');
        $isAdmin = $this->getUserInfo('isAdmin');
        $accountId = $this->getUserInfo('s2_accountId');

        if (empty($companyId)) {
            throw new \Exception('请先登录', 401);
        }

        // 管理员：根据公司下所有账号的好友归属（s2_wechat_friend.accountId -> ownerWechatId）
        if (!empty($isAdmin)) {
            // 获取公司下所有账号ID
            $accountIds = Db::table('s2_company_account')
                ->where('departmentId', $companyId)
                ->column('id');

            if (empty($accountIds)) {
                return [];
            }

            // 从好友表中取出这些账号的 ownerWechatId（去重，排除已删除好友）
            return Db::table('s2_wechat_friend')
                ->distinct(true)
                ->whereIn('accountId', $accountIds)
                ->where('isDeleted', 0)
                ->column('wechatId');
        }

        // 非管理员：仅根据当前账号在好友表中的 ownerWechatId 列表
        if (empty($accountId)) {
            return [];
        }

        return Db::table('s2_wechat_friend')
            ->distinct(true)
            ->where('accountId', $accountId)
            ->where('isDeleted', 0)
            ->column('wechatId');
    }

    /**
     * 查看朋友圈列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 可选参数：wechatId 不传则查看当前账号可访问的所有微信的朋友圈
            $wechatId = $this->request->param('wechatId/s', '');

            // 获取当前账号可访问的微信ID集合（内部已做权限控制）
            $accessibleWechatIds = $this->getAccessibleWechatIds();
            // 如果传了 wechatId，则只允许查看自己有权限的该微信
            $targetWechatIds = [];
            if (!empty($wechatId)) {
                if (!in_array($wechatId, $accessibleWechatIds, true)) {
                    return ResponseHelper::error('无权查看该微信的朋友圈', 403);
                }
                $targetWechatIds = [$wechatId];
            } else {
                // 未传 wechatId，则查看所有有权限的微信的朋友圈
                $targetWechatIds = $accessibleWechatIds;
            }

            if (empty($targetWechatIds)) {
                return ResponseHelper::error('暂无可查看的微信账号', 404);
            }

            // 获取对应的微信账号ID集合
            $accountIds = Db::table('s2_wechat_account')
                ->whereIn('wechatId', $targetWechatIds)
                ->column('id');

            if (empty($accountIds)) {
                return ResponseHelper::error('微信账号不存在或尚未同步', 404);
            }

            // 查询朋友圈：如果传了 userName 参数，则只查看指定用户的；否则查看所有
            $query = Db::table('s2_wechat_moments')
                ->whereIn('wechatAccountId', $accountIds);

            // 如果传了 userName 参数，则只查看指定用户的朋友圈
            $userName = $this->request->param('userName/s', '');
            if (!empty($userName)) {
                $query->where('userName', $userName);
            }

            // 关键词搜索
            if ($keyword = trim((string)$this->request->param('keyword', ''))) {
                $query->whereLike('content', '%' . $keyword . '%');
            }

            // 类型筛选
            $type = $this->request->param('type', '');
            if ($type !== '' && $type !== null) {
                $query->where('type', (int)$type);
            }

            // 时间筛选
            $startTime = $this->request->param('startTime', '');
            $endTime = $this->request->param('endTime', '');
            if ($startTime || $endTime) {
                $start = $startTime ? strtotime($startTime) : 0;
                $end = $endTime ? strtotime($endTime) : time();
                if ($start && $end && $end < $start) {
                    return ResponseHelper::error('结束时间不能早于开始时间');
                }
                $query->whereBetween('createTime', [$start ?: 0, $end ?: time()]);
            }

            $page = (int)$this->request->param('page', 1);
            $limit = (int)$this->request->param('limit', 10);

            $paginator = $query->order('createTime', 'desc')
                ->paginate($limit, false, ['page' => $page]);

            $list = array_map(function ($item) {
                return $this->formatMomentRow($item);
            }, $paginator->items());

            return ResponseHelper::success([
                'list'  => $list,
                'total' => $paginator->total(),
                'page'  => $page,
                'limit' => $limit,
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 导出朋友圈数据到Excel
     *
     * @return void
     */
    public function export()
    {
        try {
            $wechatId = $this->request->param('wechatId/s', '');
            if (empty($wechatId)) {
                return ResponseHelper::error('wechatId不能为空');
            }

            // 权限校验：只能查看当前账号可访问的微信
            $accessibleWechatIds = $this->getAccessibleWechatIds();
            if (!in_array($wechatId, $accessibleWechatIds, true)) {
                return ResponseHelper::error('无权查看该微信的朋友圈', 403);
            }

            // 获取对应的微信账号ID
            $accountId = Db::table('s2_wechat_account')
                ->where('wechatId', $wechatId)
                ->value('id');

            if (empty($accountId)) {
                return ResponseHelper::error('微信账号不存在或尚未同步', 404);
            }

            // 查询朋友圈（不限制 userName，导出所有朋友圈）
            $query = Db::table('s2_wechat_moments')
                ->where('wechatAccountId', $accountId);

            // 关键词搜索
            if ($keyword = trim((string)$this->request->param('keyword', ''))) {
                $query->whereLike('content', '%' . $keyword . '%');
            }

            // 类型筛选
            $type = $this->request->param('type', '');
            if ($type !== '' && $type !== null) {
                $query->where('type', (int)$type);
            }

            // 时间筛选
            $startTime = $this->request->param('startTime', '');
            $endTime = $this->request->param('endTime', '');
            if ($startTime || $endTime) {
                $start = $startTime ? strtotime($startTime) : 0;
                $end = $endTime ? strtotime($endTime) : time();
                if ($start && $end && $end < $start) {
                    return ResponseHelper::error('结束时间不能早于开始时间');
                }
                $query->whereBetween('createTime', [$start ?: 0, $end ?: time()]);
            }

            // 获取所有数据（不分页）
            $moments = $query->order('createTime', 'desc')->select();

            if (empty($moments)) {
                return ResponseHelper::error('暂无数据可导出');
            }

            // 定义表头
            $headers = [
                'date' => '日期',
                'postTime' => '投放时间',
                'functionCategory' => '作用分类',
                'content' => '朋友圈文案',
                'selfReply' => '自回评内容',
                'displayForm' => '朋友圈展示形式',
                'image1' => '配图1',
                'image2' => '配图2',
                'image3' => '配图3',
                'image4' => '配图4',
                'image5' => '配图5',
                'image6' => '配图6',
                'image7' => '配图7',
                'image8' => '配图8',
                'image9' => '配图9',
            ];

            // 格式化数据
            $rows = [];
            foreach ($moments as $moment) {
                $resUrls = $this->decodeJson($moment['resUrls'] ?? null);
                $imageUrls = is_array($resUrls) ? $resUrls : [];

                // 格式化日期和时间
                $createTime = !empty($moment['createTime']) 
                    ? (is_numeric($moment['createTime']) ? $moment['createTime'] : strtotime($moment['createTime']))
                    : 0;
                $date = $createTime ? date('Y年m月d日', $createTime) : '';
                $postTime = $createTime ? date('H:i', $createTime) : '';

                // 判断展示形式
                $displayForm = '';
                if (!empty($moment['content']) && !empty($imageUrls)) {
                    $displayForm = '文字+图片';
                } elseif (!empty($moment['content'])) {
                    $displayForm = '文字';
                } elseif (!empty($imageUrls)) {
                    $displayForm = '图片';
                }

                $row = [
                    'date' => $date,
                    'postTime' => $postTime,
                    'functionCategory' => '', // 暂时放空
                    'content' => $moment['content'] ?? '',
                    'selfReply' => '', // 暂时放空
                    'displayForm' => $displayForm,
                ];

                // 分配图片到配图1-9列
                for ($i = 1; $i <= 9; $i++) {
                    $imageKey = 'image' . $i;
                    $row[$imageKey] = isset($imageUrls[$i - 1]) ? $imageUrls[$i - 1] : '';
                }

                $rows[] = $row;
            }

            // 定义图片列（配图1-9）
            $imageColumns = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6', 'image7', 'image8', 'image9'];

            // 生成文件名
            $fileName = '朋友圈投放_' . date('Ymd_His');

            // 调用导出方法，优化图片显示效果
            ExportController::exportExcelWithImages(
                $fileName,
                $headers,
                $rows,
                $imageColumns,
                '朋友圈投放',
                [
                    'imageWidth' => 120,        // 图片宽度（像素）
                    'imageHeight' => 120,       // 图片高度（像素）
                    'imageColumnWidth' => 18,   // 图片列宽（Excel单位）
                    'rowHeight' => 130,         // 行高（像素）
                    'columnWidths' => [         // 特定列的固定宽度
                        'date' => 15,           // 日期列宽
                        'postTime' => 12,       // 投放时间列宽
                        'functionCategory' => 15, // 作用分类列宽
                        'content' => 40,        // 朋友圈文案列宽（自动调整可能不够）
                        'selfReply' => 30,      // 自回评内容列宽
                        'displayForm' => 18,     // 朋友圈展示形式列宽
                    ],
                    'titleRow' => [             // 标题行内容（第一行）
                        '朋友圈投放',
                        '我能提供什么价值? (40%) 有谁正在和我合作 (20%) 如何和我合作? (20%) 你找我合作需要付多少钱? (20%)'
                    ]
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('导出失败：' . $e->getMessage(), 500);
        }
    }

    /**
     * 格式化朋友圈数据
     *
     * @param array $row
     * @return array
     */
    protected function formatMomentRow(array $row): array
    {
        $formatTime = function ($timestamp) {
            if (empty($timestamp)) {
                return '';
            }
            return is_numeric($timestamp)
                ? date('Y-m-d H:i:s', $timestamp)
                : date('Y-m-d H:i:s', strtotime($timestamp));
        };

        return [
            'id'            => (int)$row['id'],
            'snsId'         => $row['snsId'] ?? '',
            'type'          => (int)($row['type'] ?? 0),
            'content'       => $row['content'] ?? '',
            'commentList'   => $this->decodeJson($row['commentList'] ?? null),
            'likeList'      => $this->decodeJson($row['likeList'] ?? null),
            'resUrls'       => $this->decodeJson($row['resUrls'] ?? null),
            'createTime'    => $formatTime($row['createTime'] ?? null),
            'momentEntity'  => [
                'lat'       => $row['lat'] ?? 0,
                'lng'       => $row['lng'] ?? 0,
                'location'  => $row['location'] ?? '',
                'picSize'   => $row['picSize'] ?? 0,
                'userName'  => $row['userName'] ?? '',
            ],
        ];
    }

    /**
     * JSON字段解析
     *
     * @param mixed $value
     * @return array
     */
    protected function decodeJson($value): array
    {
        if (empty($value)) {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);
        return $decoded ?: [];
    }
}

