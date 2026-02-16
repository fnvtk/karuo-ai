/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_人才库

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:59
*/


// ----------------------------
// Collection structure for 51JOB
// ----------------------------
db.getCollection("51JOB").drop();
db.createCollection("51JOB");

// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for 慈溪人才网
// ----------------------------
db.getCollection("慈溪人才网").drop();
db.createCollection("慈溪人才网");
