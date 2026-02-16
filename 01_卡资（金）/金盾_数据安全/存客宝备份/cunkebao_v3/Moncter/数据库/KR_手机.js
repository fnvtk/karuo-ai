/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_手机

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:20
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
// Collection structure for tmpgSyh4.renameCollection
// ----------------------------
db.getCollection("tmpgSyh4.renameCollection").drop();
db.createCollection("tmpgSyh4.renameCollection");

// ----------------------------
// Collection structure for 广东gd5800万神州行动感地带=广州GZBran2_copy2
// ----------------------------
db.getCollection("广东gd5800万神州行动感地带=广州GZBran2_copy2").drop();
db.createCollection("广东gd5800万神州行动感地带=广州GZBran2_copy2");

// ----------------------------
// Collection structure for 广东广州航空数据1
// ----------------------------
db.getCollection("广东广州航空数据1").drop();
db.createCollection("广东广州航空数据1");

// ----------------------------
// Collection structure for 广东广州航空数据2
// ----------------------------
db.getCollection("广东广州航空数据2").drop();
db.createCollection("广东广州航空数据2");

// ----------------------------
// Collection structure for 广东广州航空数据3
// ----------------------------
db.getCollection("广东广州航空数据3").drop();
db.createCollection("广东广州航空数据3");

// ----------------------------
// Collection structure for 广东广州航空数据4
// ----------------------------
db.getCollection("广东广州航空数据4").drop();
db.createCollection("广东广州航空数据4");
db.getCollection("广东广州航空数据4").createIndex({
    "电话号码": NumberInt("1")
}, {
    name: "电话号码_1"
});

// ----------------------------
// Collection structure for 广东深圳全球通女
// ----------------------------
db.getCollection("广东深圳全球通女").drop();
db.createCollection("广东深圳全球通女");

// ----------------------------
// Collection structure for 江西移动_701鹰潭
// ----------------------------
db.getCollection("江西移动_701鹰潭").drop();
db.createCollection("江西移动_701鹰潭");

// ----------------------------
// Collection structure for 江西移动_792九江
// ----------------------------
db.getCollection("江西移动_792九江").drop();
db.createCollection("江西移动_792九江");

// ----------------------------
// Collection structure for 江西移动_793上饶
// ----------------------------
db.getCollection("江西移动_793上饶").drop();
db.createCollection("江西移动_793上饶");

// ----------------------------
// Collection structure for 江西移动_798景德镇
// ----------------------------
db.getCollection("江西移动_798景德镇").drop();
db.createCollection("江西移动_798景德镇");

// ----------------------------
// Collection structure for 江西移动_799萍乡
// ----------------------------
db.getCollection("江西移动_799萍乡").drop();
db.createCollection("江西移动_799萍乡");

// ----------------------------
// Collection structure for 江西移动_上绕262万
// ----------------------------
db.getCollection("江西移动_上绕262万").drop();
db.createCollection("江西移动_上绕262万");

// ----------------------------
// Collection structure for 江西移动_九江222万
// ----------------------------
db.getCollection("江西移动_九江222万").drop();
db.createCollection("江西移动_九江222万");

// ----------------------------
// Collection structure for 江西移动_南昌368万
// ----------------------------
db.getCollection("江西移动_南昌368万").drop();
db.createCollection("江西移动_南昌368万");

// ----------------------------
// Collection structure for 江西移动_吉安206万
// ----------------------------
db.getCollection("江西移动_吉安206万").drop();
db.createCollection("江西移动_吉安206万");

// ----------------------------
// Collection structure for 江西移动_宜春230万
// ----------------------------
db.getCollection("江西移动_宜春230万").drop();
db.createCollection("江西移动_宜春230万");

// ----------------------------
// Collection structure for 江西移动_抚州143万
// ----------------------------
db.getCollection("江西移动_抚州143万").drop();
db.createCollection("江西移动_抚州143万");

// ----------------------------
// Collection structure for 江西移动_新余67万
// ----------------------------
db.getCollection("江西移动_新余67万").drop();
db.createCollection("江西移动_新余67万");

// ----------------------------
// Collection structure for 江西移动_景德镇76万
// ----------------------------
db.getCollection("江西移动_景德镇76万").drop();
db.createCollection("江西移动_景德镇76万");

// ----------------------------
// Collection structure for 江西移动_江西全球通带身份证
// ----------------------------
db.getCollection("江西移动_江西全球通带身份证").drop();
db.createCollection("江西移动_江西全球通带身份证");

// ----------------------------
// Collection structure for 江西移动_江西全球通身份证
// ----------------------------
db.getCollection("江西移动_江西全球通身份证").drop();
db.createCollection("江西移动_江西全球通身份证");

// ----------------------------
// Collection structure for 江西移动_江西全球通身份证姓名1226056
// ----------------------------
db.getCollection("江西移动_江西全球通身份证姓名1226056").drop();
db.createCollection("江西移动_江西全球通身份证姓名1226056");

// ----------------------------
// Collection structure for 江西移动_萍乡86万
// ----------------------------
db.getCollection("江西移动_萍乡86万").drop();
db.createCollection("江西移动_萍乡86万");

// ----------------------------
// Collection structure for 江西移动_赣州352万
// ----------------------------
db.getCollection("江西移动_赣州352万").drop();
db.createCollection("江西移动_赣州352万");

// ----------------------------
// Collection structure for 江西移动_鹰潭53万
// ----------------------------
db.getCollection("江西移动_鹰潭53万").drop();
db.createCollection("江西移动_鹰潭53万");
