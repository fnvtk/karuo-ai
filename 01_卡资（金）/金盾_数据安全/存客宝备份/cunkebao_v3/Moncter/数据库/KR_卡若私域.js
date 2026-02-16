/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_卡若私域

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:19:24
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
// Collection structure for 存客宝流量池分类
// ----------------------------
db.getCollection("存客宝流量池分类").drop();
db.createCollection("存客宝流量池分类");
db.getCollection("存客宝流量池分类").createIndex({
    province: NumberInt("1"),
    wechat: NumberInt("1"),
    phoneNumber: NumberInt("1"),
    createdAt: NumberInt("1")
}, {
    name: "user_province_wechat_phone_number_created_at"
});
db.getCollection("存客宝流量池分类").createIndex({
    province: NumberInt("1"),
    wechat: NumberInt("1"),
    phoneNumber: NumberInt("1"),
    wechatIsOpen: NumberInt("1"),
    createdAt: NumberInt("1")
}, {
    name: "user_province_wechat_phone_number_wechat_is_open_created_at"
});

// ----------------------------
// Collection structure for 存客宝流量池分类2
// ----------------------------
db.getCollection("存客宝流量池分类2").drop();
db.createCollection("存客宝流量池分类2");
db.getCollection("存客宝流量池分类2").createIndex({
    source: NumberInt("1"),
    wechat: NumberInt("1")
}, {
    name: "user_source_wechat",
    unique: true
});
db.getCollection("存客宝流量池分类2").createIndex({
    source: NumberInt("1"),
    phoneNumber: NumberInt("1")
}, {
    name: "user_source_phone_number",
    unique: true
});
db.getCollection("存客宝流量池分类2").createIndex({
    province: NumberInt("1")
}, {
    name: "user_province"
});
db.getCollection("存客宝流量池分类2").createIndex({
    wechat: NumberInt("1")
}, {
    name: "user_wechat"
});
db.getCollection("存客宝流量池分类2").createIndex({
    phoneNumber: NumberInt("1")
}, {
    name: "user_phone_number"
});
db.getCollection("存客宝流量池分类2").createIndex({
    wechatIsOpen: NumberInt("1")
}, {
    name: "user_wechat_is_open"
});
db.getCollection("存客宝流量池分类2").createIndex({
    createdAt: NumberInt("1")
}, {
    name: "user_created_at"
});
db.getCollection("存客宝流量池分类2").createIndex({
    jdIsOpen: NumberInt("1")
}, {
    name: "user_jd_is_open"
});

// ----------------------------
// Collection structure for 存客宝采集网红
// ----------------------------
db.getCollection("存客宝采集网红").drop();
db.createCollection("存客宝采集网红");
db.getCollection("存客宝采集网红").createIndex({
    OwnerWechatId: NumberInt("1"),
    Phone: NumberInt("1"),
    Alias: NumberInt("1")
}, {
    name: "IX_Kefure_WechatFriend_OwnerWechatId"
});
db.getCollection("存客宝采集网红").createIndex({
    WechatId: NumberInt("1"),
    IsSend: NumberInt("1"),
    IsDeleted: NumberInt("1"),
    Gender: NumberInt("1"),
    Nickname: NumberInt("1")
}, {
    name: "IX_Kefure_WechatFriend_WechatId_IsSend"
});
db.getCollection("存客宝采集网红").createIndex({
    WechatAccountId: NumberInt("1")
}, {
    name: "WechatAccountId"
});

// ----------------------------
// Collection structure for 存客宝采集网红有微信
// ----------------------------
db.getCollection("存客宝采集网红有微信").drop();
db.createCollection("存客宝采集网红有微信");

// ----------------------------
// Collection structure for 老坑爹商店  shop.lkdie.com
// ----------------------------
db.getCollection("老坑爹商店  shop.lkdie.com").drop();
db.createCollection("老坑爹商店  shop.lkdie.com");
db.getCollection("老坑爹商店  shop.lkdie.com").createIndex({
    email: NumberInt("1")
}, {
    name: "email",
    unique: true
});
db.getCollection("老坑爹商店  shop.lkdie.com").createIndex({
    nickname: NumberInt("1")
}, {
    name: "nickname",
    unique: true
});
db.getCollection("老坑爹商店  shop.lkdie.com").createIndex({
    updatedTime: NumberInt("1")
}, {
    name: "updatedTime"
});

// ----------------------------
// Collection structure for 老坑爹论坛www.lkdie.com 会员
// ----------------------------
db.getCollection("老坑爹论坛www.lkdie.com 会员").drop();
db.createCollection("老坑爹论坛www.lkdie.com 会员");
db.getCollection("老坑爹论坛www.lkdie.com 会员").createIndex({
    username: NumberInt("1")
}, {
    name: "username",
    unique: true
});
db.getCollection("老坑爹论坛www.lkdie.com 会员").createIndex({
    email: NumberInt("1")
}, {
    name: "email"
});

// ----------------------------
// Collection structure for 黑科技www.quwanzhi.com 付款邮箱
// ----------------------------
db.getCollection("黑科技www.quwanzhi.com 付款邮箱").drop();
db.createCollection("黑科技www.quwanzhi.com 付款邮箱");
db.getCollection("黑科技www.quwanzhi.com 付款邮箱").createIndex({
    trade_no: NumberInt("1")
}, {
    name: "tradeNo"
});
db.getCollection("黑科技www.quwanzhi.com 付款邮箱").createIndex({
    zid: NumberInt("1")
}, {
    name: "zid"
});
db.getCollection("黑科技www.quwanzhi.com 付款邮箱").createIndex({
    tid: NumberInt("1")
}, {
    name: "tid"
});

// ----------------------------
// Collection structure for 黑科技www.quwanzhi.com 发卡邮箱
// ----------------------------
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").drop();
db.createCollection("黑科技www.quwanzhi.com 发卡邮箱");
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    zid: NumberInt("1")
}, {
    name: "zid"
});
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    input: NumberInt("1")
}, {
    name: "input"
});
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    userid: NumberInt("1")
}, {
    name: "userid"
});
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    tradeno: NumberInt("1")
}, {
    name: "tradeno"
});
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    id: NumberInt("1")
}, {
    name: "id"
});
db.getCollection("黑科技www.quwanzhi.com 发卡邮箱").createIndex({
    tid: NumberInt("1")
}, {
    name: "tid"
});
