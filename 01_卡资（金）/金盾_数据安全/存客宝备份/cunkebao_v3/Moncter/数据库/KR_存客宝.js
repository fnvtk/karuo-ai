/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_存客宝

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:18:41
*/


// ----------------------------
// Collection structure for cunkebao_AccountWechat
// ----------------------------
db.getCollection("cunkebao_AccountWechat").drop();
db.createCollection("cunkebao_AccountWechat");
db.getCollection("cunkebao_AccountWechat").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_DownloadVideoSchedule
// ----------------------------
db.getCollection("cunkebao_DownloadVideoSchedule").drop();
db.createCollection("cunkebao_DownloadVideoSchedule");
db.getCollection("cunkebao_DownloadVideoSchedule").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_FriendMessageTask
// ----------------------------
db.getCollection("cunkebao_FriendMessageTask").drop();
db.createCollection("cunkebao_FriendMessageTask");
db.getCollection("cunkebao_FriendMessageTask").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_FriendMessageTpl
// ----------------------------
db.getCollection("cunkebao_FriendMessageTpl").drop();
db.createCollection("cunkebao_FriendMessageTpl");
db.getCollection("cunkebao_FriendMessageTpl").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_FriendRequestConfig
// ----------------------------
db.getCollection("cunkebao_FriendRequestConfig").drop();
db.createCollection("cunkebao_FriendRequestConfig");

// ----------------------------
// Collection structure for cunkebao_FriendRequestTaskScan
// ----------------------------
db.getCollection("cunkebao_FriendRequestTaskScan").drop();
db.createCollection("cunkebao_FriendRequestTaskScan");
db.getCollection("cunkebao_FriendRequestTaskScan").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_FrontSession
// ----------------------------
db.getCollection("cunkebao_FrontSession").drop();
db.createCollection("cunkebao_FrontSession");

// ----------------------------
// Collection structure for cunkebao_JdPromotionSite
// ----------------------------
db.getCollection("cunkebao_JdPromotionSite").drop();
db.createCollection("cunkebao_JdPromotionSite");
db.getCollection("cunkebao_JdPromotionSite").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_JdSocialMedia
// ----------------------------
db.getCollection("cunkebao_JdSocialMedia").drop();
db.createCollection("cunkebao_JdSocialMedia");
db.getCollection("cunkebao_JdSocialMedia").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_MaterialLib
// ----------------------------
db.getCollection("cunkebao_MaterialLib").drop();
db.createCollection("cunkebao_MaterialLib");
db.getCollection("cunkebao_MaterialLib").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_MaterialPushLog
// ----------------------------
db.getCollection("cunkebao_MaterialPushLog").drop();
db.createCollection("cunkebao_MaterialPushLog");
db.getCollection("cunkebao_MaterialPushLog").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_MiniProgrameLib
// ----------------------------
db.getCollection("cunkebao_MiniProgrameLib").drop();
db.createCollection("cunkebao_MiniProgrameLib");
db.getCollection("cunkebao_MiniProgrameLib").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_PartTimer
// ----------------------------
db.getCollection("cunkebao_PartTimer").drop();
db.createCollection("cunkebao_PartTimer");
db.getCollection("cunkebao_PartTimer").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_Poster
// ----------------------------
db.getCollection("cunkebao_Poster").drop();
db.createCollection("cunkebao_Poster");
db.getCollection("cunkebao_Poster").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_SysAttach
// ----------------------------
db.getCollection("cunkebao_SysAttach").drop();
db.createCollection("cunkebao_SysAttach");

// ----------------------------
// Collection structure for cunkebao_SysAttach_20250228
// ----------------------------
db.getCollection("cunkebao_SysAttach_20250228").drop();
db.createCollection("cunkebao_SysAttach_20250228");

// ----------------------------
// Collection structure for cunkebao_SysAttach_copy
// ----------------------------
db.getCollection("cunkebao_SysAttach_copy").drop();
db.createCollection("cunkebao_SysAttach_copy");

// ----------------------------
// Collection structure for cunkebao_SysDataSource
// ----------------------------
db.getCollection("cunkebao_SysDataSource").drop();
db.createCollection("cunkebao_SysDataSource");

// ----------------------------
// Collection structure for cunkebao_SysModule
// ----------------------------
db.getCollection("cunkebao_SysModule").drop();
db.createCollection("cunkebao_SysModule");

// ----------------------------
// Collection structure for cunkebao_SysNavItem
// ----------------------------
db.getCollection("cunkebao_SysNavItem").drop();
db.createCollection("cunkebao_SysNavItem");

// ----------------------------
// Collection structure for cunkebao_SysObject
// ----------------------------
db.getCollection("cunkebao_SysObject").drop();
db.createCollection("cunkebao_SysObject");

// ----------------------------
// Collection structure for cunkebao_SysOperatorPermission
// ----------------------------
db.getCollection("cunkebao_SysOperatorPermission").drop();
db.createCollection("cunkebao_SysOperatorPermission");

