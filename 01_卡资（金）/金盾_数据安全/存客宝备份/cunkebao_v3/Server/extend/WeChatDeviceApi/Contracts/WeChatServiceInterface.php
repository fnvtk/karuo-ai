<?php
namespace WeChatDeviceApi\Contracts;

interface WeChatServiceInterface
{
    /**
     * 添加好友
     * @param string $deviceId 设备ID
     * @param string $targetWxId 目标微信ID
     * @return bool 是否成功
     * @throws \WeChatDeviceApi\Exceptions\ApiException
     */
    public function addFriend(string $deviceId, string $targetWxId): bool;

    /**
     * 朋友圈点赞
     * @param string $deviceId 设备ID
     * @param string $momentId 朋友圈ID
     * @return bool 是否成功
     */
    public function likeMoment(string $deviceId, string $momentId): bool;

    /**
     * 获取群列表
     * @param string $deviceId 设备ID
     * @return array 群信息列表
     */
    public function getGroupList(string $wxId): array;

    /**
     * 获取好友列表
     * @param string $deviceId 设备ID
     * @return array 好友信息列表
     */
    public function getFriendList(string $deviceId): array;

    /**
     * 获取设备信息
     * @param string $deviceId 设备ID
     * @return array 设备详情
     */
    public function getDeviceInfo(string $deviceId): array;

    /**
     * 绑定设备到公司
     * @param string $deviceId 设备ID
     * @param string $companyId 公司ID
     * @return bool 是否成功
     */
    public function bindDeviceToCompany(string $deviceId, string $companyId): bool;

    /**
     * 获取群成员列表
     * @param string $deviceId 设备ID
     * @param string $chatroomId 群ID
     * @return array 群成员列表
     */
    public function getChatroomMemberList(string $deviceId, string $chatroomId): array;

    // 获取指定微信的朋友圈内容/列表
    public function getMomentList(string $deviceId, string $wxId): array;

    // 发送微信朋友圈
    public function sendMoment(string $deviceId, string $wxId, string $moment): bool;

    // ... 其他方法定义
}