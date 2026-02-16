/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_顺丰

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:28
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
// Collection structure for 顺丰快递数据
// ----------------------------
db.getCollection("顺丰快递数据").drop();
db.createCollection("顺丰快递数据");
db.getCollection("顺丰快递数据").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("顺丰快递数据").createIndex({
    province: NumberInt("1")
}, {
    name: "province_1"
});
db.getCollection("顺丰快递数据").createIndex({
    city: NumberInt("1")
}, {
    name: "city_1"
});
db.getCollection("顺丰快递数据").createIndex({
    province: NumberInt("1"),
    city: NumberInt("1")
}, {
    name: "province_1_city_1"
});
db.getCollection("顺丰快递数据").createIndex({
    phone: NumberInt("1"),
    province: NumberInt("1")
}, {
    name: "phone_1_province_1"
});

// ----------------------------
// Collection structure for 顺丰快递数据_tmpForCopy1
// ----------------------------
db.getCollection("顺丰快递数据_tmpForCopy1").drop();
db.createCollection("顺丰快递数据_tmpForCopy1");
db.getCollection("顺丰快递数据_tmpForCopy1").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("顺丰快递数据_tmpForCopy1").createIndex({
    province: NumberInt("1")
}, {
    name: "province_1"
});
db.getCollection("顺丰快递数据_tmpForCopy1").createIndex({
    city: NumberInt("1")
}, {
    name: "city_1"
});
db.getCollection("顺丰快递数据_tmpForCopy1").createIndex({
    province: NumberInt("1"),
    city: NumberInt("1")
}, {
    name: "province_1_city_1"
});
db.getCollection("顺丰快递数据_tmpForCopy1").createIndex({
    phone: NumberInt("1"),
    province: NumberInt("1")
}, {
    name: "phone_1_province_1"
});
