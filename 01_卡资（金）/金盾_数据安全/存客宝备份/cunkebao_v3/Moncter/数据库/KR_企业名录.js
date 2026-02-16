/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_企业名录

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:51
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
// Collection structure for 中国医院名录_copy1
// ----------------------------
db.getCollection("中国医院名录_copy1").drop();
db.createCollection("中国医院名录_copy1");

// ----------------------------
// Collection structure for 企业及个体工商目录
// ----------------------------
db.getCollection("企业及个体工商目录").drop();
db.createCollection("企业及个体工商目录");

// ----------------------------
// Collection structure for 企业名录
// ----------------------------
db.getCollection("企业名录").drop();
db.createCollection("企业名录");

// ----------------------------
// Collection structure for 四川企业老板
// ----------------------------
db.getCollection("四川企业老板").drop();
db.createCollection("四川企业老板");

// ----------------------------
// Collection structure for 广东工商企业库1
// ----------------------------
db.getCollection("广东工商企业库1").drop();
db.createCollection("广东工商企业库1");

// ----------------------------
// Collection structure for 广东工商企业库2
// ----------------------------
db.getCollection("广东工商企业库2").drop();
db.createCollection("广东工商企业库2");

// ----------------------------
// Collection structure for 广东工商企业库3
// ----------------------------
db.getCollection("广东工商企业库3").drop();
db.createCollection("广东工商企业库3");

// ----------------------------
// Collection structure for 广东工商企业库4
// ----------------------------
db.getCollection("广东工商企业库4").drop();
db.createCollection("广东工商企业库4");

// ----------------------------
// Collection structure for 广东工商企业库5
// ----------------------------
db.getCollection("广东工商企业库5").drop();
db.createCollection("广东工商企业库5");

// ----------------------------
// Collection structure for 广东工商企业库6
// ----------------------------
db.getCollection("广东工商企业库6").drop();
db.createCollection("广东工商企业库6");

// ----------------------------
// Collection structure for 广东工商企业库7
// ----------------------------
db.getCollection("广东工商企业库7").drop();
db.createCollection("广东工商企业库7");

// ----------------------------
// Collection structure for 行政区划代码
// ----------------------------
db.getCollection("行政区划代码").drop();
db.createCollection("行政区划代码");

// ----------------------------
// Collection structure for 表1
// ----------------------------
db.getCollection("表1").drop();
db.createCollection("表1");

// ----------------------------
// Collection structure for 表2
// ----------------------------
db.getCollection("表2").drop();
db.createCollection("表2");

// ----------------------------
// Collection structure for 销售额3000万元-5000万元企业名录
// ----------------------------
db.getCollection("销售额3000万元-5000万元企业名录").drop();
db.createCollection("销售额3000万元-5000万元企业名录");