// ----------------------------
// Collection structure for cunkebao_SysRelatedList
// ----------------------------
db.getCollection("cunkebao_SysRelatedList").drop();
db.createCollection("cunkebao_SysRelatedList");

// ----------------------------
// Collection structure for cunkebao_SysShare
// ----------------------------
db.getCollection("cunkebao_SysShare").drop();
db.createCollection("cunkebao_SysShare");

// ----------------------------
// Collection structure for cunkebao_SysSolution
// ----------------------------
db.getCollection("cunkebao_SysSolution").drop();
db.createCollection("cunkebao_SysSolution");

// ----------------------------
// Collection structure for cunkebao_SysUI
// ----------------------------
db.getCollection("cunkebao_SysUI").drop();
db.createCollection("cunkebao_SysUI");

// ----------------------------
// Collection structure for cunkebao_UserIncome
// ----------------------------
db.getCollection("cunkebao_UserIncome").drop();
db.createCollection("cunkebao_UserIncome");
db.getCollection("cunkebao_UserIncome").createIndex({
    lId: NumberInt("1")
}, {
    name: "lId_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_administrator_permissions
// ----------------------------
db.getCollection("cunkebao_v3_ck_administrator_permissions").drop();
db.createCollection("cunkebao_v3_ck_administrator_permissions");
db.getCollection("cunkebao_v3_ck_administrator_permissions").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_administrators
// ----------------------------
db.getCollection("cunkebao_v3_ck_administrators").drop();
db.createCollection("cunkebao_v3_ck_administrators");
db.getCollection("cunkebao_v3_ck_administrators").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_call_recording
// ----------------------------
db.getCollection("cunkebao_v3_ck_call_recording").drop();
db.createCollection("cunkebao_v3_ck_call_recording");
db.getCollection("cunkebao_v3_ck_call_recording").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_company
// ----------------------------
db.getCollection("cunkebao_v3_ck_company").drop();
db.createCollection("cunkebao_v3_ck_company");
db.getCollection("cunkebao_v3_ck_company").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_customer_acquisition_task
// ----------------------------
db.getCollection("cunkebao_v3_ck_customer_acquisition_task").drop();
db.createCollection("cunkebao_v3_ck_customer_acquisition_task");
db.getCollection("cunkebao_v3_ck_customer_acquisition_task").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_flow_package_order
// ----------------------------
db.getCollection("cunkebao_v3_ck_flow_package_order").drop();
db.createCollection("cunkebao_v3_ck_flow_package_order");
db.getCollection("cunkebao_v3_ck_flow_package_order").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_flow_usage_record
// ----------------------------
db.getCollection("cunkebao_v3_ck_flow_usage_record").drop();
db.createCollection("cunkebao_v3_ck_flow_usage_record");
db.getCollection("cunkebao_v3_ck_flow_usage_record").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_jd_promotion_site
// ----------------------------
db.getCollection("cunkebao_v3_ck_jd_promotion_site").drop();
db.createCollection("cunkebao_v3_ck_jd_promotion_site");
db.getCollection("cunkebao_v3_ck_jd_promotion_site").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_jd_social_media
// ----------------------------
db.getCollection("cunkebao_v3_ck_jd_social_media").drop();
db.createCollection("cunkebao_v3_ck_jd_social_media");
db.getCollection("cunkebao_v3_ck_jd_social_media").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_menus
// ----------------------------
db.getCollection("cunkebao_v3_ck_menus").drop();
db.createCollection("cunkebao_v3_ck_menus");
db.getCollection("cunkebao_v3_ck_menus").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_plan_scene
// ----------------------------
db.getCollection("cunkebao_v3_ck_plan_scene").drop();
db.createCollection("cunkebao_v3_ck_plan_scene");
db.getCollection("cunkebao_v3_ck_plan_scene").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_plan_tags
// ----------------------------
db.getCollection("cunkebao_v3_ck_plan_tags").drop();
db.createCollection("cunkebao_v3_ck_plan_tags");
db.getCollection("cunkebao_v3_ck_plan_tags").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_task_customer
// ----------------------------
db.getCollection("cunkebao_v3_ck_task_customer").drop();
db.createCollection("cunkebao_v3_ck_task_customer");
db.getCollection("cunkebao_v3_ck_task_customer").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_traffic_pool
// ----------------------------
db.getCollection("cunkebao_v3_ck_traffic_pool").drop();
db.createCollection("cunkebao_v3_ck_traffic_pool");
db.getCollection("cunkebao_v3_ck_traffic_pool").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_traffic_source
// ----------------------------
db.getCollection("cunkebao_v3_ck_traffic_source").drop();
db.createCollection("cunkebao_v3_ck_traffic_source");
db.getCollection("cunkebao_v3_ck_traffic_source").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_traffic_source_package
// ----------------------------
db.getCollection("cunkebao_v3_ck_traffic_source_package").drop();
db.createCollection("cunkebao_v3_ck_traffic_source_package");
db.getCollection("cunkebao_v3_ck_traffic_source_package").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_traffic_source_package_item
// ----------------------------
db.getCollection("cunkebao_v3_ck_traffic_source_package_item").drop();
db.createCollection("cunkebao_v3_ck_traffic_source_package_item");
db.getCollection("cunkebao_v3_ck_traffic_source_package_item").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_traffic_tag
// ----------------------------
db.getCollection("cunkebao_v3_ck_traffic_tag").drop();
db.createCollection("cunkebao_v3_ck_traffic_tag");
db.getCollection("cunkebao_v3_ck_traffic_tag").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_user_flow_package
// ----------------------------
db.getCollection("cunkebao_v3_ck_user_flow_package").drop();
db.createCollection("cunkebao_v3_ck_user_flow_package");
db.getCollection("cunkebao_v3_ck_user_flow_package").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_user_portrait
// ----------------------------
db.getCollection("cunkebao_v3_ck_user_portrait").drop();
db.createCollection("cunkebao_v3_ck_user_portrait");
db.getCollection("cunkebao_v3_ck_user_portrait").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_vendor_project
// ----------------------------
db.getCollection("cunkebao_v3_ck_vendor_project").drop();
db.createCollection("cunkebao_v3_ck_vendor_project");
db.getCollection("cunkebao_v3_ck_vendor_project").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_wechat_friendship
// ----------------------------
db.getCollection("cunkebao_v3_ck_wechat_friendship").drop();
db.createCollection("cunkebao_v3_ck_wechat_friendship");
db.getCollection("cunkebao_v3_ck_wechat_friendship").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_wechat_group_member
// ----------------------------
db.getCollection("cunkebao_v3_ck_wechat_group_member").drop();
db.createCollection("cunkebao_v3_ck_wechat_group_member");
db.getCollection("cunkebao_v3_ck_wechat_group_member").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_wechat_tag
// ----------------------------
db.getCollection("cunkebao_v3_ck_wechat_tag").drop();
db.createCollection("cunkebao_v3_ck_wechat_tag");
db.getCollection("cunkebao_v3_ck_wechat_tag").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_workbench
// ----------------------------
db.getCollection("cunkebao_v3_ck_workbench").drop();
db.createCollection("cunkebao_v3_ck_workbench");
db.getCollection("cunkebao_v3_ck_workbench").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_workbench_group_create_item
// ----------------------------
db.getCollection("cunkebao_v3_ck_workbench_group_create_item").drop();
db.createCollection("cunkebao_v3_ck_workbench_group_create_item");
db.getCollection("cunkebao_v3_ck_workbench_group_create_item").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_workbench_group_push
// ----------------------------
db.getCollection("cunkebao_v3_ck_workbench_group_push").drop();
db.createCollection("cunkebao_v3_ck_workbench_group_push");
db.getCollection("cunkebao_v3_ck_workbench_group_push").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_ck_workbench_group_push_item
// ----------------------------
db.getCollection("cunkebao_v3_ck_workbench_group_push_item").drop();
db.createCollection("cunkebao_v3_ck_workbench_group_push_item");
db.getCollection("cunkebao_v3_ck_workbench_group_push_item").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_s2_allot_rule
// ----------------------------
db.getCollection("cunkebao_v3_s2_allot_rule").drop();
db.createCollection("cunkebao_v3_s2_allot_rule");
db.getCollection("cunkebao_v3_s2_allot_rule").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for cunkebao_v3_s2_device_group
// ----------------------------
db.getCollection("cunkebao_v3_s2_device_group").drop();
db.createCollection("cunkebao_v3_s2_device_group");
db.getCollection("cunkebao_v3_s2_device_group").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for 好友关系网络汇总表
// ----------------------------
db.getCollection("好友关系网络汇总表").drop();
db.createCollection("好友关系网络汇总表");
db.getCollection("好友关系网络汇总表").createIndex({
    "用户微信ID": NumberInt("1")
}, {
    name: "用户微信ID_1"
});
db.getCollection("好友关系网络汇总表").createIndex({
    "好友微信ID": NumberInt("1")
}, {
    name: "好友微信ID_1"
});
db.getCollection("好友关系网络汇总表").createIndex({
    "关系等级": NumberInt("1")
}, {
    name: "关系等级_1"
});
db.getCollection("好友关系网络汇总表").createIndex({
    "RFM评分.总分": NumberInt("1")
}, {
    name: "RFM评分.总分_1"
});
db.getCollection("好友关系网络汇总表").createIndex({
    "关系强度评分": NumberInt("1")
}, {
    name: "关系强度评分_1"
});
db.getCollection("好友关系网络汇总表").createIndex({
    "公司ID": NumberInt("1")
}, {
    name: "公司ID_1"
});
