/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_国外

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:18:56
*/


// ----------------------------
// Collection structure for Yandex俄罗斯百度用户数据
// ----------------------------
db.getCollection("Yandex俄罗斯百度用户数据").drop();
db.createCollection("Yandex俄罗斯百度用户数据");
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    domain: NumberInt("1")
}, {
    name: "domain_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    password_strength: NumberInt("1")
}, {
    name: "password_strength_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    country: NumberInt("1")
}, {
    name: "country_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    service_provider: NumberInt("1")
}, {
    name: "service_provider_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    created_at: NumberInt("-1")
}, {
    name: "created_at_-1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    data_source: NumberInt("1")
}, {
    name: "data_source_1"
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    email: NumberInt("1"),
    password: NumberInt("1")
}, {
    name: "email_password_unique",
    unique: true
});
db.getCollection("Yandex俄罗斯百度用户数据").createIndex({
    "$**": "text"
}, {
    name: "text_search",
    weights: {
        email: NumberInt("1"),
        username: NumberInt("1")
    },
    default_language: "english",
    language_override: "language",
    textIndexVersion: NumberInt("3")
});

// ----------------------------
// Collection structure for Yandex俄罗斯谷歌用户数据
// ----------------------------
db.getCollection("Yandex俄罗斯谷歌用户数据").drop();
db.createCollection("Yandex俄罗斯谷歌用户数据");
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    domain: NumberInt("1")
}, {
    name: "domain_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    password_strength: NumberInt("1")
}, {
    name: "password_strength_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    country: NumberInt("1")
}, {
    name: "country_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    service_provider: NumberInt("1")
}, {
    name: "service_provider_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    created_at: NumberInt("-1")
}, {
    name: "created_at_-1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    data_source: NumberInt("1")
}, {
    name: "data_source_1"
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    email: NumberInt("1"),
    password: NumberInt("1")
}, {
    name: "email_password_unique",
    unique: true
});
db.getCollection("Yandex俄罗斯谷歌用户数据").createIndex({
    "$**": "text"
}, {
    name: "text_search",
    weights: {
        email: NumberInt("1"),
        username: NumberInt("1")
    },
    default_language: "english",
    language_override: "language",
    textIndexVersion: NumberInt("3")
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
// Collection structure for www.angeldiet.co.kr 1
// ----------------------------
db.getCollection("www.angeldiet.co.kr 1").drop();
db.createCollection("www.angeldiet.co.kr 1");
db.getCollection("www.angeldiet.co.kr 1").createIndex({
    ID: NumberInt("1")
}, {
    name: "ID_1"
});

// ----------------------------
// Collection structure for www.angeldiet.co.kr 2
// ----------------------------
db.getCollection("www.angeldiet.co.kr 2").drop();
db.createCollection("www.angeldiet.co.kr 2");
db.getCollection("www.angeldiet.co.kr 2").createIndex({
    ID: NumberInt("1")
}, {
    name: "ID_1"
});

// ----------------------------
// Collection structure for www.bookoa.com（韩国学术出版）
// ----------------------------
db.getCollection("www.bookoa.com（韩国学术出版）").drop();
db.createCollection("www.bookoa.com（韩国学术出版）");
db.getCollection("www.bookoa.com（韩国学术出版）").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("www.bookoa.com（韩国学术出版）").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("www.bookoa.com（韩国学术出版）").createIndex({
    hphone: NumberInt("1")
}, {
    name: "hphone_1"
});
db.getCollection("www.bookoa.com（韩国学术出版）").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("www.bookoa.com（韩国学术出版）").createIndex({
    email: NumberInt("1"),
    name: NumberInt("1")
}, {
    name: "email_1_name_1"
});

// ----------------------------
// Collection structure for 卡塔卡银行_APP数据
// ----------------------------
db.getCollection("卡塔卡银行_APP数据").drop();
db.createCollection("卡塔卡银行_APP数据");

// ----------------------------
// Collection structure for 卡塔卡银行_交易明细
// ----------------------------
db.getCollection("卡塔卡银行_交易明细").drop();
db.createCollection("卡塔卡银行_交易明细");

// ----------------------------
// Collection structure for 卡塔卡银行_交易明细临时
// ----------------------------
db.getCollection("卡塔卡银行_交易明细临时").drop();
db.createCollection("卡塔卡银行_交易明细临时");

// ----------------------------
// Collection structure for 卡塔卡银行_卡主表
// ----------------------------
db.getCollection("卡塔卡银行_卡主表").drop();
db.createCollection("卡塔卡银行_卡主表");

// ----------------------------
// Collection structure for 卡塔卡银行_卡列表
// ----------------------------
db.getCollection("卡塔卡银行_卡列表").drop();
db.createCollection("卡塔卡银行_卡列表");

// ----------------------------
// Collection structure for 卡塔卡银行_审计主表
// ----------------------------
db.getCollection("卡塔卡银行_审计主表").drop();
db.createCollection("卡塔卡银行_审计主表");

// ----------------------------
// Collection structure for 卡塔卡银行_客户
// ----------------------------
db.getCollection("卡塔卡银行_客户").drop();
db.createCollection("卡塔卡银行_客户");

// ----------------------------
// Collection structure for 卡塔卡银行_客户主表
// ----------------------------
db.getCollection("卡塔卡银行_客户主表").drop();
db.createCollection("卡塔卡银行_客户主表");

// ----------------------------
// Collection structure for 卡塔卡银行_收款人主表
// ----------------------------
db.getCollection("卡塔卡银行_收款人主表").drop();
db.createCollection("卡塔卡银行_收款人主表");

// ----------------------------
// Collection structure for 卡塔卡银行_用户档案
// ----------------------------
db.getCollection("卡塔卡银行_用户档案").drop();
db.createCollection("卡塔卡银行_用户档案");

// ----------------------------
// Collection structure for 卡塔卡银行_申请记录
// ----------------------------
db.getCollection("卡塔卡银行_申请记录").drop();
db.createCollection("卡塔卡银行_申请记录");

// ----------------------------
// Collection structure for 卡塔卡银行_电子对账单邮箱
// ----------------------------
db.getCollection("卡塔卡银行_电子对账单邮箱").drop();
db.createCollection("卡塔卡银行_电子对账单邮箱");

// ----------------------------
// Collection structure for 卡塔卡银行_订单客户明细
// ----------------------------
db.getCollection("卡塔卡银行_订单客户明细").drop();
db.createCollection("卡塔卡银行_订单客户明细");

// ----------------------------
// Collection structure for 卡塔卡银行_账户主表
// ----------------------------
db.getCollection("卡塔卡银行_账户主表").drop();
db.createCollection("卡塔卡银行_账户主表");

// ----------------------------
// Collection structure for 卡塔卡银行_身份证变更审计
// ----------------------------
db.getCollection("卡塔卡银行_身份证变更审计").drop();
db.createCollection("卡塔卡银行_身份证变更审计");

// ----------------------------
// Collection structure for 卡塔卡银行_黑名单用户
// ----------------------------
db.getCollection("卡塔卡银行_黑名单用户").drop();
db.createCollection("卡塔卡银行_黑名单用户");

// ----------------------------
// Collection structure for 台湾财经电视台
// ----------------------------
db.getCollection("台湾财经电视台").drop();
db.createCollection("台湾财经电视台");
db.getCollection("台湾财经电视台").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("台湾财经电视台").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("台湾财经电视台").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("台湾财经电视台").createIndex({
    source: NumberInt("1")
}, {
    name: "source_1"
});

// ----------------------------
// Collection structure for 土耳其公民
// ----------------------------
db.getCollection("土耳其公民").drop();
db.createCollection("土耳其公民");

// ----------------------------
// Collection structure for 社工库_1.7G_www.comicstorm.co.kr 85w_1
// ----------------------------
db.getCollection("社工库_1.7G_www.comicstorm.co.kr 85w_1").drop();
db.createCollection("社工库_1.7G_www.comicstorm.co.kr 85w_1");
db.getCollection("社工库_1.7G_www.comicstorm.co.kr 85w_1").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 社工库_1.7G_www.hacker.co.kr 140W_140W
// ----------------------------
db.getCollection("社工库_1.7G_www.hacker.co.kr 140W_140W").drop();
db.createCollection("社工库_1.7G_www.hacker.co.kr 140W_140W");
db.getCollection("社工库_1.7G_www.hacker.co.kr 140W_140W").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
