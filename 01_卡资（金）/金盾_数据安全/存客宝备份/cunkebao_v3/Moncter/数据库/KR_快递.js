/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_快递

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:31
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
// Collection structure for wlzhwu_jiezhang
// ----------------------------
db.getCollection("wlzhwu_jiezhang").drop();
db.createCollection("wlzhwu_jiezhang");

// ----------------------------
// Collection structure for wlzhwu_wlzhangwu
// ----------------------------
db.getCollection("wlzhwu_wlzhangwu").drop();
db.createCollection("wlzhwu_wlzhangwu");

// ----------------------------
// Collection structure for 可行路由
// ----------------------------
db.getCollection("可行路由").drop();
db.createCollection("可行路由");
db.getCollection("可行路由").createIndex({
    _import_time: NumberInt("1")
}, {
    name: "_import_time_1"
});

// ----------------------------
// Collection structure for 圆通_普通客户
// ----------------------------
db.getCollection("圆通_普通客户").drop();
db.createCollection("圆通_普通客户");
db.getCollection("圆通_普通客户").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("圆通_普通客户").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("圆通_普通客户").createIndex({
    user_score: NumberInt("-1")
}, {
    name: "user_score_-1"
});

// ----------------------------
// Collection structure for 圆通_潜在客户
// ----------------------------
db.getCollection("圆通_潜在客户").drop();
db.createCollection("圆通_潜在客户");
db.getCollection("圆通_潜在客户").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("圆通_潜在客户").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("圆通_潜在客户").createIndex({
    user_score: NumberInt("-1")
}, {
    name: "user_score_-1"
});
