/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_KR

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:18:19
*/


// ----------------------------
// Collection structure for 34万HR人力资源经理企业1
// ----------------------------
db.getCollection("34万HR人力资源经理企业1").drop();
db.createCollection("34万HR人力资源经理企业1");
db.getCollection("34万HR人力资源经理企业1").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("34万HR人力资源经理企业1").createIndex({
    "电话": NumberInt("1")
}, {
    name: "电话_1"
});

// ----------------------------
// Collection structure for 34万HR人力资源经理企业3
// ----------------------------
db.getCollection("34万HR人力资源经理企业3").drop();
db.createCollection("34万HR人力资源经理企业3");
db.getCollection("34万HR人力资源经理企业3").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 34万HR人力资源经理企业4
// ----------------------------
db.getCollection("34万HR人力资源经理企业4").drop();
db.createCollection("34万HR人力资源经理企业4");
db.getCollection("34万HR人力资源经理企业4").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 34万HR人力资源经理企业5
// ----------------------------
db.getCollection("34万HR人力资源经理企业5").drop();
db.createCollection("34万HR人力资源经理企业5");
db.getCollection("34万HR人力资源经理企业5").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 51JOB
// ----------------------------
db.getCollection("51JOB").drop();
db.createCollection("51JOB");

// ----------------------------
// Collection structure for 8万条借款数据
// ----------------------------
db.getCollection("8万条借款数据").drop();
db.createCollection("8万条借款数据");
db.getCollection("8万条借款数据").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for CSDN用户数据
// ----------------------------
db.getCollection("CSDN用户数据").drop();
db.createCollection("CSDN用户数据");
db.getCollection("CSDN用户数据").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("CSDN用户数据").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("CSDN用户数据").createIndex({
    domain: NumberInt("1")
}, {
    name: "domain_1"
});
db.getCollection("CSDN用户数据").createIndex({
    created_at: NumberInt("-1")
}, {
    name: "created_at_-1"
});
db.getCollection("CSDN用户数据").createIndex({
    data_source: NumberInt("1")
}, {
    name: "data_source_1"
});
db.getCollection("CSDN用户数据").createIndex({
    username: NumberInt("1"),
    email: NumberInt("1")
}, {
    name: "username_1_email_1",
    unique: true
});

// ----------------------------
// Collection structure for Sheet2
// ----------------------------
db.getCollection("Sheet2").drop();
db.createCollection("Sheet2");
db.getCollection("Sheet2").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for pw_members
// ----------------------------
db.getCollection("pw_members").drop();
db.createCollection("pw_members");

// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for www.jfclub.com
// ----------------------------
db.getCollection("www.jfclub.com").drop();
db.createCollection("www.jfclub.com");
db.getCollection("www.jfclub.com").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("www.jfclub.com").createIndex({
    u_id: NumberInt("1")
}, {
    name: "u_id_1"
});
db.getCollection("www.jfclub.com").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("www.jfclub.com").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});
db.getCollection("www.jfclub.com").createIndex({
    name: NumberInt("1")
}, {
    name: "name_1"
});
db.getCollection("www.jfclub.com").createIndex({
    email: NumberInt("1"),
    name: NumberInt("1")
}, {
    name: "email_1_name_1"
});
db.getCollection("www.jfclub.com").createIndex({
    phone: NumberInt("1"),
    name: NumberInt("1")
}, {
    name: "phone_1_name_1"
});

// ----------------------------
// Collection structure for 人人网用户数据
// ----------------------------
db.getCollection("人人网用户数据").drop();
db.createCollection("人人网用户数据");

// ----------------------------
// Collection structure for 借贷
// ----------------------------
db.getCollection("借贷").drop();
db.createCollection("借贷");

// ----------------------------
// Collection structure for 全国车主数据集_2020年
// ----------------------------
db.getCollection("全国车主数据集_2020年").drop();
db.createCollection("全国车主数据集_2020年");

// ----------------------------
// Collection structure for 北京本科
// ----------------------------
db.getCollection("北京本科").drop();
db.createCollection("北京本科");
db.getCollection("北京本科").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 千脑云电脑_qiannao_com
// ----------------------------
db.getCollection("千脑云电脑_qiannao_com").drop();
db.createCollection("千脑云电脑_qiannao_com");
db.getCollection("千脑云电脑_qiannao_com").createIndex({
    "用户名": NumberInt("1")
}, {
    name: "用户名_1"
});
db.getCollection("千脑云电脑_qiannao_com").createIndex({
    "邮箱": NumberInt("1")
}, {
    name: "邮箱_1"
});
db.getCollection("千脑云电脑_qiannao_com").createIndex({
    "用户ID": NumberInt("1")
}, {
    name: "用户ID_1"
});
db.getCollection("千脑云电脑_qiannao_com").createIndex({
    "创建时间": NumberInt("1")
}, {
    name: "创建时间_1"
});

// ----------------------------
// Collection structure for 天涯论坛tianya.cn
// ----------------------------
db.getCollection("天涯论坛tianya.cn").drop();
db.createCollection("天涯论坛tianya.cn");

// ----------------------------
// Collection structure for 情感
// ----------------------------
db.getCollection("情感").drop();
db.createCollection("情感");
db.getCollection("情感").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("情感").createIndex({
    "手机": NumberInt("1")
}, {
    name: "手机_1"
});

// ----------------------------
// Collection structure for 慈溪人才网
// ----------------------------
db.getCollection("慈溪人才网").drop();
db.createCollection("慈溪人才网");

