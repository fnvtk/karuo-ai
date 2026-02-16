/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:18:11
*/


// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for 厦门京东内
// ----------------------------
db.getCollection("厦门京东内").drop();
db.createCollection("厦门京东内");

// ----------------------------
// Collection structure for 厦门用户资产2025年9月
// ----------------------------
db.getCollection("厦门用户资产2025年9月").drop();
db.createCollection("厦门用户资产2025年9月");

// ----------------------------
// Collection structure for 厦门用户资产2025年9月_优化版
// ----------------------------
db.getCollection("厦门用户资产2025年9月_优化版").drop();
db.createCollection("厦门用户资产2025年9月_优化版");
db.getCollection("厦门用户资产2025年9月_优化版").createIndex({
    user_level: NumberInt("1")
}, {
    name: "user_level_1"
});
db.getCollection("厦门用户资产2025年9月_优化版").createIndex({
    total_score: NumberInt("-1")
}, {
    name: "total_score_-1"
});
db.getCollection("厦门用户资产2025年9月_优化版").createIndex({
    mobile: NumberInt("1")
}, {
    name: "mobile_1"
});
db.getCollection("厦门用户资产2025年9月_优化版").createIndex({
    city: NumberInt("1")
}, {
    name: "city_1"
});
db.getCollection("厦门用户资产2025年9月_优化版").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});

// ----------------------------
// Collection structure for 游戏_深度用户有过语音聊天、魔兽等
// ----------------------------
db.getCollection("游戏_深度用户有过语音聊天、魔兽等").drop();
db.createCollection("游戏_深度用户有过语音聊天、魔兽等");
db.getCollection("游戏_深度用户有过语音聊天、魔兽等").createIndex({
    user_id: NumberInt("1")
}, {
    name: "user_id_1"
});
db.getCollection("游戏_深度用户有过语音聊天、魔兽等").createIndex({
    user_value: NumberInt("1")
}, {
    name: "user_value_1"
});
db.getCollection("游戏_深度用户有过语音聊天、魔兽等").createIndex({
    overlap_count: NumberInt("1")
}, {
    name: "overlap_count_1"
});

// ----------------------------
// Collection structure for 用户估值
// ----------------------------
db.getCollection("用户估值").drop();
db.createCollection("用户估值");
db.getCollection("用户估值").createIndex({
    user_key: NumberInt("1")
}, {
    name: "user_key_1",
    unique: true
});
db.getCollection("用户估值").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("用户估值").createIndex({
    phone_masked: NumberInt("1")
}, {
    name: "phone_masked_1"
});
db.getCollection("用户估值").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("用户估值").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("用户估值").createIndex({
    province: NumberInt("1"),
    city: NumberInt("1")
}, {
    name: "province_1_city_1"
});
db.getCollection("用户估值").createIndex({
    computed_at: NumberInt("-1")
}, {
    name: "computed_at_-1"
});
db.getCollection("用户估值").createIndex({
    source_channels: NumberInt("1")
}, {
    name: "source_channels_1"
});
db.getCollection("用户估值").createIndex({
    "data_quality.completeness": NumberInt("-1")
}, {
    name: "data_quality.completeness_-1"
});
db.getCollection("用户估值").createIndex({
    user_evaluation_score: NumberInt("-1")
}, {
    name: "user_evaluation_score_-1"
});

// ----------------------------
// Collection structure for 用户资产整合
// ----------------------------
db.getCollection("用户资产整合").drop();
db.createCollection("用户资产整合");
db.getCollection("用户资产整合").createIndex({
    user_key: NumberInt("1")
}, {
    name: "idx_user_key"
});
db.getCollection("用户资产整合").createIndex({
    phone: NumberInt("1")
}, {
    name: "idx_phone"
});
db.getCollection("用户资产整合").createIndex({
    consumption_level: NumberInt("1")
}, {
    name: "idx_consumption_level"
});
db.getCollection("用户资产整合").createIndex({
    consumption_score: NumberInt("-1")
}, {
    name: "idx_consumption_score_desc"
});
db.getCollection("用户资产整合").createIndex({
    city: NumberInt("1")
}, {
    name: "idx_city"
});
db.getCollection("用户资产整合").createIndex({
    age_range: NumberInt("1")
}, {
    name: "idx_age_range"
});
db.getCollection("用户资产整合").createIndex({
    user_evaluation_score: NumberInt("-1")
}, {
    name: "idx_user_evaluation_score_desc"
});
db.getCollection("用户资产整合").createIndex({
    consumption_level: NumberInt("1"),
    consumption_score: NumberInt("-1")
}, {
    name: "idx_level_score"
});

// ----------------------------
// Collection structure for 金融客户_厦门_A级用户
// ----------------------------
db.getCollection("金融客户_厦门_A级用户").drop();
db.createCollection("金融客户_厦门_A级用户");
db.getCollection("金融客户_厦门_A级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_A级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_A级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融客户_厦门_B级用户
// ----------------------------
db.getCollection("金融客户_厦门_B级用户").drop();
db.createCollection("金融客户_厦门_B级用户");
db.getCollection("金融客户_厦门_B级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_B级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_B级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融客户_厦门_C级用户
// ----------------------------
db.getCollection("金融客户_厦门_C级用户").drop();
db.createCollection("金融客户_厦门_C级用户");
db.getCollection("金融客户_厦门_C级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_C级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_C级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融客户_厦门_D级用户
// ----------------------------
db.getCollection("金融客户_厦门_D级用户").drop();
db.createCollection("金融客户_厦门_D级用户");
db.getCollection("金融客户_厦门_D级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_D级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_D级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融客户_厦门_E级用户
// ----------------------------
db.getCollection("金融客户_厦门_E级用户").drop();
db.createCollection("金融客户_厦门_E级用户");
db.getCollection("金融客户_厦门_E级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_E级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_E级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融客户_厦门_S级用户
// ----------------------------
db.getCollection("金融客户_厦门_S级用户").drop();
db.createCollection("金融客户_厦门_S级用户");
db.getCollection("金融客户_厦门_S级用户").createIndex({
    total_score: NumberInt("1")
}, {
    name: "total_score_1",
    background: true
});
db.getCollection("金融客户_厦门_S级用户").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1",
    background: true
});
db.getCollection("金融客户_厦门_S级用户").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1",
    background: true
});

// ----------------------------
// Collection structure for 金融组02250905
// ----------------------------
db.getCollection("金融组02250905").drop();
db.createCollection("金融组02250905");
db.getCollection("金融组02250905").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1"
});
db.getCollection("金融组02250905").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1"
});
db.getCollection("金融组02250905").createIndex({
    "身份证": NumberInt("1")
}, {
    name: "身份证_1"
});
db.getCollection("金融组02250905").createIndex({
    "综合评分": NumberInt("-1")
}, {
    name: "综合评分_-1"
});
db.getCollection("金融组02250905").createIndex({
    "用户等级": NumberInt("1")
}, {
    name: "用户等级_1"
});
db.getCollection("金融组02250905").createIndex({
    "城市": NumberInt("1")
}, {
    name: "城市_1"
});
