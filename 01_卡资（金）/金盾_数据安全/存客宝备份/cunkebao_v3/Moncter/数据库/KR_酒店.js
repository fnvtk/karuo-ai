/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_酒店

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:17
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
// Collection structure for 如家汉庭
// ----------------------------
db.getCollection("如家汉庭").drop();
db.createCollection("如家汉庭");
db.getCollection("如家汉庭").createIndex({
    Mobile: NumberInt("1")
}, {
    name: "Mobile_1"
});

// ----------------------------
// Collection structure for 酒店开房记录_2013年8月_2000万
// ----------------------------
db.getCollection("酒店开房记录_2013年8月_2000万").drop();
db.createCollection("酒店开房记录_2013年8月_2000万");
db.getCollection("酒店开房记录_2013年8月_2000万").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("酒店开房记录_2013年8月_2000万").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("酒店开房记录_2013年8月_2000万").createIndex({
    id_card: NumberInt("1")
}, {
    name: "id_card_1"
});
db.getCollection("酒店开房记录_2013年8月_2000万").createIndex({
    mobile: NumberInt("1")
}, {
    name: "mobile_1"
});

// ----------------------------
// Collection structure for 酒店开房记录_2013年8月_2000万内
// ----------------------------
db.getCollection("酒店开房记录_2013年8月_2000万内").drop();
db.createCollection("酒店开房记录_2013年8月_2000万内");
db.getCollection("酒店开房记录_2013年8月_2000万内").createIndex({
    mobile: NumberInt("1")
}, {
    name: "mobile_1"
});

// ----------------------------
// Collection structure for 酒店开房记录_2013年8月_2000万内_备份
// ----------------------------
db.getCollection("酒店开房记录_2013年8月_2000万内_备份").drop();
db.createCollection("酒店开房记录_2013年8月_2000万内_备份");