// ----------------------------
// Collection structure for 房产网
// ----------------------------
db.getCollection("房产网").drop();
db.createCollection("房产网");
db.getCollection("房产网").createIndex({
    uid: NumberInt("1")
}, {
    name: "uid_1",
    unique: true
});
db.getCollection("房产网").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1"
});
db.getCollection("房产网").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1"
});
db.getCollection("房产网").createIndex({
    regdate: NumberInt("1")
}, {
    name: "regdate_1"
});

// ----------------------------
// Collection structure for 抖音直播粉
// ----------------------------
db.getCollection("抖音直播粉").drop();
db.createCollection("抖音直播粉");
db.getCollection("抖音直播粉").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("抖音直播粉").createIndex({
    Uid: NumberInt("1")
}, {
    name: "Uid_1"
});
db.getCollection("抖音直播粉").createIndex({
    sec_uid: NumberInt("1")
}, {
    name: "sec_uid_1"
});

// ----------------------------
// Collection structure for 收藏品微信好友
// ----------------------------
db.getCollection("收藏品微信好友").drop();
db.createCollection("收藏品微信好友");
db.getCollection("收藏品微信好友").createIndex({
    WechatId: NumberInt("1")
}, {
    name: "IX_Kefure_WechatFriend_WechatId"
});
db.getCollection("收藏品微信好友").createIndex({
    OwnerWechatId: NumberInt("1")
}, {
    name: "IX_Kefure_WechatFriend_OwnerWechatId"
});
db.getCollection("收藏品微信好友").createIndex({
    Phone: NumberInt("1")
}, {
    name: "Phone_1"
});

// ----------------------------
// Collection structure for 收藏品用户
// ----------------------------
db.getCollection("收藏品用户").drop();
db.createCollection("收藏品用户");
db.getCollection("收藏品用户").createIndex({
    Id: NumberInt("1")
}, {
    name: "Id_1"
});
db.getCollection("收藏品用户").createIndex({
    WechatAccountId: NumberInt("1")
}, {
    name: "WechatAccountId_1"
});
db.getCollection("收藏品用户").createIndex({
    WechatId: NumberInt("1")
}, {
    name: "WechatId_1"
});
db.getCollection("收藏品用户").createIndex({
    AccountId: NumberInt("1")
}, {
    name: "AccountId_1"
});
db.getCollection("收藏品用户").createIndex({
    OwnerWechatId: NumberInt("1")
}, {
    name: "OwnerWechatId_1"
});
db.getCollection("收藏品用户").createIndex({
    GroupId: NumberInt("1")
}, {
    name: "GroupId_1"
});
db.getCollection("收藏品用户").createIndex({
    Nickname: NumberInt("1")
}, {
    name: "Nickname_1"
});
db.getCollection("收藏品用户").createIndex({
    AccountNickname: NumberInt("1")
}, {
    name: "AccountNickname_1"
});
db.getCollection("收藏品用户").createIndex({
    OwnerNickname: NumberInt("1")
}, {
    name: "OwnerNickname_1"
});

// ----------------------------
// Collection structure for 木蚂蚁munayi_com
// ----------------------------
db.getCollection("木蚂蚁munayi_com").drop();
db.createCollection("木蚂蚁munayi_com");
db.getCollection("木蚂蚁munayi_com").createIndex({
    username: NumberInt("1")
}, {
    name: "username_1",
    unique: true,
    sparse: true
});
db.getCollection("木蚂蚁munayi_com").createIndex({
    email: NumberInt("1")
}, {
    name: "email_1",
    sparse: true
});
db.getCollection("木蚂蚁munayi_com").createIndex({
    uid: NumberInt("1")
}, {
    name: "uid_1",
    sparse: true
});
db.getCollection("木蚂蚁munayi_com").createIndex({
    data_hash: NumberInt("1")
}, {
    name: "data_hash_1",
    unique: true,
    sparse: true
});

// ----------------------------
// Collection structure for 狂人影子库user
// ----------------------------
db.getCollection("狂人影子库user").drop();
db.createCollection("狂人影子库user");

// ----------------------------
// Collection structure for 珍爱网
// ----------------------------
db.getCollection("珍爱网").drop();
db.createCollection("珍爱网");
db.getCollection("珍爱网").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});

// ----------------------------
// Collection structure for 用户身份凭证数据集
// ----------------------------
db.getCollection("用户身份凭证数据集").drop();
db.createCollection("用户身份凭证数据集");

// ----------------------------
// Collection structure for 网红库
// ----------------------------
db.getCollection("网红库").drop();
db.createCollection("网红库");
db.getCollection("网红库").createIndex({
    id: NumberInt("1")
}, {
    name: "id_1"
});
db.getCollection("网红库").createIndex({
    sec_uid: NumberInt("1")
}, {
    name: "sec_uid_1"
});
db.getCollection("网红库").createIndex({
    idcard: NumberInt("1")
}, {
    name: "idcard_1"
});
db.getCollection("网红库").createIndex({
    collectId: NumberInt("1")
}, {
    name: "collectId_1"
});
db.getCollection("网红库").createIndex({
    cateId: NumberInt("1")
}, {
    name: "cateId_1"
});
db.getCollection("网红库").createIndex({
    authorId: NumberInt("1")
}, {
    name: "authorId_1"
});
db.getCollection("网红库").createIndex({
    uniqueId: NumberInt("1")
}, {
    name: "uniqueId_1"
});
db.getCollection("网红库").createIndex({
    phoneNumber: NumberInt("1")
}, {
    name: "phoneNumber_1"
});
db.getCollection("网红库").createIndex({
    nickname: NumberInt("1")
}, {
    name: "nickname_1"
});
db.getCollection("网红库").createIndex({
    updatedAt: NumberInt("1")
}, {
    name: "updatedAt_1"
});

// ----------------------------
// Collection structure for 雅虎用户
// ----------------------------
db.getCollection("雅虎用户").drop();
db.createCollection("雅虎用户");
