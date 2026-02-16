/*
 Navicat Premium Data Transfer

 Source Server         : kr_存客宝
 Source Server Type    : MySQL
 Source Server Version : 50736
 Source Host           : 56b4c23f6853c.gz.cdb.myqcloud.com:14413
 Source Schema         : cunkebao_v3

 Target Server Type    : MySQL
 Target Server Version : 50736
 File Encoding         : 65001

 Date: 16/12/2025 16:39:24
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ck_administrator_permissions
-- ----------------------------
DROP TABLE IF EXISTS `ck_administrator_permissions`;
CREATE TABLE `ck_administrator_permissions`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自动ID',
  `adminId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '超管用户ID',
  `permissions` json NULL COMMENT '权限对象',
  `createTime` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '更新时间',
  `deleteTime` int(10) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '超级管理员权限配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_administrators
-- ----------------------------
DROP TABLE IF EXISTS `ck_administrators`;
CREATE TABLE `ck_administrators`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '管理员名字',
  `account` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '登录账号',
  `password` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '登录密码',
  `status` tinyint(3) UNSIGNED NULL DEFAULT 1 COMMENT '1->可用，0->禁用',
  `lastLoginTime` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '最近登录时间',
  `lastLoginIp` char(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '最近登录ip',
  `authId` int(10) UNSIGNED NULL DEFAULT 0 COMMENT '权限id',
  `createTime` int(10) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(10) NULL DEFAULT NULL COMMENT '更新时间',
  `deleteTime` int(11) NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '超级管理员表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_ai_knowledge_base
-- ----------------------------
DROP TABLE IF EXISTS `ck_ai_knowledge_base`;
CREATE TABLE `ck_ai_knowledge_base`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `typeId` int(11) NULL DEFAULT 1 COMMENT '类型id',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `label` json NULL COMMENT '标签',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(11) NOT NULL DEFAULT 0 COMMENT '删除时间',
  `documentId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '知识库文件id',
  `fileUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文件地址',
  `size` int(10) NULL DEFAULT NULL COMMENT '文件大小',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'ai知识库' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_ai_knowledge_base_type
-- ----------------------------
DROP TABLE IF EXISTS `ck_ai_knowledge_base_type`;
CREATE TABLE `ck_ai_knowledge_base_type`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` tinyint(2) NULL DEFAULT 1 COMMENT '类型 0系统 1用户创建',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `label` json NULL COMMENT '标签',
  `prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '提示词',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NOT NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(11) NOT NULL DEFAULT 0 COMMENT '删除时间',
  `status` tinyint(2) NULL DEFAULT 1 COMMENT '状态 1启用 0禁用',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'ai知识库类型' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_ai_settings
-- ----------------------------
DROP TABLE IF EXISTS `ck_ai_settings`;
CREATE TABLE `ck_ai_settings`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `config` json NULL COMMENT '配置信息',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isRelease` tinyint(2) NULL DEFAULT 0 COMMENT '是否发布 0未发布 1已发布',
  `releaseTime` int(11) NULL DEFAULT NULL COMMENT '发布时间',
  `botId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '智能体id',
  `datasetId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '知识库id',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'AI配置' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_app_version
-- ----------------------------
DROP TABLE IF EXISTS `ck_app_version`;
CREATE TABLE `ck_app_version`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `forceUpdate` tinyint(2) NULL DEFAULT 0 COMMENT '是否强制更新',
  `version` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `downloadUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `updateContent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_attachments
-- ----------------------------
DROP TABLE IF EXISTS `ck_attachments`;
CREATE TABLE `ck_attachments`  (
  `id` int(10) NOT NULL AUTO_INCREMENT COMMENT '自增长ID',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源名',
  `hash_key` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源hash校验值',
  `server` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '存储服务商',
  `source` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '资源地址',
  `dl_count` int(10) NULL DEFAULT 0 COMMENT '下载次数',
  `size` int(10) NULL DEFAULT 0 COMMENT '资源大小',
  `suffix` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '资源类型',
  `scene` tinyint(3) NOT NULL COMMENT '引用场景，获客海报1',
  `create_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_at` timestamp(0) NULL DEFAULT NULL COMMENT '修改时间',
  `delete_at` timestamp(0) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_hash_key`(`hash_key`) USING BTREE,
  INDEX `idx_server`(`server`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 580 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '附件表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_call_recording
-- ----------------------------
DROP TABLE IF EXISTS `ck_call_recording`;
CREATE TABLE `ck_call_recording`  (
  `id` int(11) NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号',
  `isCallOut` tinyint(2) NULL DEFAULT NULL COMMENT '是否外呼',
  `companyId` int(11) NULL DEFAULT NULL,
  `callType` tinyint(2) NULL DEFAULT NULL,
  `beginTime` int(11) NULL DEFAULT NULL,
  `endTime` int(11) NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_id_phone_isCallOut_companyId`(`id`, `phone`, `isCallOut`, `companyId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_chat_groups
-- ----------------------------
DROP TABLE IF EXISTS `ck_chat_groups`;
CREATE TABLE `ck_chat_groups`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `groupMemo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `groupType` tinyint(2) NULL DEFAULT NULL COMMENT '类型 1好友 2群',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司ID',
  `sort` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '排序',
  `createTime` int(11) NULL DEFAULT NULL,
  `isDel` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除 0未删除 1已删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '聊天分组' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_company
-- ----------------------------
DROP TABLE IF EXISTS `ck_company`;
CREATE TABLE `ck_company`  (
  `id` int(11) UNSIGNED NOT NULL COMMENT '项目真实ID，非自增',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '项目名称',
  `status` tinyint(1) UNSIGNED NULL DEFAULT 1 COMMENT '状态',
  `tenantId` int(11) UNSIGNED NULL DEFAULT 242 COMMENT '触客宝租户ID',
  `companyId` int(11) UNSIGNED NOT NULL COMMENT '触客宝部门ID',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `createTime` int(11) NULL DEFAULT NULL,
  `updateTime` int(11) NULL DEFAULT NULL,
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '部门表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_content_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_content_item`;
CREATE TABLE `ck_content_item`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `libraryId` int(11) NOT NULL COMMENT '所属内容库ID',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'moment' COMMENT '内容类型(moment:朋友圈)',
  `contentType` tinyint(1) NULL DEFAULT 0 COMMENT '0：未知 1：图片 2：链接 3：视频 4：文本 5：小程序 ',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '内容标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文本内容',
  `contentAi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文本内容_Ai版',
  `contentData` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '完整内容数据(JSON格式)',
  `snsId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '朋友圈唯一标识',
  `msgId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群消息唯一标识',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信ID',
  `friendId` int(11) NULL DEFAULT NULL COMMENT '微信好友ID',
  `createMomentTime` bigint(20) NULL DEFAULT 0 COMMENT '朋友圈创建时间',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '记录创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '记录更新时间',
  `coverImage` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图片URL',
  `resUrls` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '资源URL列表(JSON格式)',
  `urls` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '相对路径URL列表(JSON格式)',
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '地理位置名称',
  `lat` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '纬度',
  `lng` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '经度',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态(0:禁用,1:启用)',
  `isDel` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除(0:否,1:是)',
  `delTime` int(11) NULL DEFAULT 0 COMMENT '删除时间',
  `wechatChatroomId` int(11) NULL DEFAULT NULL,
  `senderNickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `createMessageTime` int(11) NULL DEFAULT NULL,
  `comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '评论',
  `sendTime` int(11) NULL DEFAULT 0 COMMENT '预计发布时间',
  `sendTimes` int(11) NULL DEFAULT 0 COMMENT '实际发布时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_library`(`libraryId`) USING BTREE,
  INDEX `idx_snsid`(`snsId`) USING BTREE,
  INDEX `idx_wechatid`(`wechatId`) USING BTREE,
  INDEX `idx_friendid`(`friendId`) USING BTREE,
  INDEX `idx_create_time`(`createTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6090 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '内容项目表-存储朋友圈采集数据' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_content_library
-- ----------------------------
DROP TABLE IF EXISTS `ck_content_library`;
CREATE TABLE `ck_content_library`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `formType` tinyint(2) NULL DEFAULT 0 COMMENT '0存客宝 1触客宝',
  `sourceType` tinyint(2) NOT NULL DEFAULT 1 COMMENT '类型 1好友 2群 3自定义',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '内容库名称',
  `devices` json NULL COMMENT '设备列表',
  `catchType` json NULL COMMENT '采集类型',
  `sourceFriends` json NULL COMMENT '选择的微信好友',
  `sourceGroups` json NULL COMMENT '选择的微信群',
  `groupMembers` json NULL COMMENT '选择的微信群的群成员',
  `keywordInclude` json NULL COMMENT '包含的关键词',
  `keywordExclude` json NULL COMMENT '排除的关键词',
  `aiEnabled` tinyint(1) NULL DEFAULT 0 COMMENT '是否启用AI：0=禁用，1=启用',
  `aiPrompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'AI提示词',
  `timeEnabled` tinyint(1) NULL DEFAULT 0 COMMENT '是否启用时间限制：0=禁用，1=启用',
  `timeStart` int(11) NULL DEFAULT NULL COMMENT '开始时间',
  `timeEnd` int(11) NULL DEFAULT NULL COMMENT '结束时间',
  `status` tinyint(1) NULL DEFAULT 0 COMMENT '状态：0=禁用，1=启用',
  `userId` int(11) NOT NULL COMMENT '用户ID',
  `companyId` int(11) NOT NULL COMMENT '公司ID',
  `createTime` int(11) NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT 0 COMMENT '更新时间',
  `isDel` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 135 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '内容库表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_coze_conversation
-- ----------------------------
DROP TABLE IF EXISTS `ck_coze_conversation`;
CREATE TABLE `ck_coze_conversation`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户id',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `conversation_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '对话ID',
  `bot_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '机器人ID',
  `created_at` int(11) NOT NULL DEFAULT 0 COMMENT '会话创建时间戳',
  `meta_data` json NULL COMMENT '元数据',
  `create_time` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间戳',
  `update_time` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间戳',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_conversation_id`(`conversation_id`) USING BTREE,
  INDEX `idx_bot_id`(`bot_id`) USING BTREE,
  INDEX `idx_create_time`(`create_time`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 56 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Coze AI 会话表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_coze_message
-- ----------------------------
DROP TABLE IF EXISTS `ck_coze_message`;
CREATE TABLE `ck_coze_message`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '消息ID',
  `conversation_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '会话ID',
  `bot_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '机器人ID',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '消息内容',
  `content_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'text' COMMENT '内容类型',
  `role` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '角色',
  `type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '消息类型',
  `created_at` int(11) NOT NULL COMMENT '消息创建时间',
  `updated_at` int(11) NOT NULL COMMENT '消息更新时间',
  `create_time` int(11) NOT NULL COMMENT '记录创建时间',
  `update_time` int(11) NOT NULL COMMENT '记录更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_chat_id`(`chat_id`) USING BTREE,
  INDEX `idx_conversation_id`(`conversation_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 184 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '消息记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_coze_workspace
-- ----------------------------
DROP TABLE IF EXISTS `ck_coze_workspace`;
CREATE TABLE `ck_coze_workspace`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workspace_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '工作区ID',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '工作区名称',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '工作区描述',
  `create_time` datetime(0) NULL DEFAULT NULL COMMENT '创建时间',
  `update_time` datetime(0) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `workspace_id`(`workspace_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Coze空间表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_customer_acquisition_task
-- ----------------------------
DROP TABLE IF EXISTS `ck_customer_acquisition_task`;
CREATE TABLE `ck_customer_acquisition_task`  (
  `id` int(10) NOT NULL AUTO_INCREMENT COMMENT '自增长ID',
  `name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '计划名称',
  `sceneId` int(11) NULL DEFAULT 1 COMMENT '场景ID',
  `sceneConf` json NULL COMMENT '场景具体配置信息',
  `reqConf` json NULL COMMENT '好友申请设置',
  `msgConf` json NULL COMMENT '消息设置',
  `tagConf` json NULL COMMENT '标签设置',
  `userId` int(11) NULL DEFAULT 0 COMMENT '创建者',
  `companyId` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '公司ID',
  `status` tinyint(3) NOT NULL DEFAULT 0 COMMENT '状态 0禁用 1启用',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '修改时间',
  `deleteTime` int(11) NULL DEFAULT 0 COMMENT '删除时间',
  `apiKey` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 178 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '获客计划表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_device
-- ----------------------------
DROP TABLE IF EXISTS `ck_device`;
CREATE TABLE `ck_device`  (
  `id` int(11) UNSIGNED NOT NULL COMMENT '设备真实ID，非自增',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '设备名称',
  `imei` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '设备IMEI',
  `deviceImei` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '设备本地IMEI',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号',
  `operatingSystem` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作系统版本',
  `model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '型号',
  `brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '品牌',
  `rooted` tinyint(1) NULL DEFAULT 0 COMMENT '是否root',
  `xPosed` tinyint(1) NULL DEFAULT 0 COMMENT '是否安装xposed',
  `softwareVersion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '软件版本',
  `extra` json NULL COMMENT '额外信息JSON',
  `alive` tinyint(1) NULL DEFAULT 0 COMMENT '是否在线',
  `companyId` int(11) NOT NULL COMMENT '公司ID',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uni_id_imei`(`imei`, `id`) USING BTREE,
  INDEX `idx_group`(`companyId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_device_handle_log
-- ----------------------------
DROP TABLE IF EXISTS `ck_device_handle_log`;
CREATE TABLE `ck_device_handle_log`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `content` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作说明',
  `deviceId` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '设备id',
  `userId` int(11) NULL DEFAULT NULL COMMENT '用户id',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '租户id',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '操作时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 351 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_device_taskconf
-- ----------------------------
DROP TABLE IF EXISTS `ck_device_taskconf`;
CREATE TABLE `ck_device_taskconf`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `deviceId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '设备ID',
  `autoLike` tinyint(3) NULL DEFAULT 0 COMMENT '自动点赞',
  `momentsSync` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '朋友圈同步',
  `autoCustomerDev` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '自动开发客户',
  `groupMessageDeliver` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '群消息推送',
  `autoGroup` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '自动建群',
  `autoAddFriend` tinyint(3) NULL DEFAULT 0 COMMENT '自动加好友',
  `contentSync` tinyint(255) UNSIGNED NULL DEFAULT 0 COMMENT '朋友圈同步',
  `aiChat` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT 'AI 会话',
  `autoReply` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '自动回复',
  `companyId` int(10) NULL DEFAULT NULL COMMENT '公司ID',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '更新时间',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 31 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备任务配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_device_user
-- ----------------------------
DROP TABLE IF EXISTS `ck_device_user`;
CREATE TABLE `ck_device_user`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `companyId` int(11) UNSIGNED NOT NULL COMMENT '公司id',
  `userId` int(11) UNSIGNED NOT NULL COMMENT '用户id',
  `deviceId` int(11) UNSIGNED NOT NULL COMMENT '设备id',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备跟操盘手的关联关系' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_device_wechat_login
-- ----------------------------
DROP TABLE IF EXISTS `ck_device_wechat_login`;
CREATE TABLE `ck_device_wechat_login`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deviceId` int(11) NULL DEFAULT NULL COMMENT '设备ID',
  `wechatId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信ID',
  `alive` tinyint(3) UNSIGNED NULL DEFAULT 0 COMMENT '微信在线否',
  `companyId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '租户ID',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '更新时间',
  `isTips` tinyint(2) NOT NULL DEFAULT 0 COMMENT '是否提示迁移',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `wechatId`(`wechatId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 322 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备登录微信记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_distribution_channel
-- ----------------------------
DROP TABLE IF EXISTS `ck_distribution_channel`;
CREATE TABLE `ck_distribution_channel`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '渠道ID',
  `companyId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '公司ID',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '渠道名称',
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '渠道编码（系统生成）',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '联系电话',
  `password` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '密码（MD5加密）',
  `wechatId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '微信号',
  `remarks` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '备注信息',
  `createType` enum('manual','auto') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'manual' COMMENT '创建类型：manual手动创建，auto扫码创建',
  `status` enum('enabled','disabled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled启用，disabled禁用',
  `totalCustomers` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '总获客数',
  `todayCustomers` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '今日获客数',
  `totalFriends` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '总加好友数',
  `todayFriends` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '今日加好友数',
  `withdrawableAmount` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '可提现金额（分）',
  `createTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间',
  `deleteTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_code`(`code`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_deleteTime`(`deleteTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '分销渠道表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_distribution_revenue_record
-- ----------------------------
DROP TABLE IF EXISTS `ck_distribution_revenue_record`;
CREATE TABLE `ck_distribution_revenue_record`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收益记录ID',
  `companyId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '公司ID',
  `channelId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '渠道ID',
  `channelCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '渠道编码（冗余字段，方便查询）',
  `type` enum('customer_acquisition','add_friend','order','poster','phone','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'other' COMMENT '收益类型：customer_acquisition获客，add_friend加好友，order订单，poster海报，phone电话，other其他',
  `sourceType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '来源类型（如：海报获客、加好友任务等）',
  `sourceId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '来源ID（关联任务ID或其他业务ID）',
  `amount` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '收益金额（分，整型，单位分）',
  `remark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '备注信息',
  `createTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_channelId`(`channelId`) USING BTREE,
  INDEX `idx_channelCode`(`channelCode`) USING BTREE,
  INDEX `idx_type`(`type`) USING BTREE,
  INDEX `idx_createTime`(`createTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '分销渠道收益明细表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_distribution_withdrawal
-- ----------------------------
DROP TABLE IF EXISTS `ck_distribution_withdrawal`;
CREATE TABLE `ck_distribution_withdrawal`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '提现申请ID',
  `companyId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '公司ID',
  `channelId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '渠道ID',
  `amount` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '提现金额（分，整型，单位分）',
  `payType` enum('wechat','alipay','bankcard') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'wechat' COMMENT '支付类型：wechat微信，alipay支付宝，bankcard银行卡',
  `status` enum('pending','approved','rejected','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending' COMMENT '状态：pending待审核，approved已通过，rejected已拒绝，paid已打款',
  `reviewer` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '审核人',
  `reviewTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '审核时间',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '备注/拒绝理由',
  `applyTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '申请时间',
  `createTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_channelId`(`channelId`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_applyTime`(`applyTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '分销渠道提现申请表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_flow_package
-- ----------------------------
DROP TABLE IF EXISTS `ck_flow_package`;
CREATE TABLE `ck_flow_package`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '套餐名称',
  `tag` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '套餐标签',
  `originalPrice` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '原价',
  `price` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '售价',
  `monthlyFlow` int(11) NOT NULL DEFAULT 0 COMMENT '每月流量(人/月)',
  `duration` int(11) NOT NULL DEFAULT 1 COMMENT '套餐时长(月)',
  `privileges` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '套餐特权，多行文本存储',
  `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `isDel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除: 0=否, 1=是',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_name`(`name`) USING BTREE,
  INDEX `idx_tag`(`tag`) USING BTREE,
  INDEX `idx_is_del`(`isDel`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量套餐表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_flow_package_order
-- ----------------------------
DROP TABLE IF EXISTS `ck_flow_package_order`;
CREATE TABLE `ck_flow_package_order`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `orderNo` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '订单编号',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `packageId` int(11) NOT NULL DEFAULT 0 COMMENT '套餐ID',
  `packageName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '套餐名称',
  `amount` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '订单金额',
  `duration` int(11) NOT NULL DEFAULT 1 COMMENT '购买时长(月)',
  `payStatus` tinyint(1) NOT NULL DEFAULT 0 COMMENT '支付状态: 0=未支付, 1=已支付，10=无需支付',
  `payTime` int(11) NOT NULL DEFAULT 0 COMMENT '支付时间',
  `payType` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '支付方式: wechat=微信, alipay=支付宝，nopay=无需支付',
  `transactionId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '第三方支付交易号',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '订单状态: 0=待支付, 1=已支付, 2=已取消, 3=已退款',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '备注',
  `isDel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除: 0=否, 1=是',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_order_no`(`orderNo`) USING BTREE,
  INDEX `idx_user_id`(`userId`) USING BTREE,
  INDEX `idx_package_id`(`packageId`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_pay_status`(`payStatus`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 37 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '套餐订单表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_flow_usage_record
-- ----------------------------
DROP TABLE IF EXISTS `ck_flow_usage_record`;
CREATE TABLE `ck_flow_usage_record`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `packageId` int(11) NOT NULL DEFAULT 0 COMMENT '套餐ID',
  `userPackageId` int(11) NOT NULL DEFAULT 0 COMMENT '用户套餐ID',
  `taskId` int(11) NOT NULL DEFAULT 0 COMMENT '关联任务ID',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '微信号',
  `usageAmount` int(11) NOT NULL DEFAULT 0 COMMENT '使用量(人)',
  `usageType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '使用类型: 1=添加好友, 2=群发消息, 3=其他',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '备注',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`userId`) USING BTREE,
  INDEX `idx_package_id`(`packageId`) USING BTREE,
  INDEX `idx_user_package_id`(`userPackageId`) USING BTREE,
  INDEX `idx_task_id`(`taskId`) USING BTREE,
  INDEX `idx_phone`(`phone`) USING BTREE,
  INDEX `idx_create_time`(`createTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量使用记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_jd_promotion_site
-- ----------------------------
DROP TABLE IF EXISTS `ck_jd_promotion_site`;
CREATE TABLE `ck_jd_promotion_site`  (
  `id` bigint(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `jdSocialMediaId` bigint(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_jd_social_media
-- ----------------------------
DROP TABLE IF EXISTS `ck_jd_social_media`;
CREATE TABLE `ck_jd_social_media`  (
  `id` bigint(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `appkey` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `secretkey` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_ai_push
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_ai_push`;
CREATE TABLE `ck_kf_ai_push`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '推送名称',
  `tags` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '目标用户标签（JSON数组格式）',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '推送内容（支持变量：{客户名称}{产品功能}{核心价值}等）',
  `pushTiming` tinyint(4) NOT NULL DEFAULT 1 COMMENT '推送时机：1=立即推送，2=最佳时机(AI决定)，3=定时推送',
  `scheduledTime` int(11) NOT NULL DEFAULT 0 COMMENT '定时推送时间（时间戳，仅当pushTiming=3时有效）',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '启用状态：0=禁用，1=启用',
  `successRate` decimal(5, 2) NOT NULL DEFAULT 0.00 COMMENT '成功率（百分比，保留两位小数）',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司ID',
  `isDel` tinyint(4) NOT NULL DEFAULT 0 COMMENT '删除标记：0=未删除，1=已删除',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间（时间戳）',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间（时间戳）',
  `delTime` int(11) NOT NULL DEFAULT 0 COMMENT '删除时间（时间戳）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_company_user`(`companyId`, `userId`) USING BTREE,
  INDEX `idx_pushTiming`(`pushTiming`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_isDel`(`isDel`) USING BTREE,
  INDEX `idx_scheduledTime`(`scheduledTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'AI智能推送表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_ai_push_record
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_ai_push_record`;
CREATE TABLE `ck_kf_ai_push_record`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `pushId` int(11) NOT NULL DEFAULT 0 COMMENT '推送ID',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司ID',
  `wechatAccountId` int(11) NOT NULL DEFAULT 0 COMMENT '微信账号ID',
  `friendIdOrGroupId` int(11) NOT NULL DEFAULT 0 COMMENT '好友ID或群ID',
  `isSend` tinyint(4) NOT NULL DEFAULT 0 COMMENT '是否发送：0=未发送，1=已发送',
  `sendTime` int(11) NOT NULL DEFAULT 0 COMMENT '发送时间（时间戳）',
  `receiveTime` int(11) NOT NULL DEFAULT 0 COMMENT '接收时间（时间戳）',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间（时间戳）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_pushId`(`pushId`) USING BTREE,
  INDEX `idx_company`(`companyId`) USING BTREE,
  INDEX `idx_user`(`userId`) USING BTREE,
  INDEX `idx_createTime`(`createTime`) USING BTREE,
  INDEX `idx_isSend`(`isSend`) USING BTREE,
  INDEX `idx_wechatAccount`(`wechatAccountId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'AI智能推送记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_auto_greetings
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_auto_greetings`;
CREATE TABLE `ck_kf_auto_greetings`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '规则名称',
  `trigger` tinyint(4) NOT NULL DEFAULT 0 COMMENT '触发类型：1=好友首次添加，2=首次发消息，3=时间触发，4=关键词触发，5=生日触发，6=自定义',
  `condition` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '具体条件（JSON格式）',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '问候内容',
  `level` int(11) NOT NULL DEFAULT 0 COMMENT '优先级（数字越小优先级越高）',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '启用状态：0=禁用，1=启用',
  `usageCount` int(11) NOT NULL DEFAULT 0 COMMENT '使用次数',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司ID',
  `is_template` tinyint(4) NOT NULL DEFAULT 0 COMMENT '是否模板：0=否，1=是',
  `isDel` tinyint(4) NOT NULL DEFAULT 0 COMMENT '删除标记：0=未删除，1=已删除',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间（时间戳）',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间（时间戳）',
  `delTime` int(11) NOT NULL DEFAULT 0 COMMENT '删除时间（时间戳）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_company_user`(`companyId`, `userId`) USING BTREE,
  INDEX `idx_trigger`(`trigger`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_isDel`(`isDel`) USING BTREE,
  INDEX `idx_level`(`level`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '问候规则表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_auto_greetings_record
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_auto_greetings_record`;
CREATE TABLE `ck_kf_auto_greetings_record`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `autoId` int(11) NOT NULL DEFAULT 0 COMMENT '规则ID',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司ID',
  `wechatAccountId` int(11) NOT NULL DEFAULT 0 COMMENT '微信账号ID',
  `friendIdOrGroupId` int(11) NOT NULL DEFAULT 0 COMMENT '好友ID或群ID',
  `isSend` tinyint(4) NOT NULL DEFAULT 0 COMMENT '是否发送：0=未发送，1=已发送',
  `sendTime` int(11) NOT NULL DEFAULT 0 COMMENT '发送时间（时间戳）',
  `receiveTime` int(11) NOT NULL DEFAULT 0 COMMENT '接收时间（时间戳）',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间（时间戳）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_autoId`(`autoId`) USING BTREE,
  INDEX `idx_company`(`companyId`) USING BTREE,
  INDEX `idx_user`(`userId`) USING BTREE,
  INDEX `idx_createTime`(`createTime`) USING BTREE,
  INDEX `idx_isSend`(`isSend`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '问候规则使用记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_follow_up
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_follow_up`;
CREATE TABLE `ck_kf_follow_up`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `friendId` int(12) NULL DEFAULT NULL COMMENT '好友id',
  `type` tinyint(2) NULL DEFAULT 0 COMMENT '类型 0其他 1电话回访 2发送消息 3安排会议 4发送邮件',
  `reminderTime` int(12) NULL DEFAULT NULL COMMENT '提醒时间',
  `isRemind` tinyint(2) NULL DEFAULT 0 COMMENT '是否提醒',
  `isProcess` tinyint(2) NULL DEFAULT 0 COMMENT '是否处理',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_userId`(`userId`) USING BTREE,
  INDEX `idx_level`(`type`) USING BTREE,
  INDEX `idx_isRemind`(`isRemind`) USING BTREE,
  INDEX `idx_isProcess`(`isProcess`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '跟进提醒' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_friend_settings
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_friend_settings`;
CREATE TABLE `ck_kf_friend_settings`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `type` tinyint(2) NULL DEFAULT 0 COMMENT '匹配类型 0人工接待 1AI辅助 2AI接管',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `friendId` int(11) NULL DEFAULT NULL COMMENT '好友id',
  `conversationId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '会话id',
  `conversationTime` int(11) NULL DEFAULT NULL COMMENT '会话创建时间',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_userId`(`userId`) USING BTREE,
  INDEX `idx_wechatAccountId`(`wechatAccountId`) USING BTREE,
  INDEX `idx_friendId`(`friendId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 51 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '好友AI配置' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_keywords
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_keywords`;
CREATE TABLE `ck_kf_keywords`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `keywords` json NULL COMMENT '关键词',
  `type` tinyint(2) NULL DEFAULT NULL COMMENT '匹配类型 0模糊 1精确',
  `replyType` tinyint(2) NULL DEFAULT NULL COMMENT '回复类型 0素材回复 1自定义',
  `content` json NULL COMMENT '自定义内容',
  `metailGroups` json NULL COMMENT '素材id',
  `status` tinyint(2) NULL DEFAULT NULL COMMENT '状态 0停用 1启用',
  `level` tinyint(2) NULL DEFAULT 0 COMMENT '等级 0低优先级 1中优先级 2高优先级',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '关键词管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_material
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_material`;
CREATE TABLE `ck_kf_material`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `title` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `content` json NULL COMMENT '内容',
  `cover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面',
  `status` tinyint(2) NULL DEFAULT NULL COMMENT '状态 0停用 1启用',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '素材库管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_moments
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_moments`;
CREATE TABLE `ck_kf_moments`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `sendData` json NULL COMMENT '发送的具体信息',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `isSend` tinyint(2) NULL DEFAULT 0 COMMENT '是否发送 0否 1是',
  `sendTime` int(11) NULL DEFAULT NULL COMMENT '发送时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '客服端发布朋友圈记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_moments_settings
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_moments_settings`;
CREATE TABLE `ck_kf_moments_settings`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `wechatId` int(12) NULL DEFAULT NULL COMMENT '微信客服id',
  `max` int(11) NULL DEFAULT 5 COMMENT '每日上限',
  `sendNum` int(11) NULL DEFAULT 0 COMMENT '今日发送次数',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '客服朋友圈配置信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_notice
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_notice`;
CREATE TABLE `ck_kf_notice`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` tinyint(2) NULL DEFAULT NULL COMMENT '通知类型 1代办事项 2跟进提醒 ',
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `bindId` int(11) NULL DEFAULT NULL COMMENT '绑定的id',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '通知消息',
  `isRead` tinyint(2) NULL DEFAULT 0 COMMENT '是否读取',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `readTime` int(12) NULL DEFAULT NULL COMMENT '读取时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 252 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '通知消息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_questions
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_questions`;
CREATE TABLE `ck_kf_questions`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `type` tinyint(2) NULL DEFAULT 0 COMMENT '匹配类型 0模糊 1精确',
  `questions` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '问题',
  `answers` json NULL COMMENT '答案',
  `status` tinyint(2) NULL DEFAULT 1 COMMENT '状态 0禁用 1启用',
  `isDel` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `deleteTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_userId`(`userId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'AI问答' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_reply
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_reply`;
CREATE TABLE `ck_kf_reply`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NULL DEFAULT NULL,
  `userId` int(11) NULL DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `msgType` tinyint(2) NULL DEFAULT NULL,
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  `lastUpdateTime` int(11) NULL DEFAULT NULL,
  `sortIndex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 130753 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '快捷回复' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_reply_group
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_reply_group`;
CREATE TABLE `ck_kf_reply_group`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int(11) NULL DEFAULT 0,
  `companyId` int(11) NULL DEFAULT 0,
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `sortIndex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `parentId` int(11) NULL DEFAULT NULL,
  `replyType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `replys` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21898 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '快捷回复分组' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_sensitive_word
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_sensitive_word`;
CREATE TABLE `ck_kf_sensitive_word`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `keywords` json NULL COMMENT '关键词',
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '替换内容/警告内容',
  `operation` tinyint(2) NULL DEFAULT NULL COMMENT '操作 0不操作 1替换 2删除 3警告 4禁止发送',
  `status` tinyint(2) NULL DEFAULT NULL COMMENT '状态 0停用 1启用',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '敏感词管理' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_kf_to_do
-- ----------------------------
DROP TABLE IF EXISTS `ck_kf_to_do`;
CREATE TABLE `ck_kf_to_do`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `friendId` int(12) NULL DEFAULT NULL COMMENT '好友id',
  `level` tinyint(2) NULL DEFAULT 0 COMMENT '提示等级 0低优先级 1中优先级 2高优先级 3紧急',
  `reminderTime` int(12) NULL DEFAULT NULL COMMENT '提醒时间',
  `isRemind` tinyint(2) NULL DEFAULT 0 COMMENT '是否提醒',
  `isProcess` tinyint(2) NULL DEFAULT 0 COMMENT '是否处理',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_userId`(`userId`) USING BTREE,
  INDEX `idx_level`(`level`) USING BTREE,
  INDEX `idx_isRemind`(`isRemind`) USING BTREE,
  INDEX `idx_isProcess`(`isProcess`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '待办事项' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_menus
-- ----------------------------
DROP TABLE IF EXISTS `ck_menus`;
CREATE TABLE `ck_menus`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `title` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '菜单名称',
  `path` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '路由路径',
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图标名称',
  `parentId` int(11) NOT NULL DEFAULT 0 COMMENT '父菜单ID，0表示顶级菜单',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序，数值越小越靠前',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_parent_id`(`parentId`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 15 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '系统菜单表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_order
-- ----------------------------
DROP TABLE IF EXISTS `ck_order`;
CREATE TABLE `ck_order`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `mchId` int(11) NULL DEFAULT NULL COMMENT '门店号',
  `companyId` int(11) UNSIGNED NOT NULL,
  `userId` int(11) NULL DEFAULT NULL,
  `orderType` tinyint(2) NULL DEFAULT NULL COMMENT '订单类型 1购买算力',
  `status` tinyint(1) UNSIGNED NULL DEFAULT 0 COMMENT '支付状态 0待支付 1已付款 2已退款 3付款失败',
  `goodsId` int(11) NULL DEFAULT 0 COMMENT '商品id',
  `goodsName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '商品名称',
  `goodsSpecs` json NULL COMMENT '商品规格',
  `money` int(11) NULL DEFAULT 0 COMMENT '金额 单位分',
  `orderNo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '订单号',
  `ip` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `nonceStr` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '随机字符串',
  `createTime` int(11) NULL DEFAULT NULL,
  `payType` tinyint(2) NULL DEFAULT NULL COMMENT '支付类型 1微信 2支付宝',
  `payTime` int(11) NULL DEFAULT NULL,
  `payInfo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '错误信息',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 106 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_plan_scene
-- ----------------------------
DROP TABLE IF EXISTS `ck_plan_scene`;
CREATE TABLE `ck_plan_scene`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `name` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '场景名称',
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `image` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图片icon',
  `status` tinyint(3) NULL DEFAULT NULL COMMENT '状态',
  `sort` tinyint(3) NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '修改时间',
  `deleteTime` int(11) NULL DEFAULT 0 COMMENT '删除时间',
  `scenarioTags` json NULL COMMENT '标签',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '获客场景' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_plan_tags
-- ----------------------------
DROP TABLE IF EXISTS `ck_plan_tags`;
CREATE TABLE `ck_plan_tags`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tagName` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签名',
  `companyId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '部门ID',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量标签表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_task_customer
-- ----------------------------
DROP TABLE IF EXISTS `ck_task_customer`;
CREATE TABLE `ck_task_customer`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `channelId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '渠道ID（分销渠道ID，对应distribution_channel.id）',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '客户姓名',
  `source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '来源',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `remark` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `tags` json NULL,
  `siteTags` json NULL COMMENT '站内标签',
  `processed_wechat_ids` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0-未处理，1-已处理/添加中，2-~~添加成功~~ ~~已添加~~添加任务成功 3-添加失败 4-已通过-已发消息',
  `fail_reason` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `addTime` int(11) NOT NULL DEFAULT 0 COMMENT '添加时间',
  `passTime` int(11) NOT NULL DEFAULT 0 COMMENT '通过时间',
  `createTime` int(11) NOT NULL DEFAULT 0,
  `updateTime` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `task_id`(`task_id`) USING BTREE,
  INDEX `addTime`(`addTime`) USING BTREE,
  INDEX `passTime`(`passTime`) USING BTREE,
  INDEX `updateTime`(`updateTime`) USING BTREE,
  INDEX `idx_channelId`(`channelId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 28222 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_tokens_company
-- ----------------------------
DROP TABLE IF EXISTS `ck_tokens_company`;
CREATE TABLE `ck_tokens_company`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int(10) NULL DEFAULT 0,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `tokens` bigint(100) NULL DEFAULT NULL,
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `isAdmin` tinyint(2) NULL DEFAULT 0 COMMENT '是否公司主号',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '公司算力账户' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_tokens_form
-- ----------------------------
DROP TABLE IF EXISTS `ck_tokens_form`;
CREATE TABLE `ck_tokens_form`  (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `tokens` int(12) NULL DEFAULT 0 COMMENT '消耗token',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `status` tinyint(2) NULL DEFAULT 0 COMMENT '状态',
  `createTime` int(11) NULL DEFAULT 0,
  `delTime` int(11) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_tokens_package
-- ----------------------------
DROP TABLE IF EXISTS `ck_tokens_package`;
CREATE TABLE `ck_tokens_package`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `tokens` int(12) NULL DEFAULT NULL,
  `price` int(12) NULL DEFAULT NULL COMMENT '售价 单位分',
  `originalPrice` int(12) NULL DEFAULT NULL COMMENT '原价 单位分',
  `description` json NULL COMMENT '描述',
  `sort` int(12) NULL DEFAULT 50 COMMENT '排序',
  `isTrial` tinyint(2) NULL DEFAULT 0 COMMENT '是否试用',
  `isRecommend` tinyint(2) NULL DEFAULT 0 COMMENT '是否推荐',
  `isHot` tinyint(2) NULL DEFAULT 0 COMMENT '是否热门',
  `isVip` tinyint(2) NULL DEFAULT 0 COMMENT '是否VIP',
  `status` tinyint(2) NULL DEFAULT 0 COMMENT '状态 0停用 1启用',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `delTime` int(12) NULL DEFAULT NULL COMMENT '删除时间',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(12) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'token套餐' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_tokens_record
-- ----------------------------
DROP TABLE IF EXISTS `ck_tokens_record`;
CREATE TABLE `ck_tokens_record`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL DEFAULT 0 COMMENT '公司id',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '创建用户ID',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `friendIdOrGroupId` int(11) NULL DEFAULT NULL COMMENT '好友id或者群id',
  `form` int(11) NULL DEFAULT 0 COMMENT '来源 \r\n0 未知\r\n1 点赞\r\n2 朋友圈同步\r\n3 朋友圈发布\r\n4 群发微信\r\n5 群发群消息\r\n6 群发群公告\r\n7 海报获客\r\n8 订单获客\r\n9 电话获客\r\n10 微信群获客\r\n11 API获客\r\n12 AI改写\r\n13 AI客服\r\n14 生成群公告\r\n\r\n1001 商家 \r\n1002 充值 \r\n1003 系统',
  `type` tinyint(2) NULL DEFAULT 0 COMMENT '类型 0减少 1增加',
  `tokens` int(11) NULL DEFAULT NULL COMMENT '消耗tokens',
  `balanceTokens` int(11) NULL DEFAULT NULL COMMENT '剩余tokens',
  `remarks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `createTime` int(12) NULL DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 336 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '算力明细记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_order
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_order`;
CREATE TABLE `ck_traffic_order`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `companyId` int(10) UNSIGNED NULL DEFAULT NULL,
  `identifier` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量池用户',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `isDel` tinyint(2) NULL DEFAULT 0,
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  `orderno` varchar(0) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '订单编号',
  `userId` int(11) NULL DEFAULT NULL,
  `storeId` int(11) NULL DEFAULT NULL COMMENT '门店id',
  `goddsName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '商品价格',
  `price` int(10) NULL DEFAULT NULL COMMENT '商品价格',
  `actualPay` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '实际支付',
  `ownerWechatId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_pool
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_pool`;
CREATE TABLE `ck_traffic_pool`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量标识，可以是手机号、微信号',
  `mobile` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号',
  `wechatId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信ID',
  `createTime` int(10) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(10) NULL DEFAULT NULL COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uni_identifier`(`identifier`) USING BTREE,
  INDEX `idx_wechatId`(`wechatId`) USING BTREE,
  INDEX `idx_mobile`(`mobile`) USING BTREE,
  INDEX `idx_create_time`(`createTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1201225 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量池' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_profile
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_profile`;
CREATE TABLE `ck_traffic_profile`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量标识，可以是手机号、微信号',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '平台昵称',
  `avatar` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '平台头像',
  `gender` tinyint(3) NULL DEFAULT 0 COMMENT '平台性别',
  `phone` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '平台手机号',
  `platformId` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '平台Id',
  `createTime` int(10) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(10) NULL DEFAULT NULL COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uni_identifier`(`identifier`) USING BTREE,
  INDEX `idx_mobile`(`phone`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 196606 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量池用户个人信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_source
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_source`;
CREATE TABLE `ck_traffic_source`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `type` tinyint(2) NULL DEFAULT 1 COMMENT '流量来源 0其他 1好友 2群 3场景',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量标识',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `status` tinyint(3) NULL DEFAULT 1 COMMENT '1待处理，2处理中，3已通过，4已拒绝，5已过期，6已取消 -3已删除（同步 tk_friend_task 表的 status）',
  `sourceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '来源id（微信id或群id）',
  `fromd` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量来源(群聊名称)',
  `sceneId` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '场景ID',
  `companyId` int(11) NULL DEFAULT 0 COMMENT '账号所属项目id',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '修改时间',
  `R` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  `F` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  `M` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_identifier_sourceId_sceneId`(`identifier`, `sourceId`, `sceneId`) USING BTREE,
  INDEX `idx_identifier`(`identifier`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE,
  INDEX `idx_company_status_time`(`companyId`, `status`, `updateTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 586456 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量来源' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_source_package
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_source_package`;
CREATE TABLE `ck_traffic_source_package`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `userId` int(10) NULL DEFAULT NULL COMMENT '用户id',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '描述',
  `pic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图标',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '账号所属项目id',
  `matchingRules` json NULL COMMENT '匹配规则',
  `isSys` tinyint(2) NULL DEFAULT 0 COMMENT '是否系统只有',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `updateTime` int(11) NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT 0 COMMENT '创建时间',
  `deleteTime` int(11) NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `companyId`(`companyId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量池包' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_source_package_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_source_package_item`;
CREATE TABLE `ck_traffic_source_package_item`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `packageId` int(10) NULL DEFAULT NULL COMMENT '流量包id',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '账号所属项目id',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '流量标识，可以是手机号、微信号',
  `isDel` tinyint(2) NULL DEFAULT 0 COMMENT '是否删除',
  `createTime` int(11) NULL DEFAULT 0 COMMENT '创建时间',
  `deleteTime` int(10) NULL DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_packageId_companyId_identifier_isDel`(`packageId`, `companyId`, `identifier`, `isDel`) USING BTREE,
  INDEX `packageId`(`packageId`) USING BTREE,
  INDEX `companyId`(`companyId`) USING BTREE,
  INDEX `identifier`(`identifier`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_traffic_tag
-- ----------------------------
DROP TABLE IF EXISTS `ck_traffic_tag`;
CREATE TABLE `ck_traffic_tag`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tagId` int(11) NULL DEFAULT NULL,
  `tagName` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签名',
  `tagType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签值',
  `tagValue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签值',
  `companyId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '部门ID',
  `trafficPoolId` int(10) NULL DEFAULT NULL COMMENT '流量池用户id traffic_pool的主键',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `isDel` tinyint(2) NULL DEFAULT NULL,
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量标签表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_user_flow_package
-- ----------------------------
DROP TABLE IF EXISTS `ck_user_flow_package`;
CREATE TABLE `ck_user_flow_package`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `packageId` int(11) NOT NULL DEFAULT 0 COMMENT '套餐ID',
  `orderId` int(11) NOT NULL DEFAULT 0 COMMENT '关联订单ID',
  `duration` int(11) NOT NULL DEFAULT 1 COMMENT '套餐时长(月)',
  `totalFlow` int(11) NOT NULL DEFAULT 0 COMMENT '总流量(人)',
  `usedFlow` int(11) NOT NULL DEFAULT 0 COMMENT '已使用流量(人)',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 0=无效, 1=有效',
  `startTime` int(11) NOT NULL DEFAULT 0 COMMENT '开始时间',
  `expireTime` int(11) NOT NULL DEFAULT 0 COMMENT '到期时间',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`userId`) USING BTREE,
  INDEX `idx_package_id`(`packageId`) USING BTREE,
  INDEX `idx_order_id`(`orderId`) USING BTREE,
  INDEX `idx_expire_time`(`expireTime`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户流量套餐表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_user_log
-- ----------------------------
DROP TABLE IF EXISTS `ck_user_log`;
CREATE TABLE `ck_user_log`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `userId` int(11) NOT NULL DEFAULT 0 COMMENT '用户ID',
  `userName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '用户名',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '操作类型',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '操作描述',
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT 'IP地址',
  `userAgent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '用户设备信息',
  `requestMethod` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '请求方法',
  `requestUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '请求URL',
  `requestData` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '请求数据',
  `responseCode` int(11) NULL DEFAULT 0 COMMENT '响应状态码',
  `responseMsg` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '响应消息',
  `createTime` int(11) NULL DEFAULT 0 COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`userId`) USING BTREE,
  INDEX `idx_user_name`(`userName`) USING BTREE,
  INDEX `idx_action`(`action`) USING BTREE,
  INDEX `idx_create_time`(`createTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 45 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户操作日志表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_user_portrait
-- ----------------------------
DROP TABLE IF EXISTS `ck_user_portrait`;
CREATE TABLE `ck_user_portrait`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` tinyint(2) NULL DEFAULT 0 COMMENT '类型 0浏览 1点击 2下单/购买 3注册 4互动',
  `companyId` int(11) NULL DEFAULT 0,
  `trafficPoolId` int(10) NULL DEFAULT NULL COMMENT '流量池用户id traffic_pool的主键',
  `source` tinyint(2) NULL DEFAULT 0 COMMENT '来源 0本站 1老油条 2老坑爹',
  `uniqueId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0' COMMENT '来源网站唯一id',
  `sourceData` json NULL COMMENT '来源网站数据',
  `remark` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `count` int(10) NULL DEFAULT 1 COMMENT '统计次数（半小时内）',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 22602 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户画像' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_users
-- ----------------------------
DROP TABLE IF EXISTS `ck_users`;
CREATE TABLE `ck_users`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `account` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号',
  `username` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `phone` char(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '登录手机号',
  `passwordMd5` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码',
  `passwordLocal` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '本地密码',
  `avatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'https://img.icons8.com/color/512/circled-user-male-skin-type-7.png' COMMENT '头像',
  `isAdmin` tinyint(3) NULL DEFAULT 0 COMMENT '是否管理身份 1->是 0->否',
  `companyId` int(10) UNSIGNED NOT NULL COMMENT '账号所属项目id',
  `typeId` tinyint(3) NOT NULL DEFAULT -1 COMMENT '类型：运营后台/操盘手 传1   、 门店传2',
  `status` tinyint(3) NULL DEFAULT 0 COMMENT '1->可用，0->禁用',
  `s2_accountId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'S2的用户账号id',
  `balance` int(11) NULL DEFAULT 0 COMMENT '余额',
  `tokens` int(11) NULL DEFAULT 0 COMMENT '算力余额',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '修改时间',
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1666 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_vendor_order
-- ----------------------------
DROP TABLE IF EXISTS `ck_vendor_order`;
CREATE TABLE `ck_vendor_order`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `orderNo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '订单编号',
  `userId` int(10) UNSIGNED NOT NULL COMMENT '用户ID',
  `packageId` int(10) UNSIGNED NOT NULL COMMENT '套餐ID',
  `packageName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐名称',
  `totalAmount` decimal(10, 2) NOT NULL COMMENT '订单总额',
  `payAmount` decimal(10, 2) NOT NULL COMMENT '支付金额',
  `advancePayment` decimal(10, 2) NULL DEFAULT 0.00 COMMENT '预付款',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '状态：0=待支付，1=已支付，2=已完成，3=已取消',
  `payTime` int(11) NULL DEFAULT 0 COMMENT '支付时间',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `updateTime` int(11) NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `orderNo`(`orderNo`) USING BTREE,
  INDEX `userId`(`userId`) USING BTREE,
  INDEX `packageId`(`packageId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '供应商订单表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_vendor_package
-- ----------------------------
DROP TABLE IF EXISTS `ck_vendor_package`;
CREATE TABLE `ck_vendor_package`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '套餐ID',
  `userId` int(11) NULL DEFAULT NULL COMMENT '用户id',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '公司id',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '套餐名称',
  `originalPrice` decimal(10, 2) NOT NULL COMMENT '原价',
  `price` decimal(10, 2) NOT NULL COMMENT '售价',
  `discount` decimal(4, 2) NULL DEFAULT 0.00 COMMENT '折扣',
  `advancePayment` decimal(10, 2) NULL DEFAULT 0.00 COMMENT '预付款',
  `tags` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '套餐描述',
  `cover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图片',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：0=下架，1=上架',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `updateTime` int(11) NOT NULL COMMENT '更新时间',
  `isDel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '供应商套餐表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_vendor_project
-- ----------------------------
DROP TABLE IF EXISTS `ck_vendor_project`;
CREATE TABLE `ck_vendor_project`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `packageId` int(10) UNSIGNED NOT NULL COMMENT '套餐ID',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '项目名称',
  `originalPrice` decimal(10, 2) NOT NULL COMMENT '原价',
  `price` decimal(10, 2) NOT NULL COMMENT '售价',
  `duration` int(11) NULL DEFAULT 0 COMMENT '项目时长(分钟)',
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '项目图片',
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '项目详情',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `updateTime` int(11) NOT NULL COMMENT '更新时间',
  `isDel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `packageId`(`packageId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '供应商套餐项目表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_account
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_account`;
CREATE TABLE `ck_wechat_account`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `s2_wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '微信账号id',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信ID',
  `alias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信号',
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `pyInitial` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '拼音首字母',
  `quanPin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '全拼',
  `avatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头像URL',
  `gender` tinyint(1) NULL DEFAULT 0 COMMENT '性别 0->保密；1->男；2->女',
  `region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '地区',
  `signature` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '个性签名',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '电话',
  `country` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '国家',
  `privince` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '省份',
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '城市',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uni_wechatId`(`wechatId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4282931 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信账号表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_customer
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_customer`;
CREATE TABLE `ck_wechat_customer`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `wechatId` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信id',
  `basic` json NULL COMMENT '保存基础信息',
  `weight` json NULL COMMENT '保存权重信息',
  `activity` json NULL COMMENT '保存账号活跃信息',
  `friendShip` json NULL COMMENT '保存朋友关系信息',
  `companyId` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '公司id',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uni_wechatId`(`wechatId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 159 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信客服信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_friendship
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_friendship`;
CREATE TABLE `ck_wechat_friendship`  (
  `id` int(11) UNSIGNED NULL DEFAULT 0 COMMENT '好友id',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `tags` json NULL COMMENT '好友标签',
  `memo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '好友备注',
  `ownerWechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '所有者微信ID',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '公司ID',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  UNIQUE INDEX `uk_owner_wechat_account`(`ownerWechatId`, `wechatId`) USING BTREE,
  INDEX `idx_wechat_id`(`wechatId`) USING BTREE,
  INDEX `idx_owner_wechat_id`(`ownerWechatId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信好友表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_group
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_group`;
CREATE TABLE `ck_wechat_group`  (
  `id` int(11) UNSIGNED NOT NULL COMMENT 'S2微信群id',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '微信账号ID',
  `chatroomId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信群聊id',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群名称',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群头像',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '项目id',
  `ownerWechatId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '所有者微信ID',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群主（流量标识，可以是手机号、微信号）',
  `createTime` int(11) UNSIGNED NULL DEFAULT NULL,
  `updateTime` int(11) UNSIGNED NULL DEFAULT NULL,
  `deleteTime` int(11) UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_owner_chatroomId`(`chatroomId`, `ownerWechatId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信群' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_group_member
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_group_member`;
CREATE TABLE `ck_wechat_group_member`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `identifier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群成员（流量标识，可以是手机号、微信号）',
  `chatroomId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群真实id',
  `customerIs` tinyint(3) NULL DEFAULT 0 COMMENT '是否客服',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '项目id',
  `groupId` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '所属群ID',
  `createTime` int(11) UNSIGNED NULL DEFAULT 0,
  `deleteTime` int(11) UNSIGNED NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_identifier_chatroomId_groupId`(`identifier`, `chatroomId`, `groupId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 561848 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信群成员' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_restricts
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_restricts`;
CREATE TABLE `ck_wechat_restricts`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taskId` int(11) NULL DEFAULT NULL COMMENT '任务id',
  `level` tinyint(3) UNSIGNED NULL DEFAULT 1 COMMENT '风险类型 1 普通 2 警告 3 错误',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '风险原因',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '记录更详细的风险信息',
  `wechatId` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信id',
  `companyId` int(11) UNSIGNED NULL DEFAULT NULL COMMENT '项目id',
  `restrictTime` int(11) NULL DEFAULT NULL COMMENT '限制日期',
  `recoveryTime` int(11) NULL DEFAULT NULL COMMENT '恢复日期',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1416 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信风险受限记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_wechat_tag
-- ----------------------------
DROP TABLE IF EXISTS `ck_wechat_tag`;
CREATE TABLE `ck_wechat_tag`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tags` json NULL COMMENT '标签JSON',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `companyId` int(11) NULL DEFAULT NULL COMMENT '公司ID',
  `createTime` int(10) UNSIGNED NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_wechatId`(`wechatId`) USING BTREE,
  INDEX `idx_companyId`(`companyId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 123366 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信账号表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench`;
CREATE TABLE `ck_workbench`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `userId` int(11) NOT NULL COMMENT '创建用户ID',
  `companyId` int(11) NULL DEFAULT 0 COMMENT '公司id',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '工作台名称',
  `type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '工作台类型：1=自动点赞,2=朋友圈同步,3=群消息推送,4=自动建群,5=流量分发,6=通讯录导入',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：0=禁用,1=启用',
  `autoStart` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否自动启动：0=否,1=是',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `updateTime` int(11) NOT NULL COMMENT '更新时间',
  `isDel` tinyint(1) NULL DEFAULT 0,
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`userId`) USING BTREE,
  INDEX `idx_type`(`type`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 330 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '工作台主表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_auto_like
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_auto_like`;
CREATE TABLE `ck_workbench_auto_like`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `interval` int(11) NOT NULL DEFAULT 60 COMMENT '点赞间隔(秒)',
  `maxLikes` int(11) NOT NULL DEFAULT 100 COMMENT '最大点赞数',
  `startTime` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '00:00:00' COMMENT '开始时间',
  `endTime` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '23:59:59' COMMENT '结束时间',
  `contentTypes` json NULL COMMENT '内容类型',
  `devices` json NULL COMMENT '设备列表，JSON格式：[{\"id\":1,\"name\":\"设备1\"},{\"id\":2,\"name\":\"设备2\"}]',
  `friends` json NULL COMMENT '用户列表',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `updateTime` int(11) NOT NULL COMMENT '更新时间',
  `targetGroups` json NULL COMMENT '目标用户组列表，JSON格式：[{\"id\":1,\"name\":\"用户组1\"},{\"id\":2,\"name\":\"用户组2\"}]  废除',
  `tagOperator` tinyint(1) NULL DEFAULT 2 COMMENT '标签匹配规则  1:and 2:or  废除',
  `friendMaxLikes` int(10) NULL DEFAULT NULL COMMENT '好友最大点赞数',
  `friendTags` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '好友标签',
  `enableFriendTags` tinyint(1) NULL DEFAULT 0 COMMENT '启用好友标签',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_workbench_id`(`workbenchId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 54 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '自动点赞配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_auto_like_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_auto_like_item`;
CREATE TABLE `ck_workbench_auto_like_item`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `deviceId` int(11) NULL DEFAULT 0 COMMENT '设备id',
  `snsId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '自动点赞id',
  `wechatFriendId` int(11) NULL DEFAULT NULL COMMENT '好友id',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `momentsId` int(11) NULL DEFAULT NULL COMMENT '朋友圈id',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `workbenchId`(`workbenchId`) USING BTREE,
  INDEX `wechatFriendId`(`wechatFriendId`) USING BTREE,
  INDEX `wechatAccountId`(`wechatAccountId`) USING BTREE,
  INDEX `momentsId`(`momentsId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4653 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '工作台-自动点赞记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_group_create
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_group_create`;
CREATE TABLE `ck_workbench_group_create`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `workbenchId` int(11) NOT NULL COMMENT '计划ID',
  `devices` json NULL COMMENT '目标设备/客服(JSON数组)',
  `admins` json NULL COMMENT '管理员',
  `poolGroups` json NULL COMMENT '流量池JSON',
  `wechatGroups` json NULL COMMENT '微信客服JSON',
  `startTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '开始时间',
  `endTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '结束时间',
  `groupSizeMin` int(10) NULL DEFAULT NULL COMMENT '群好友最小人数',
  `groupSizeMax` int(10) NULL DEFAULT NULL COMMENT '群好友最大人数',
  `maxGroupsPerDay` int(10) NULL DEFAULT NULL COMMENT '每日建群最大数量',
  `groupNameTemplate` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群模板信息',
  `groupDescription` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群描述',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 27 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_group_create_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_group_create_item`;
CREATE TABLE `ck_workbench_group_create_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `friendId` int(11) NULL DEFAULT NULL,
  `wechatId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0' COMMENT '微信id',
  `groupId` int(10) NULL DEFAULT NULL COMMENT '群id',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `status` tinyint(2) NOT NULL DEFAULT 0 COMMENT '状态：0=待创建，1=创建中，2=创建成功，3=创建失败，4=管理员好友已拉入',
  `memberType` tinyint(2) NOT NULL DEFAULT 1 COMMENT '成员类型：1=群主成员，2=管理员，3=群主好友，4=管理员好友',
  `retryCount` int(11) NOT NULL DEFAULT 0 COMMENT '重试次数',
  `chatroomId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群聊ID（用于查询验证）',
  `verifyTime` int(11) NULL DEFAULT NULL COMMENT '验证时间',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status_workbench`(`status`, `workbenchId`) USING BTREE,
  INDEX `idx_chatroom_id`(`chatroomId`) USING BTREE,
  INDEX `idx_member_type`(`memberType`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 66 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_group_push
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_group_push`;
CREATE TABLE `ck_workbench_group_push`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `pushType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '推送方式 0定时 1立即',
  `targetType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '推送目标类型：1=群推送，2=好友推送',
  `startTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '推送开始时间',
  `endTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '推送结束时间',
  `maxPerDay` int(11) NULL DEFAULT 0 COMMENT '每日推送条数',
  `pushOrder` tinyint(1) NULL DEFAULT 1 COMMENT '推送顺序 1最早 2最新',
  `isLoop` tinyint(1) NULL DEFAULT 0 COMMENT '是否循环推送 0否 1是',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '是否启用 0否 1是',
  `groups` json NULL COMMENT '推送微信群组(JSON)',
  `friends` json NULL COMMENT '推送好友列表(JSON)',
  `ownerWechatIds` json NULL COMMENT '所属微信id',
  `contentLibraries` json NULL COMMENT '内容库(JSON)',
  `friendIntervalMin` int(11) NOT NULL DEFAULT 10 COMMENT '好友间最小间隔时间（秒）',
  `friendIntervalMax` int(11) NOT NULL DEFAULT 20 COMMENT '好友间最大间隔时间（秒）',
  `messageIntervalMin` int(11) NOT NULL DEFAULT 1 COMMENT '消息间最小间隔时间（秒）',
  `messageIntervalMax` int(11) NOT NULL DEFAULT 12 COMMENT '消息间最大间隔时间（秒）',
  `isRandomTemplate` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否随机选择话术组（0=否，1=是）',
  `postPushTags` json NOT NULL COMMENT '推送完成后打标签',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `socialMediaId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '京东导购媒体',
  `promotionSiteId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '京东广告位',
  `trafficPools` json NULL COMMENT '流量池',
  `devices` json NULL,
  `groupPushSubType` tinyint(2) NULL DEFAULT 1 COMMENT '群推送子类型 1=群群发，2=群公告',
  `announcementContent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `enableAiRewrite` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `aiRewritePrompt` tinyint(2) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_workbench_id`(`workbenchId`) USING BTREE,
  INDEX `idx_status_targetType`(`status`, `targetType`, `workbenchId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '群消息推送扩展表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_group_push_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_group_push_item`;
CREATE TABLE `ck_workbench_group_push_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `targetType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '推送目标类型：1=群，2=好友',
  `contentId` int(11) NULL DEFAULT 0 COMMENT '内容库is',
  `groupId` int(10) NULL DEFAULT NULL COMMENT '群id',
  `friendId` int(11) NULL DEFAULT NULL COMMENT '好友ID（当targetType=2时使用）',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `isLoop` tinyint(2) NULL DEFAULT 0 COMMENT '是否循环完成',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_workbench_target_time`(`workbenchId`, `targetType`, `createTime`) USING BTREE,
  INDEX `idx_workbench_target_friend`(`workbenchId`, `targetType`, `friendId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 302 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_import_contact
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_import_contact`;
CREATE TABLE `ck_workbench_import_contact`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `devices` json NULL COMMENT '设备id',
  `pools` json NULL COMMENT '流量池',
  `num` int(11) NULL DEFAULT NULL COMMENT '分配数量',
  `clearContact` tinyint(2) NULL DEFAULT 0 COMMENT '是否清除现有联系人',
  `remarkType` tinyint(2) NOT NULL DEFAULT 0 COMMENT '备注类型 0不备注 1年月日 2月日 3自定义',
  `remark` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `startTime` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '开始时间',
  `endTime` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '结束时间',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_import_contact_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_import_contact_item`;
CREATE TABLE `ck_workbench_import_contact_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `deviceId` int(11) NULL DEFAULT NULL COMMENT '设备id',
  `packageId` int(11) NULL DEFAULT 0 COMMENT '流量包id',
  `poolId` int(11) NULL DEFAULT NULL COMMENT '流量id',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 140 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_moments_sync
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_moments_sync`;
CREATE TABLE `ck_workbench_moments_sync`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `syncInterval` int(11) NOT NULL DEFAULT 1 COMMENT '同步间隔(小时)',
  `syncCount` int(11) NOT NULL DEFAULT 5 COMMENT '每日同步数量',
  `syncType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '同步类型：1=文本，2=图片，3=视频，4=链接',
  `startTime` time(0) NULL DEFAULT '06:00:00' COMMENT '发布开始时间',
  `endTime` time(0) NULL DEFAULT '23:59:00' COMMENT '发布结束时间',
  `accountType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '账号类型：1=业务号，2=个人号',
  `devices` json NOT NULL COMMENT '设备列表，JSON格式',
  `contentLibraries` json NULL COMMENT '内容库ID列表，JSON格式',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_workbench_id`(`workbenchId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 97 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '朋友圈同步配置' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_moments_sync_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_moments_sync_item`;
CREATE TABLE `ck_workbench_moments_sync_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '工作台ID',
  `deviceId` int(11) NULL DEFAULT 0 COMMENT '设备id',
  `contentId` int(10) NULL DEFAULT NULL COMMENT '内容库id',
  `wechatAccountId` int(11) NULL DEFAULT NULL COMMENT '客服id',
  `createTime` int(11) NOT NULL COMMENT '创建时间',
  `isLoop` tinyint(2) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_workbench_time`(`workbenchId`, `createTime`) USING BTREE,
  INDEX `idx_workbench_content`(`workbenchId`, `contentId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2308 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '朋友圈同步配置' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_traffic_config
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_traffic_config`;
CREATE TABLE `ck_workbench_traffic_config`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL COMMENT '流量分发计划ID',
  `distributeType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '分配方式 1均分 2优先级 3比例',
  `maxPerDay` int(11) NOT NULL DEFAULT 0 COMMENT '每日最大分配量',
  `timeType` tinyint(1) NOT NULL DEFAULT 1 COMMENT '时间限制 1全天 2自定义',
  `startTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '开始时间',
  `endTime` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '结束时间',
  `account` json NULL COMMENT '分发的账号',
  `devices` json NULL COMMENT '目标设备/客服(JSON数组)',
  `pools` json NULL COMMENT '流量池(JSON数组)',
  `exp` int(10) NULL DEFAULT 30 COMMENT '有效期 单位天',
  `createTime` int(11) NOT NULL,
  `updateTime` int(11) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uniq_workbench`(`workbenchId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 32 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量分发计划扩展表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ck_workbench_traffic_config_item
-- ----------------------------
DROP TABLE IF EXISTS `ck_workbench_traffic_config_item`;
CREATE TABLE `ck_workbench_traffic_config_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `workbenchId` int(11) NOT NULL DEFAULT 0 COMMENT '工作台ID',
  `deviceId` int(11) NULL DEFAULT 0 COMMENT '设备id',
  `wechatFriendId` int(10) NULL DEFAULT NULL COMMENT '好友id',
  `wechatAccountId` int(11) NULL DEFAULT 0 COMMENT '客服id',
  `expTime` int(11) NULL DEFAULT 0 COMMENT '有效时间',
  `exp` int(11) NULL DEFAULT 0 COMMENT '有效时间 天',
  `isRecycle` tinyint(2) NULL DEFAULT 0 COMMENT '是否回收',
  `recycleTime` int(11) NULL DEFAULT 0 COMMENT '回收时间',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `workbenchId`(`workbenchId`) USING BTREE,
  INDEX `deviceId`(`deviceId`) USING BTREE,
  INDEX `wechatFriendId`(`wechatFriendId`) USING BTREE,
  INDEX `wechatAccountId`(`wechatAccountId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 58212 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '流量分发计划扩展表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_allot_rule
-- ----------------------------
DROP TABLE IF EXISTS `s2_allot_rule`;
CREATE TABLE `s2_allot_rule`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '规则ID',
  `departmentId` int(11) NULL DEFAULT 0 COMMENT '部门id',
  `tenantId` int(11) NOT NULL DEFAULT 0 COMMENT '租户ID',
  `allotType` tinyint(4) NOT NULL DEFAULT 0 COMMENT '分配类型',
  `allotOnline` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否在线分配',
  `kefuRange` tinyint(4) NOT NULL DEFAULT 0 COMMENT '客服范围',
  `wechatRange` tinyint(4) NOT NULL DEFAULT 0 COMMENT '微信范围',
  `kefuData` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '客服数据JSON',
  `wechatData` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '微信ID列表JSON',
  `labels` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '标签JSON',
  `priorityStrategy` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '优先级策略JSON',
  `sortIndex` int(11) NOT NULL DEFAULT 0 COMMENT '排序索引',
  `creatorAccountId` int(11) NOT NULL DEFAULT 0 COMMENT '创建者账号ID',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `ruleName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '规则名称',
  `isDel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_tenant`(`tenantId`) USING BTREE,
  INDEX `idx_sort`(`sortIndex`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2176 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '分配规则表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_call_recording
-- ----------------------------
DROP TABLE IF EXISTS `s2_call_recording`;
CREATE TABLE `s2_call_recording`  (
  `id` bigint(20) NOT NULL COMMENT '主键ID',
  `tenantId` bigint(20) NOT NULL DEFAULT 0 COMMENT '租户ID',
  `deviceOwnerId` bigint(20) NOT NULL DEFAULT 0 COMMENT '设备所有者ID',
  `userName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '用户名',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '昵称',
  `realName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '真实姓名',
  `deviceMemo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '设备备注',
  `fileName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '文件名',
  `imei` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '设备IMEI',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '电话号码',
  `isCallOut` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为呼出电话(0:呼入,1:呼出)',
  `beginTime` int(11) NOT NULL DEFAULT 0 COMMENT '通话开始时间戳',
  `endTime` int(11) NOT NULL DEFAULT 0 COMMENT '通话结束时间戳',
  `audioUrl` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '录音文件URL',
  `mp3AudioUrl` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT 'MP3录音文件URL',
  `callBeginTime` int(11) NOT NULL DEFAULT 0 COMMENT '呼叫开始时间戳',
  `callLogId` bigint(20) NOT NULL DEFAULT 0 COMMENT '通话日志ID',
  `callType` int(11) NOT NULL DEFAULT 0 COMMENT '通话类型',
  `duration` int(11) NOT NULL DEFAULT 0 COMMENT '通话时长(秒)',
  `skipReason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '跳过原因',
  `skipUpload` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否跳过上传',
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间戳',
  `lastUpdateTime` int(11) NOT NULL DEFAULT 0 COMMENT '最后更新时间戳',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_tenant_id`(`tenantId`) USING BTREE,
  INDEX `idx_device_owner_id`(`deviceOwnerId`) USING BTREE,
  INDEX `idx_user_name`(`userName`) USING BTREE,
  INDEX `idx_phone`(`phone`) USING BTREE,
  INDEX `idx_begin_time`(`beginTime`) USING BTREE,
  INDEX `idx_end_time`(`endTime`) USING BTREE,
  INDEX `idx_call_begin_time`(`callBeginTime`) USING BTREE,
  INDEX `idx_imei`(`imei`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '通话记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_company_account
-- ----------------------------
DROP TABLE IF EXISTS `s2_company_account`;
CREATE TABLE `s2_company_account`  (
  `id` int(11) NULL DEFAULT NULL COMMENT 'id',
  `tenantId` int(11) NULL DEFAULT NULL,
  `userName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '用户名',
  `realName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '真实姓名',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '昵称',
  `memo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '备注',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '头像',
  `secret` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '密钥',
  `accountType` int(11) NULL DEFAULT 0 COMMENT '账户类型',
  `departmentId` int(11) NULL DEFAULT 0 COMMENT '部门ID',
  `departmentName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '部门名称',
  `useGoogleSecretKey` tinyint(1) NULL DEFAULT 0 COMMENT '是否使用谷歌密钥',
  `hasVerifyGoogleSecret` tinyint(1) NULL DEFAULT 0 COMMENT '是否验证谷歌密钥',
  `passwordMd5` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT 'MD5加密密码',
  `passwordLocal` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '本地加密密码',
  `lastLoginIp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '最后登录IP',
  `lastLoginTime` int(11) NULL DEFAULT 0 COMMENT '最后登录时间',
  `createTime` int(11) NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT 0 COMMENT '更新时间',
  `privilegeIds` json NULL COMMENT '权限',
  `alive` tinyint(1) NULL DEFAULT NULL,
  `creator` int(10) NULL DEFAULT NULL COMMENT '创建者',
  `creatorRealName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建者真实姓名',
  `creatorUserName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建者用户名',
  `status` tinyint(1) NULL DEFAULT 0 COMMENT '状态 0正常 1禁用',
  UNIQUE INDEX `idx_username`(`userName`) USING BTREE,
  INDEX `idx_create_time`(`createTime`) USING BTREE,
  INDEX `idx_update_time`(`updateTime`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '公司账户表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_department
-- ----------------------------
DROP TABLE IF EXISTS `s2_department`;
CREATE TABLE `s2_department`  (
  `id` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `tenantId` int(11) NULL DEFAULT NULL,
  `isTop` tinyint(1) NULL DEFAULT 0,
  `level` int(10) NULL DEFAULT 0,
  `parentId` int(10) NULL DEFAULT 0,
  `privileges` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  `lastUpdateTime` int(11) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '部门表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_device
-- ----------------------------
DROP TABLE IF EXISTS `s2_device`;
CREATE TABLE `s2_device`  (
  `id` int(11) NULL DEFAULT NULL COMMENT '设备真实ID',
  `userName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户名',
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `realName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '真实姓名',
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分组名称',
  `wechatAccounts` json NULL COMMENT '微信账号列表JSON',
  `alive` tinyint(1) NULL DEFAULT 0 COMMENT '是否在线',
  `aliveTime` int(11) NULL DEFAULT 0,
  `lastAliveTime` int(11) NULL DEFAULT NULL COMMENT '最后在线时间',
  `tenantId` int(11) NULL DEFAULT NULL COMMENT '租户ID',
  `groupId` int(11) NULL DEFAULT NULL COMMENT '分组ID',
  `currentAccountId` int(11) NULL DEFAULT NULL COMMENT '当前账号ID',
  `imei` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '设备IMEI',
  `deviceImei` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '设备本地IMEI',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `isDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `deletedAndStop` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除并停止',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  `rooted` tinyint(1) NULL DEFAULT 0 COMMENT '是否root',
  `xPosed` tinyint(1) NULL DEFAULT 0 COMMENT '是否安装xposed',
  `brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '品牌',
  `model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '型号',
  `operatingSystem` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作系统版本',
  `softwareVersion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '软件版本',
  `extra` json NULL COMMENT '额外信息JSON',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号',
  `lastUpdateTime` int(11) NULL DEFAULT NULL COMMENT '最后更新时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `taskConfig` json NULL COMMENT '自动化任务开关  \r\nautoLike：自动点赞\r\nmomentsSync：朋友圈同步\r\nautoCustomerDev：自动开发客户\r\ngroupMessageDeliver：群消息推送\r\nautoGroup：自动建群',
  UNIQUE INDEX `uk_imei`(`imei`) USING BTREE,
  INDEX `idx_tenant`(`tenantId`) USING BTREE,
  INDEX `idx_group`(`groupId`) USING BTREE,
  INDEX `idx_current_account`(`currentAccountId`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_device_group
-- ----------------------------
DROP TABLE IF EXISTS `s2_device_group`;
CREATE TABLE `s2_device_group`  (
  `id` int(11) NOT NULL,
  `tenantId` int(11) NOT NULL COMMENT '租户ID',
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '分组名称',
  `groupMemo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分组备注',
  `count` int(11) NULL DEFAULT 0 COMMENT '设备数量',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  INDEX `idx_tenant`(`tenantId`) USING BTREE,
  INDEX `idx_group_name`(`groupName`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '设备分组表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_friend_task
-- ----------------------------
DROP TABLE IF EXISTS `s2_friend_task`;
CREATE TABLE `s2_friend_task`  (
  `id` int(11) NOT NULL COMMENT '任务ID',
  `tenantId` int(11) NULL DEFAULT 0 COMMENT '租户ID',
  `operatorAccountId` int(11) NULL DEFAULT 0 COMMENT '操作账号ID',
  `status` int(11) NULL DEFAULT 1 COMMENT '状态：0执行中，1执行成功，2执行失败',
  `phone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机号/微信号',
  `msgContent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '验证消息',
  `wechatAccountId` int(11) NULL DEFAULT 0 COMMENT '微信账号ID',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间戳',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `extra` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '额外数据JSON',
  `labels` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签，逗号分隔',
  `from` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '来源',
  `alias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信账号别名',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信ID',
  `wechatAvatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信头像',
  `wechatNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信昵称',
  `accountNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号昵称',
  `accountRealName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号真实姓名',
  `accountUsername` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号用户名',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间戳',
  `is_counted` tinyint(1) NULL DEFAULT 0 COMMENT '是否已统计（0=未统计，1=已统计）',
  UNIQUE INDEX `uk_task_id`(`id`) USING BTREE,
  INDEX `idx_tenant_id`(`tenantId`) USING BTREE,
  INDEX `idx_operator_account_id`(`operatorAccountId`) USING BTREE,
  INDEX `idx_wechat_account_id`(`wechatAccountId`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE,
  INDEX `idx_phone`(`phone`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '添加好友任务记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_moments_item
-- ----------------------------
DROP TABLE IF EXISTS `s2_moments_item`;
CREATE TABLE `s2_moments_item`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_id` int(11) NOT NULL COMMENT '朋友圈任务ID',
  `temp_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '临时ID',
  `wechat_account_id` int(11) NULL DEFAULT NULL COMMENT '微信账号ID',
  `execute_count` int(11) NULL DEFAULT 0 COMMENT '执行次数',
  `executed` tinyint(1) NULL DEFAULT 0 COMMENT '是否已执行',
  `status` tinyint(1) NULL DEFAULT 0 COMMENT '状态',
  `extra` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '额外信息',
  `execute_time` int(11) NULL DEFAULT NULL COMMENT '执行时间',
  `finished_time` int(11) NULL DEFAULT NULL COMMENT '完成时间',
  `labels` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '标签',
  `alt_list` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '替代列表',
  `comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '评论',
  `moment_content_type` tinyint(1) NULL DEFAULT 0 COMMENT '朋友圈内容类型',
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文本内容',
  `pic_url_list` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '图片URL列表',
  `video_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '视频URL',
  `link` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '链接信息',
  `is_use_location` tinyint(1) NULL DEFAULT 0 COMMENT '是否使用位置',
  `lat` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '纬度',
  `lng` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '经度',
  `poi_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '位置名称',
  `poi_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '位置地址',
  `video_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '视频编号',
  `created_at` int(11) NULL DEFAULT NULL COMMENT '记录创建时间',
  `updated_at` int(11) NULL DEFAULT NULL COMMENT '记录更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_task_temp`(`task_id`, `temp_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 184 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '朋友圈任务项表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_moments_task
-- ----------------------------
DROP TABLE IF EXISTS `s2_moments_task`;
CREATE TABLE `s2_moments_task`  (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_id` int(11) NOT NULL COMMENT '朋友圈任务ID',
  `tenant_id` int(11) NULL DEFAULT NULL COMMENT '租户ID',
  `operator_account_id` int(11) NULL DEFAULT NULL COMMENT '操作人账号ID',
  `account_username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号用户名',
  `account_nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号昵称',
  `account_real_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号真实姓名',
  `public_mode` tinyint(1) NULL DEFAULT 0 COMMENT '发布模式',
  `moment_content_type` tinyint(1) NULL DEFAULT 1 COMMENT '朋友圈内容类型:1纯文本,2图片,3视频,4链接',
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文本内容',
  `pic_url_list` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '图片URL列表',
  `video_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '视频URL',
  `link` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '链接信息',
  `job_status` tinyint(1) NULL DEFAULT 0 COMMENT '任务状态',
  `job_origin_status` tinyint(1) NULL DEFAULT 0 COMMENT '任务原始状态',
  `job_group` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '任务组',
  `job_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '任务名称',
  `begin_time` int(11) NULL DEFAULT NULL COMMENT '开始时间',
  `end_time` int(11) NULL DEFAULT NULL COMMENT '结束时间',
  `timing_time` int(11) NULL DEFAULT NULL COMMENT '定时发布时间',
  `create_time` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `immediately` tinyint(1) NULL DEFAULT 1 COMMENT '是否立即发布',
  `created_at` int(11) NULL DEFAULT NULL COMMENT '记录创建时间',
  `updated_at` int(11) NULL DEFAULT NULL COMMENT '记录更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_task_id`(`task_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 88 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '朋友圈任务表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_reply
-- ----------------------------
DROP TABLE IF EXISTS `s2_reply`;
CREATE TABLE `s2_reply`  (
  `id` int(11) NOT NULL,
  `tenantId` int(255) NULL DEFAULT NULL,
  `groupId` int(11) NULL DEFAULT NULL,
  `accountId` int(11) NULL DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `msgType` tinyint(2) NULL DEFAULT NULL,
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  `lastUpdateTime` int(11) NULL DEFAULT NULL,
  `sortIndex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '快捷回复' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_reply_group
-- ----------------------------
DROP TABLE IF EXISTS `s2_reply_group`;
CREATE TABLE `s2_reply_group`  (
  `id` int(11) NOT NULL,
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `sortIndex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `parentId` int(11) NULL DEFAULT NULL,
  `replyType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `replys` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `departmentId` int(11) NULL DEFAULT 2130,
  `accountId` int(11) NULL DEFAULT 5150,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '快捷回复分组' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_account
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_account`;
CREATE TABLE `s2_wechat_account`  (
  `id` int(11) NOT NULL COMMENT '微信账号ID',
  `wechatId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `deviceAccountId` int(11) NULL DEFAULT 0 COMMENT '设备账号ID',
  `imei` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'IMEI',
  `deviceMemo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '设备备注',
  `accountUserName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号用户名',
  `accountRealName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号真实姓名',
  `accountNickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号昵称',
  `keFuAlive` tinyint(1) NULL DEFAULT 0 COMMENT '客服是否在线',
  `deviceAlive` tinyint(1) NULL DEFAULT 0 COMMENT '设备是否在线',
  `wechatAlive` tinyint(1) NULL DEFAULT 0 COMMENT '微信是否在线',
  `wechatAliveTime` int(11) NULL DEFAULT 0 COMMENT '在线时间',
  `yesterdayMsgCount` int(11) NULL DEFAULT 0 COMMENT '昨日消息数',
  `sevenDayMsgCount` int(11) NULL DEFAULT 0 COMMENT '7天消息数',
  `thirtyDayMsgCount` int(11) NULL DEFAULT 0 COMMENT '30天消息数',
  `totalFriend` int(11) NULL DEFAULT 0 COMMENT '总好友数',
  `maleFriend` int(11) NULL DEFAULT 0 COMMENT '男性好友数',
  `unknowFriend` int(11) NULL DEFAULT NULL COMMENT '未知好友数',
  `femaleFriend` int(11) NULL DEFAULT 0 COMMENT '女性好友数',
  `wechatGroupName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信群组名称',
  `tenantId` int(11) NULL DEFAULT NULL COMMENT '租户ID',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `alias` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头像',
  `gender` tinyint(1) NULL DEFAULT 0 COMMENT '性别',
  `region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '地区',
  `signature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '签名',
  `bindQQ` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '绑定QQ',
  `bindEmail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '绑定邮箱',
  `bindMobile` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '绑定手机',
  `currentDeviceId` int(11) NULL DEFAULT 0 COMMENT '当前设备ID',
  `isDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  `groupId` int(11) NULL DEFAULT 0 COMMENT '分组ID',
  `memo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `wechatVersion` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信版本',
  `labels` json NULL COMMENT '标签',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `status` tinyint(3) NULL DEFAULT 1 COMMENT '状态值',
  `healthScore` int(11) NULL DEFAULT 60 COMMENT '健康分总分（基础分+动态分）',
  `baseScore` int(11) NULL DEFAULT 60 COMMENT '基础分（60-100分）',
  `dynamicScore` int(11) NULL DEFAULT 0 COMMENT '动态分（扣分和加分）',
  `isModifiedAlias` tinyint(1) NULL DEFAULT 0 COMMENT '是否已修改微信号（0=未修改，1=已修改）',
  `lastFrequentTime` int(11) NULL DEFAULT NULL COMMENT '最后频繁时间（时间戳）',
  `frequentCount` int(11) NULL DEFAULT 0 COMMENT '频繁次数（用于判断首次/再次频繁）',
  `lastNoFrequentTime` int(11) NULL DEFAULT NULL COMMENT '最后不频繁时间（时间戳）',
  `consecutiveNoFrequentDays` int(11) NULL DEFAULT 0 COMMENT '连续不频繁天数（用于加分）',
  `scoreUpdateTime` int(11) NULL DEFAULT NULL COMMENT '评分更新时间',
  INDEX `idx_wechat_id`(`wechatId`) USING BTREE,
  INDEX `idx_health_score`(`healthScore`) USING BTREE,
  INDEX `idx_is_modified_alias`(`isModifiedAlias`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信账号表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_account_score
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_account_score`;
CREATE TABLE `s2_wechat_account_score`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `accountId` int(11) NOT NULL COMMENT '微信账号ID（s2_wechat_account.id）',
  `wechatId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `baseScore` int(11) NOT NULL DEFAULT 0 COMMENT '基础分（60-100分）',
  `baseScoreCalculated` tinyint(1) NOT NULL DEFAULT 0 COMMENT '基础分是否已计算（0=未计算，1=已计算）',
  `baseScoreCalcTime` int(11) NULL DEFAULT NULL COMMENT '基础分计算时间',
  `baseInfoScore` int(11) NOT NULL DEFAULT 0 COMMENT '基础信息分（0-10分）',
  `isModifiedAlias` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已修改微信号（0=未修改，1=已修改）',
  `friendCountScore` int(11) NOT NULL DEFAULT 0 COMMENT '好友数量分（0-30分）',
  `friendCount` int(11) NOT NULL DEFAULT 0 COMMENT '好友数量（评分时的快照）',
  `friendCountSource` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '好友数量来源（manual=手动，sync=同步）',
  `dynamicScore` int(11) NOT NULL DEFAULT 0 COMMENT '动态分（扣分和加分）',
  `lastFrequentTime` int(11) NULL DEFAULT NULL COMMENT '最后频繁时间（时间戳）',
  `frequentCount` int(11) NOT NULL DEFAULT 0 COMMENT '频繁次数（用于判断首次/再次频繁）',
  `frequentPenalty` int(11) NOT NULL DEFAULT 0 COMMENT '频繁扣分（累计）',
  `lastNoFrequentTime` int(11) NULL DEFAULT NULL COMMENT '最后不频繁时间（时间戳）',
  `consecutiveNoFrequentDays` int(11) NOT NULL DEFAULT 0 COMMENT '连续不频繁天数',
  `noFrequentBonus` int(11) NOT NULL DEFAULT 0 COMMENT '不频繁加分（累计）',
  `isBanned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否封号（0=否，1=是）',
  `banPenalty` int(11) NOT NULL DEFAULT 0 COMMENT '封号扣分',
  `healthScore` int(11) NOT NULL DEFAULT 0 COMMENT '健康分总分（基础分+动态分）',
  `maxAddFriendPerDay` int(11) NOT NULL DEFAULT 0 COMMENT '每日最大加人次数',
  `createTime` int(11) NOT NULL DEFAULT 0 COMMENT '创建时间',
  `updateTime` int(11) NOT NULL DEFAULT 0 COMMENT '更新时间',
  `lastBanTime` int(11) NULL DEFAULT NULL COMMENT '最后一次封号时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_account_id`(`accountId`) USING BTREE,
  INDEX `idx_wechat_id`(`wechatId`) USING BTREE,
  INDEX `idx_health_score`(`healthScore`) USING BTREE,
  INDEX `idx_base_score_calculated`(`baseScoreCalculated`) USING BTREE,
  INDEX `idx_update_time`(`updateTime`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 368 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信账号评分记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_account_score_log
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_account_score_log`;
CREATE TABLE `s2_wechat_account_score_log`  (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `accountId` int(11) NOT NULL COMMENT '微信账号ID',
  `wechatId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `field` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '变动字段（如frequentPenalty）',
  `changeValue` int(11) NOT NULL DEFAULT 0 COMMENT '变动值（正加负减）',
  `valueBefore` int(11) NULL DEFAULT NULL COMMENT '变更前的字段值',
  `valueAfter` int(11) NULL DEFAULT NULL COMMENT '变更后的字段值',
  `category` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类：penalty/bonus/dynamic_total/health_total等',
  `source` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '触发来源 friend_task/wechat_message/system',
  `sourceId` bigint(20) NULL DEFAULT NULL COMMENT '关联记录ID（如任务/消息ID）',
  `extra` json NULL COMMENT '附加信息（JSON）',
  `totalScoreBefore` int(11) NULL DEFAULT NULL COMMENT '变更前健康总分',
  `totalScoreAfter` int(11) NULL DEFAULT NULL COMMENT '变更后健康总分',
  `createTime` int(11) NOT NULL COMMENT '记录时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_account_field`(`accountId`, `field`) USING BTREE,
  INDEX `idx_wechat_id`(`wechatId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 39 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信账号健康分加减分日志' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_chatroom
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_chatroom`;
CREATE TABLE `s2_wechat_chatroom`  (
  `id` int(11) NOT NULL,
  `wechatAccountId` int(11) NOT NULL COMMENT '微信账号ID',
  `wechatAccountAlias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信账号别名',
  `wechatAccountWechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信账号微信ID',
  `wechatAccountAvatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信账号头像',
  `wechatAccountNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '微信账号昵称',
  `chatroomId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '群聊ID',
  `hasMe` tinyint(1) NULL DEFAULT 0 COMMENT '是否包含自己',
  `chatroomOwnerNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群主昵称',
  `chatroomOwnerAvatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群主头像',
  `conRemark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群聊名称',
  `pyInitial` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '拼音首字母',
  `quanPin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '全拼',
  `chatroomAvatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '群头像',
  `isDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `accountId` int(11) NULL DEFAULT 0 COMMENT '账号ID',
  `accountUserName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号用户名',
  `accountRealName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号真实姓名',
  `accountNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号昵称',
  `groupId` int(11) NULL DEFAULT 0 COMMENT '分组ID',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `isTop` tinyint(2) NULL DEFAULT 0 COMMENT '是否置顶',
  `groupIds` int(11) NULL DEFAULT 0 COMMENT '新分组ID',
  UNIQUE INDEX `uk_chatroom_account`(`chatroomId`, `wechatAccountId`) USING BTREE,
  INDEX `wechatAccountId`(`wechatAccountId`) USING BTREE,
  INDEX `chatroomId`(`chatroomId`) USING BTREE,
  INDEX `wechatAccountWechatId`(`wechatAccountWechatId`) USING BTREE,
  INDEX `idx_account_deleted`(`accountId`, `isDeleted`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信群表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_chatroom_member
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_chatroom_member`;
CREATE TABLE `s2_wechat_chatroom_member`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chatroomId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '群聊ID',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '微信ID',
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头像',
  `conRemark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `alias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `friendType` tinyint(11) NULL DEFAULT 0 COMMENT '好友类型',
  `createTime` int(10) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(10) NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_chatroom_wechat`(`chatroomId`, `wechatId`) USING BTREE,
  INDEX `chatroomId`(`chatroomId`) USING BTREE,
  INDEX `wechatId`(`wechatId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 496929 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信群成员表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_friend
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_friend`;
CREATE TABLE `s2_wechat_friend`  (
  `id` int(11) NULL DEFAULT NULL COMMENT '好友id',
  `wechatAccountId` int(11) NOT NULL COMMENT '所有者微信账号ID',
  `alias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '好友微信号',
  `wechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '好友微信ID',
  `conRemark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注名',
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `pyInitial` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '拼音首字母',
  `quanPin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '全拼',
  `avatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '头像URL',
  `gender` tinyint(1) NULL DEFAULT 0 COMMENT '性别',
  `region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '地区',
  `addFrom` int(11) NULL DEFAULT NULL COMMENT '添加来源',
  `labels` json NULL COMMENT '标签JSON',
  `siteLabels` json NULL COMMENT '站内标签JSON',
  `signature` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '个性签名',
  `isDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除',
  `isPassed` tinyint(1) NULL DEFAULT 1 COMMENT '是否通过',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  `accountId` int(11) NULL DEFAULT 0 COMMENT '账号ID',
  `extendFields` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展字段JSON',
  `accountUserName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号用户名',
  `accountRealName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号真实姓名',
  `accountNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号昵称',
  `ownerAlias` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '所有者别名',
  `ownerWechatId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '所有者微信ID',
  `ownerNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '所有者昵称',
  `ownerAvatar` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '所有者头像',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '电话',
  `thirdParty` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '第三方数据JSON',
  `groupId` int(11) NULL DEFAULT 0 COMMENT '分组ID',
  `passTime` int(11) NULL DEFAULT NULL COMMENT '通过时间',
  `additionalPicture` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '附加图片',
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '描述',
  `country` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '国家',
  `privince` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '省份',
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '城市',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `updateTime` int(11) NULL DEFAULT NULL COMMENT '更新时间',
  `R` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  `F` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  `M` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0',
  `realName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '姓名',
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '公司',
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '职位',
  `isTop` tinyint(2) NULL DEFAULT 0 COMMENT '是否置顶',
  `groupIds` int(11) NULL DEFAULT 0 COMMENT '新分组ID',
  UNIQUE INDEX `uk_owner_wechat_account`(`ownerWechatId`, `wechatId`, `wechatAccountId`) USING BTREE,
  INDEX `idx_wechat_account_id`(`wechatAccountId`) USING BTREE,
  INDEX `idx_wechat_id`(`wechatId`) USING BTREE,
  INDEX `idx_owner_wechat_id`(`ownerWechatId`) USING BTREE,
  INDEX `idx_id`(`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信好友表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_group
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_group`;
CREATE TABLE `s2_wechat_group`  (
  `id` int(11) NOT NULL,
  `tenantId` int(11) NULL DEFAULT NULL,
  `groupName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `groupMemo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `groupType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `sortIndex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `groupOwnerType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `departmentId` int(11) NULL DEFAULT NULL,
  `accountId` int(11) NULL DEFAULT NULL,
  `createTime` int(11) NULL DEFAULT NULL,
  `isDel` tinyint(1) NULL DEFAULT 0 COMMENT '是否删除 0未删除 1已删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_message
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_message`;
CREATE TABLE `s2_wechat_message`  (
  `id` bigint(20) NOT NULL COMMENT '消息ID',
  `type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '消息类型 1好友 2群',
  `wechatFriendId` bigint(20) NULL DEFAULT NULL COMMENT '微信好友ID',
  `wechatChatroomId` bigint(20) NOT NULL COMMENT '微信群聊ID',
  `senderNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发送者昵称',
  `senderWechatId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发送者微信ID',
  `senderIsAdmin` tinyint(1) NULL DEFAULT 0 COMMENT '发送者是否管理员',
  `senderIsDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '发送者是否已删除',
  `senderChatroomNickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发送者群昵称',
  `senderWechatAccountId` bigint(20) NULL DEFAULT NULL COMMENT '发送者微信账号ID',
  `wechatAccountId` bigint(20) NULL DEFAULT NULL COMMENT '微信账号ID',
  `tenantId` bigint(20) NULL DEFAULT NULL COMMENT '租户ID',
  `accountId` bigint(20) NULL DEFAULT NULL COMMENT '账号ID',
  `synergyAccountId` bigint(20) NULL DEFAULT 0 COMMENT '协同账号ID',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '消息内容',
  `originalContent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '消息内容(原版)',
  `msgType` int(11) NULL DEFAULT NULL COMMENT '消息类型 1 文字 3图片 47动态图片 34语言 43视频 42名片 40/20链接  49文件  419430449转账 436207665红包',
  `msgSubType` int(11) NULL DEFAULT 0 COMMENT '消息子类型',
  `msgSvrId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '消息服务器ID',
  `isSend` tinyint(1) NULL DEFAULT 1 COMMENT '是否发送',
  `createTime` int(11) NULL DEFAULT NULL COMMENT '创建时间',
  `isDeleted` tinyint(1) NULL DEFAULT 0 COMMENT '是否已删除',
  `deleteTime` int(11) NULL DEFAULT NULL COMMENT '删除时间',
  `sendStatus` int(11) NULL DEFAULT 0 COMMENT '发送状态',
  `wechatTime` int(11) NULL DEFAULT NULL COMMENT '微信时间',
  `origin` int(11) NULL DEFAULT 0 COMMENT '来源',
  `msgId` bigint(20) NULL DEFAULT NULL COMMENT '消息ID',
  `recallId` tinyint(1) NULL DEFAULT 0 COMMENT '撤回ID',
  `isRead` tinyint(1) NULL DEFAULT 0 COMMENT '是否读取',
  `is_counted` tinyint(1) NULL DEFAULT 0 COMMENT '是否已统计（0=未统计，1=已统计）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_wechatChatroomId`(`wechatChatroomId`) USING BTREE,
  INDEX `idx_wechatAccountId`(`wechatAccountId`) USING BTREE,
  INDEX `idx_msgSvrId`(`msgSvrId`) USING BTREE,
  INDEX `idx_type`(`type`) USING BTREE,
  INDEX `idx_type_wechatTime`(`type`, `wechatTime`, `id`) USING BTREE,
  INDEX `idx_friend_time`(`wechatFriendId`, `wechatTime`, `id`) USING BTREE,
  INDEX `idx_chatroom_time`(`wechatChatroomId`, `wechatTime`, `id`) USING BTREE,
  INDEX `idx_account_type`(`accountId`, `type`, `wechatTime`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信群聊消息记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for s2_wechat_moments
-- ----------------------------
DROP TABLE IF EXISTS `s2_wechat_moments`;
CREATE TABLE `s2_wechat_moments`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `wechatAccountId` int(11) NOT NULL COMMENT '微信账号ID',
  `wechatFriendId` int(11) NULL DEFAULT NULL COMMENT '微信好友ID',
  `snsId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '朋友圈消息ID',
  `commentList` json NULL COMMENT '评论列表JSON',
  `createTime` bigint(20) NULL DEFAULT 0 COMMENT '创建时间戳',
  `likeList` json NULL COMMENT '点赞列表JSON',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '朋友圈内容',
  `lat` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '纬度',
  `lng` decimal(10, 6) NULL DEFAULT 0.000000 COMMENT '经度',
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '位置信息',
  `picSize` int(11) NULL DEFAULT 0 COMMENT '图片大小',
  `resUrls` json NULL COMMENT '资源URL列表',
  `userName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '' COMMENT '用户名',
  `type` int(11) NULL DEFAULT 0 COMMENT '朋友圈类型',
  `create_time` int(11) NULL DEFAULT NULL COMMENT '数据创建时间',
  `update_time` int(11) NULL DEFAULT NULL COMMENT '数据更新时间',
  `coverImage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `urls` json NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_sns_account`(`snsId`, `wechatAccountId`) USING BTREE,
  INDEX `idx_account_friend`(`wechatAccountId`, `wechatFriendId`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 40159 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '微信朋友圈数据表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
