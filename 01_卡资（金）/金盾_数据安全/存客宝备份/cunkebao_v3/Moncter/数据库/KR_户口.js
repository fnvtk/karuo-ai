/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_户口

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:03
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
// Collection structure for 户籍数据
// ----------------------------
db.getCollection("户籍数据").drop();
db.createCollection("户籍数据");
db.getCollection("户籍数据").createIndex({
    "姓名": NumberInt("1")
}, {
    name: "姓名_1"
});
db.getCollection("户籍数据").createIndex({
    "身份证号": NumberInt("1")
}, {
    name: "身份证号_1"
});
db.getCollection("户籍数据").createIndex({
    "户籍地址": NumberInt("1")
}, {
    name: "户籍地址_1"
});
