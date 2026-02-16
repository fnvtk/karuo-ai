/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_存客宝_四表重构KR_KR版

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:18:48
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
// Collection structure for 估值模式表
// ----------------------------
db.getCollection("估值模式表").drop();
db.createCollection("估值模式表");

// ----------------------------
// Collection structure for 微信号管理表
// ----------------------------
db.getCollection("微信号管理表").drop();
db.createCollection("微信号管理表");

// ----------------------------
// Collection structure for 微信好友表
// ----------------------------
db.getCollection("微信好友表").drop();
db.createCollection("微信好友表");

// ----------------------------
// Collection structure for 设备管理表
// ----------------------------
db.getCollection("设备管理表").drop();
db.createCollection("设备管理表");
db.getCollection("设备管理表").createIndex({
    "设备ID": NumberInt("1")
}, {
    name: "设备ID_1",
    unique: true
});
db.getCollection("设备管理表").createIndex({
    "用户ID": NumberInt("1")
}, {
    name: "用户ID_1"
});
db.getCollection("设备管理表").createIndex({
    "设备类型": NumberInt("1")
}, {
    name: "设备类型_1"
});
