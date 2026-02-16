<?php

namespace app\service;

use app\repository\StoreRepository;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 门店服务
 *
 * 职责：
 * - 创建门店
 * - 查询门店信息
 * - 根据门店名称获取或创建门店ID
 */
class StoreService
{
    public function __construct(
        protected StoreRepository $storeRepository
    ) {
    }

    /**
     * 根据门店名称获取或创建门店ID
     *
     * @param string $storeName 门店名称
     * @param string|null $source 数据源标识（用于生成默认门店编码）
     * @param array<string, mixed> $extraData 额外的门店信息
     * @return string 门店ID
     */
    public function getOrCreateStoreByName(
        string $storeName,
        ?string $source = null,
        array $extraData = []
    ): string {
        // 1. 先查找是否已存在同名门店（正常状态）
        $existingStore = $this->storeRepository->findByStoreName($storeName);
        
        if ($existingStore) {
            LoggerHelper::logBusiness('store_found_by_name', [
                'store_name' => $storeName,
                'store_id' => $existingStore->store_id,
            ]);
            return $existingStore->store_id;
        }

        // 2. 如果不存在，创建新门店
        $storeId = $this->createStore($storeName, $source, $extraData);
        
        LoggerHelper::logBusiness('store_created_by_name', [
            'store_name' => $storeName,
            'store_id' => $storeId,
            'source' => $source,
        ]);

        return $storeId;
    }

    /**
     * 创建门店
     *
     * @param string $storeName 门店名称
     * @param string|null $source 数据源标识
     * @param array<string, mixed> $extraData 额外的门店信息
     * @return string 门店ID
     */
    public function createStore(string $storeName, ?string $source = null, array $extraData = []): string
    {
        $now = new \DateTimeImmutable('now');
        $storeId = UuidGenerator::uuid4()->toString();
        
        // 生成门店编码：如果提供了store_code则使用，否则自动生成
        $storeCode = $extraData['store_code'] ?? $this->generateStoreCode($storeName, $source);
        
        // 检查门店编码是否已存在
        $existingStore = $this->storeRepository->findByStoreCode($storeCode);
        if ($existingStore) {
            // 如果编码已存在，重新生成
            $storeCode = $this->generateStoreCode($storeName, $source, true);
        }

        // 创建门店记录
        $store = new StoreRepository();
        $store->store_id = $storeId;
        $store->store_code = $storeCode;
        $store->store_name = $storeName;
        $store->store_type = $extraData['store_type'] ?? '线上店'; // 默认线上店
        $store->store_level = $extraData['store_level'] ?? null;
        $store->industry_id = $extraData['industry_id'] ?? 'default'; // 默认行业ID，后续可配置
        $store->industry_detail_id = $extraData['industry_detail_id'] ?? null;
        $store->store_address = $extraData['store_address'] ?? null;
        $store->store_province = $extraData['store_province'] ?? null;
        $store->store_city = $extraData['store_city'] ?? null;
        $store->store_district = $extraData['store_district'] ?? null;
        $store->store_business_area = $extraData['store_business_area'] ?? null;
        $store->store_longitude = isset($extraData['store_longitude']) ? (float)$extraData['store_longitude'] : null;
        $store->store_latitude = isset($extraData['store_latitude']) ? (float)$extraData['store_latitude'] : null;
        $store->store_phone = $extraData['store_phone'] ?? null;
        $store->status = 0; // 0-正常
        $store->create_time = $now;
        $store->update_time = $now;
        
        $store->save();

        LoggerHelper::logBusiness('store_created', [
            'store_id' => $storeId,
            'store_name' => $storeName,
            'store_code' => $storeCode,
            'store_type' => $store->store_type,
        ]);

        return $storeId;
    }

    /**
     * 生成门店编码
     *
     * @param string $storeName 门店名称
     * @param string|null $source 数据源标识
     * @param bool $addTimestamp 是否添加时间戳（用于避免重复）
     * @return string 门店编码
     */
    private function generateStoreCode(string $storeName, ?string $source = null, bool $addTimestamp = false): string
    {
        // 清理门店名称，移除特殊字符，保留中英文和数字
        $cleanedName = preg_replace('/[^\p{L}\p{N}]/u', '', $storeName);
        
        // 如果名称过长，截取前20个字符
        if (mb_strlen($cleanedName) > 20) {
            $cleanedName = mb_substr($cleanedName, 0, 20);
        }
        
        // 如果名称为空，使用默认值
        if (empty($cleanedName)) {
            $cleanedName = 'STORE';
        }
        
        // 生成编码：{source}_{cleaned_name}_{hash}
        $hash = substr(md5($storeName . ($source ?? '')), 0, 8);
        $code = strtoupper(($source ? $source . '_' : '') . $cleanedName . '_' . $hash);
        
        // 如果需要添加时间戳（用于避免重复）
        if ($addTimestamp) {
            $code .= '_' . time();
        }
        
        return $code;
    }

    /**
     * 根据门店ID获取门店信息
     *
     * @param string $storeId 门店ID
     * @return StoreRepository|null
     */
    public function getStoreById(string $storeId): ?StoreRepository
    {
        return $this->storeRepository->newQuery()
            ->where('store_id', $storeId)
            ->first();
    }
}

