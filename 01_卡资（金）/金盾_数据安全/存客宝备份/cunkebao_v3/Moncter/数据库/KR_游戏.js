/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_游戏

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:21:24
*/


// ----------------------------
// Collection structure for 178游戏网
// ----------------------------
db.getCollection("178游戏网").drop();
db.createCollection("178游戏网");
db.getCollection("178游戏网").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});

// ----------------------------
// Collection structure for 766游戏网
// ----------------------------
db.getCollection("766游戏网").drop();
db.createCollection("766游戏网");
db.getCollection("766游戏网").createIndex({
    "data.0": NumberInt("1")
}, {
    name: "data.0_1"
});

// ----------------------------
// Collection structure for 7k7k小游戏
// ----------------------------
db.getCollection("7k7k小游戏").drop();
db.createCollection("7k7k小游戏");
db.getCollection("7k7k小游戏").createIndex({
    account: NumberInt("1")
}, {
    name: "account_1"
});
db.getCollection("7k7k小游戏").createIndex({
    domain: NumberInt("1")
}, {
    name: "domain_1"
});
db.getCollection("7k7k小游戏").createIndex({
    account_type: NumberInt("1")
}, {
    name: "account_type_1"
});
db.getCollection("7k7k小游戏").createIndex({
    is_email: NumberInt("1")
}, {
    name: "is_email_1"
});

// ----------------------------
// Collection structure for DNF
// ----------------------------
db.getCollection("DNF").drop();
db.createCollection("DNF");
db.getCollection("DNF").createIndex({
    "data.0": NumberInt("1")
}, {
    name: "data.0_1"
});
db.getCollection("DNF").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("DNF").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("DNF").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("DNF").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("DNF").createIndex({
    character_name: NumberInt("1")
}, {
    name: "character_name_1"
});
db.getCollection("DNF").createIndex({
    server_name: NumberInt("1")
}, {
    name: "server_name_1"
});
db.getCollection("DNF").createIndex({
    level: NumberInt("-1")
}, {
    name: "level_-1"
});

// ----------------------------
// Collection structure for KR_游戏_重叠用户
// ----------------------------
db.getCollection("KR_游戏_重叠用户").drop();
db.createCollection("KR_游戏_重叠用户");
db.getCollection("KR_游戏_重叠用户").createIndex({
    user_id: NumberInt("1")
}, {
    name: "user_id_1"
});
db.getCollection("KR_游戏_重叠用户").createIndex({
    user_value: NumberInt("1")
}, {
    name: "user_value_1"
});
db.getCollection("KR_游戏_重叠用户").createIndex({
    overlap_count: NumberInt("1")
}, {
    name: "overlap_count_1"
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
// Collection structure for 游戏语音ispeak_cn
// ----------------------------
db.getCollection("游戏语音ispeak_cn").drop();
db.createCollection("游戏语音ispeak_cn");
db.getCollection("游戏语音ispeak_cn").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("游戏语音ispeak_cn").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
