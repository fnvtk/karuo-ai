/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_销售额3000万元-5000万元企业名录

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:21:17
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
// Collection structure for 企业名录 的副本
// ----------------------------
db.getCollection("企业名录 的副本").drop();
db.createCollection("企业名录 的副本");

// ----------------------------
// Collection structure for 企业规模代码
// ----------------------------
db.getCollection("企业规模代码").drop();
db.createCollection("企业规模代码");

// ----------------------------
// Collection structure for 控股情况代码
// ----------------------------
db.getCollection("控股情况代码").drop();
db.createCollection("控股情况代码");

// ----------------------------
// Collection structure for 机构类型代码
// ----------------------------
db.getCollection("机构类型代码").drop();
db.createCollection("机构类型代码");

// ----------------------------
// Collection structure for 经济类型代码
// ----------------------------
db.getCollection("经济类型代码").drop();
db.createCollection("经济类型代码");

// ----------------------------
// Collection structure for 营业收入代码
// ----------------------------
db.getCollection("营业收入代码").drop();
db.createCollection("营业收入代码");

// ----------------------------
// Collection structure for 行业代码
// ----------------------------
db.getCollection("行业代码").drop();
db.createCollection("行业代码");

// ----------------------------
// Collection structure for 行政区划代码
// ----------------------------
db.getCollection("行政区划代码").drop();
db.createCollection("行政区划代码");

// ----------------------------
// Collection structure for 销售额3000万元-5000万元企业名录
// ----------------------------
db.getCollection("销售额3000万元-5000万元企业名录").drop();
db.createCollection("销售额3000万元-5000万元企业名录");

// ----------------------------
// Collection structure for 隶属关系代码
// ----------------------------
db.getCollection("隶属关系代码").drop();
db.createCollection("隶属关系代码");
