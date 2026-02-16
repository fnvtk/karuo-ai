/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_商城

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:13
*/


// ----------------------------
// Collection structure for 21年贝蒂喜订单整合
// ----------------------------
db.getCollection("21年贝蒂喜订单整合").drop();
db.createCollection("21年贝蒂喜订单整合");
db.getCollection("21年贝蒂喜订单整合").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "特权订金订单id": NumberInt("1")
}, {
    name: "特权订金订单id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "新零售导购门店id": NumberInt("1")
}, {
    name: "新零售导购门店id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "新零售发货门店id": NumberInt("1")
}, {
    name: "新零售发货门店id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "新零售成交门店id": NumberInt("1")
}, {
    name: "新零售成交门店id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "新零售成交经销商id": NumberInt("1")
}, {
    name: "新零售成交经销商id_1"
});
db.getCollection("21年贝蒂喜订单整合").createIndex({
    "店铺Id": NumberInt("1")
}, {
    name: "店铺Id_1"
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
// Collection structure for 凡客诚品_vancl.com
// ----------------------------
db.getCollection("凡客诚品_vancl.com").drop();
db.createCollection("凡客诚品_vancl.com");
db.getCollection("凡客诚品_vancl.com").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("凡客诚品_vancl.com").createIndex({
    "数据来源": NumberInt("1"),
    "导入时间": NumberInt("-1")
}, {
    name: "数据来源_1_导入时间_-1"
});

// ----------------------------
// Collection structure for 嘟嘟牛
// ----------------------------
db.getCollection("嘟嘟牛").drop();
db.createCollection("嘟嘟牛");

// ----------------------------
// Collection structure for 嘟嘟牛 本地同城
// ----------------------------
db.getCollection("嘟嘟牛 本地同城").drop();
db.createCollection("嘟嘟牛 本地同城");
db.getCollection("嘟嘟牛 本地同城").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("嘟嘟牛 本地同城").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});

// ----------------------------
// Collection structure for 小米 xiaomi_com
// ----------------------------
db.getCollection("小米 xiaomi_com").drop();
db.createCollection("小米 xiaomi_com");

// ----------------------------
// Collection structure for 购物-北京一电购公司2月整理版30万
// ----------------------------
db.getCollection("购物-北京一电购公司2月整理版30万").drop();
db.createCollection("购物-北京一电购公司2月整理版30万");
db.getCollection("购物-北京一电购公司2月整理版30万").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
