/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_魔兽世界

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:37
*/


// ----------------------------
// Collection structure for elysn欧美_魔兽世界主题库
// ----------------------------
db.getCollection("elysn欧美_魔兽世界主题库").drop();
db.createCollection("elysn欧美_魔兽世界主题库");
db.getCollection("elysn欧美_魔兽世界主题库").createIndex({
    "账号": NumberInt("1")
}, {
    name: "账号_1"
});
db.getCollection("elysn欧美_魔兽世界主题库").createIndex({
    "密码": NumberInt("1")
}, {
    name: "密码_1"
});

// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for 网易2500W密正数据
// ----------------------------
db.getCollection("网易2500W密正数据").drop();
db.createCollection("网易2500W密正数据");
db.getCollection("网易2500W密正数据").createIndex({
    "账号": NumberInt("1")
}, {
    name: "账号_1",
    unique: true
});

// ----------------------------
// Collection structure for 网易IS_game.sohu.com邮箱占90%
// ----------------------------
db.getCollection("网易IS_game.sohu.com邮箱占90%").drop();
db.createCollection("网易IS_game.sohu.com邮箱占90%");

// ----------------------------
// Collection structure for 网易正确数据_已确认
// ----------------------------
db.getCollection("网易正确数据_已确认").drop();
db.createCollection("网易正确数据_已确认");
db.getCollection("网易正确数据_已确认").createIndex({
    "账号": NumberInt("1")
}, {
    name: "账号_1",
    background: true,
    unique: true
});

// ----------------------------
// Collection structure for 网易正确数据_空白数据
// ----------------------------
db.getCollection("网易正确数据_空白数据").drop();
db.createCollection("网易正确数据_空白数据");
db.getCollection("网易正确数据_空白数据").createIndex({
    "账号": NumberInt("1")
}, {
    name: "idx_account",
    background: true
});
db.getCollection("网易正确数据_空白数据").createIndex({
    "密码": NumberInt("1")
}, {
    name: "idx_password",
    background: true
});
db.getCollection("网易正确数据_空白数据").createIndex({
    "账号": NumberInt("1"),
    "密码": NumberInt("1")
}, {
    name: "idx_account_password",
    background: true
});

// ----------------------------
// Collection structure for 魔兽世界_3月库
// ----------------------------
db.getCollection("魔兽世界_3月库").drop();
db.createCollection("魔兽世界_3月库");
