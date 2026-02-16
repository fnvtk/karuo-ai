/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_企业

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:44
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
// Collection structure for 企业400号段数据
// ----------------------------
db.getCollection("企业400号段数据").drop();
db.createCollection("企业400号段数据");
db.getCollection("企业400号段数据").createIndex({
    ID: NumberInt("1")
}, {
    name: "ID_1"
});
db.getCollection("企业400号段数据").createIndex({
    "企业名称": NumberInt("1")
}, {
    name: "企业名称_1"
});
db.getCollection("企业400号段数据").createIndex({
    "400号码": NumberInt("1")
}, {
    name: "400号码_1"
});
db.getCollection("企业400号段数据").createIndex({
    "联系人": NumberInt("1")
}, {
    name: "联系人_1"
});
db.getCollection("企业400号段数据").createIndex({
    "手机号码": NumberInt("1")
}, {
    name: "手机号码_1"
});
db.getCollection("企业400号段数据").createIndex({
    "表名": NumberInt("1")
}, {
    name: "表名_1"
});
db.getCollection("企业400号段数据").createIndex({
    "导入时间": NumberInt("-1")
}, {
    name: "导入时间_-1"
});
db.getCollection("企业400号段数据").createIndex({
    nid: NumberInt("1")
}, {
    name: "nid_1"
});
db.getCollection("企业400号段数据").createIndex({
    EnterpriseName: NumberInt("1")
}, {
    name: "EnterpriseName_1"
});
db.getCollection("企业400号段数据").createIndex({
    Number400: NumberInt("1")
}, {
    name: "Number400_1"
});
db.getCollection("企业400号段数据").createIndex({
    LinkMan: NumberInt("1")
}, {
    name: "LinkMan_1"
});
db.getCollection("企业400号段数据").createIndex({
    Mobile: NumberInt("1")
}, {
    name: "Mobile_1"
});

// ----------------------------
// Collection structure for 统一用户资产表
// ----------------------------
db.getCollection("统一用户资产表").drop();
db.createCollection("统一用户资产表");
db.getCollection("统一用户资产表").createIndex({
    "用户唯一ID": NumberInt("1")
}, {
    name: "用户唯一ID_1"
});
db.getCollection("统一用户资产表").createIndex({
    "基础信息.手机号": NumberInt("1")
}, {
    name: "基础信息.手机号_1"
});
db.getCollection("统一用户资产表").createIndex({
    "基础信息.邮箱": NumberInt("1")
}, {
    name: "基础信息.邮箱_1"
});
db.getCollection("统一用户资产表").createIndex({
    "企业信息.企业ID": NumberInt("1")
}, {
    name: "企业信息.企业ID_1"
});
db.getCollection("统一用户资产表").createIndex({
    "企业信息.400号码": NumberInt("1")
}, {
    name: "企业信息.400号码_1"
});
db.getCollection("统一用户资产表").createIndex({
    "资产概览.总资产价值": NumberInt("-1")
}, {
    name: "资产概览.总资产价值_-1"
});
db.getCollection("统一用户资产表").createIndex({
    "资产概览.资产等级": NumberInt("1")
}, {
    name: "资产概览.资产等级_1"
});
db.getCollection("统一用户资产表").createIndex({
    "用户类型": NumberInt("1")
}, {
    name: "用户类型_1"
});
db.getCollection("统一用户资产表").createIndex({
    "创建时间": NumberInt("-1")
}, {
    name: "创建时间_-1"
});
