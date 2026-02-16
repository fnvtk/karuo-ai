/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_微博

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:57
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
// Collection structure for 微博uid+手机
// ----------------------------
db.getCollection("微博uid+手机").drop();
db.createCollection("微博uid+手机");
db.getCollection("微博uid+手机").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
