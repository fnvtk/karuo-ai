/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_腾讯

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:44
*/


// ----------------------------
// Collection structure for IT族qq号（435999个群成员）
// ----------------------------
db.getCollection("IT族qq号（435999个群成员）").drop();
db.createCollection("IT族qq号（435999个群成员）");

// ----------------------------
// Collection structure for IT族qq邮箱（435999个群成员）
// ----------------------------
db.getCollection("IT族qq邮箱（435999个群成员）").drop();
db.createCollection("IT族qq邮箱（435999个群成员）");
db.getCollection("IT族qq邮箱（435999个群成员）").createIndex({
    "邮箱": NumberInt("1")
}, {
    name: "idx_邮箱"
});

// ----------------------------
// Collection structure for MBAqq号（48191个群成员）
// ----------------------------
db.getCollection("MBAqq号（48191个群成员）").drop();
db.createCollection("MBAqq号（48191个群成员）");

// ----------------------------
// Collection structure for MBAqq邮箱（48191个群成员）
// ----------------------------
db.getCollection("MBAqq邮箱（48191个群成员）").drop();
db.createCollection("MBAqq邮箱（48191个群成员）");
db.getCollection("MBAqq邮箱（48191个群成员）").createIndex({
    "邮箱": NumberInt("1")
}, {
    name: "idx_邮箱"
});

// ----------------------------
// Collection structure for QQ+手机
// ----------------------------
db.getCollection("QQ+手机").drop();
db.createCollection("QQ+手机");
db.getCollection("QQ+手机").createIndex({
    "省份": NumberInt("1")
}, {
    name: "省份_1"
});
db.getCollection("QQ+手机").createIndex({
    "手机号评分": NumberInt("1")
}, {
    name: "手机号评分_1"
});
db.getCollection("QQ+手机").createIndex({
    phone: NumberInt("1")
}, {
    name: "phone_1"
});

// ----------------------------
// Collection structure for QQ手机号数据
// ----------------------------
db.getCollection("QQ手机号数据").drop();
db.createCollection("QQ手机号数据");
db.getCollection("QQ手机号数据").createIndex({
    qq_number: NumberInt("1")
}, {
    name: "qq_number_1",
    background: true,
    unique: true
});

// ----------------------------
// Collection structure for it认证考试qq号（24416个群成员）
// ----------------------------
db.getCollection("it认证考试qq号（24416个群成员）").drop();
db.createCollection("it认证考试qq号（24416个群成员）");

// ----------------------------
// Collection structure for it认证考试qq邮箱（24416个群成员）
// ----------------------------
db.getCollection("it认证考试qq邮箱（24416个群成员）").drop();
db.createCollection("it认证考试qq邮箱（24416个群成员）");
db.getCollection("it认证考试qq邮箱（24416个群成员）").createIndex({
    "邮箱": NumberInt("1")
}, {
    name: "idx_邮箱"
});

// ----------------------------
// Collection structure for qq邮箱
// ----------------------------
db.getCollection("qq邮箱").drop();
db.createCollection("qq邮箱");

// ----------------------------
// Collection structure for shopping族qq号（16966个群成员）
// ----------------------------
db.getCollection("shopping族qq号（16966个群成员）").drop();
db.createCollection("shopping族qq号（16966个群成员）");

// ----------------------------
// Collection structure for shopping族qq邮箱（16966个群成员）
// ----------------------------
db.getCollection("shopping族qq邮箱（16966个群成员）").drop();
db.createCollection("shopping族qq邮箱（16966个群成员）");

// ----------------------------
// Collection structure for system.profile
// ----------------------------
db.getCollection("system.profile").drop();
db.createCollection("system.profile",{
    capped: true,
    size: 1048576
});

// ----------------------------
// Collection structure for 东风车主qq号（13605个群成员）
// ----------------------------
db.getCollection("东风车主qq号（13605个群成员）").drop();
db.createCollection("东风车主qq号（13605个群成员）");

// ----------------------------
// Collection structure for 东风车主qq邮箱（13605个群成员）
// ----------------------------
db.getCollection("东风车主qq邮箱（13605个群成员）").drop();
db.createCollection("东风车主qq邮箱（13605个群成员）");

// ----------------------------
// Collection structure for 中华车主qq号（11322个群成员）
// ----------------------------
db.getCollection("中华车主qq号（11322个群成员）").drop();
db.createCollection("中华车主qq号（11322个群成员）");

// ----------------------------
// Collection structure for 中华车主qq邮箱（11322个群成员）
// ----------------------------
db.getCollection("中华车主qq邮箱（11322个群成员）").drop();
db.createCollection("中华车主qq邮箱（11322个群成员）");

// ----------------------------
// Collection structure for 丽江旅游自助群
// ----------------------------
db.getCollection("丽江旅游自助群").drop();
db.createCollection("丽江旅游自助群");

// ----------------------------
// Collection structure for 会计考试qq号（146885个群成员）
// ----------------------------
db.getCollection("会计考试qq号（146885个群成员）").drop();
db.createCollection("会计考试qq号（146885个群成员）");

// ----------------------------
// Collection structure for 会计考试qq邮箱（146885个群成员）
// ----------------------------
db.getCollection("会计考试qq邮箱（146885个群成员）").drop();
db.createCollection("会计考试qq邮箱（146885个群成员）");

// ----------------------------
// Collection structure for 儿童教育qq号码（6847个群成员）
// ----------------------------
db.getCollection("儿童教育qq号码（6847个群成员）").drop();
db.createCollection("儿童教育qq号码（6847个群成员）");

// ----------------------------
// Collection structure for 儿童教育qq邮箱（6847个群成员）
// ----------------------------
db.getCollection("儿童教育qq邮箱（6847个群成员）").drop();
db.createCollection("儿童教育qq邮箱（6847个群成员）");

// ----------------------------
// Collection structure for 公务员考试qq号（225647个群成员）
// ----------------------------
db.getCollection("公务员考试qq号（225647个群成员）").drop();
db.createCollection("公务员考试qq号（225647个群成员）");

// ----------------------------
// Collection structure for 公务员考试qq邮箱（225647个群成员）
// ----------------------------
db.getCollection("公务员考试qq邮箱（225647个群成员）").drop();
db.createCollection("公务员考试qq邮箱（225647个群成员）");

// ----------------------------
// Collection structure for 公司销售、培训、内部群qq号（404335个群成员）
// ----------------------------
db.getCollection("公司销售、培训、内部群qq号（404335个群成员）").drop();
db.createCollection("公司销售、培训、内部群qq号（404335个群成员）");

// ----------------------------
// Collection structure for 公司销售、培训、内部群qq邮箱（404335个群成员）
// ----------------------------
db.getCollection("公司销售、培训、内部群qq邮箱（404335个群成员）").drop();
db.createCollection("公司销售、培训、内部群qq邮箱（404335个群成员）");

// ----------------------------
// Collection structure for 其他旅游qq号（467863个群成员）
// ----------------------------
db.getCollection("其他旅游qq号（467863个群成员）").drop();
db.createCollection("其他旅游qq号（467863个群成员）");

// ----------------------------
// Collection structure for 其他旅游qq邮箱（467863个群成员）
// ----------------------------
db.getCollection("其他旅游qq邮箱（467863个群成员）").drop();
db.createCollection("其他旅游qq邮箱（467863个群成员）");

// ----------------------------
// Collection structure for 减肥qq
// ----------------------------
db.getCollection("减肥qq").drop();
db.createCollection("减肥qq");

// ----------------------------
// Collection structure for 别克车主qq号（22192个群成员）
// ----------------------------
db.getCollection("别克车主qq号（22192个群成员）").drop();
db.createCollection("别克车主qq号（22192个群成员）");

// ----------------------------
// Collection structure for 别克车主qq邮箱（22192个群成员）
// ----------------------------
db.getCollection("别克车主qq邮箱（22192个群成员）").drop();
db.createCollection("别克车主qq邮箱（22192个群成员）");

// ----------------------------
// Collection structure for 动漫qq号（586505个群成员）
// ----------------------------
db.getCollection("动漫qq号（586505个群成员）").drop();
db.createCollection("动漫qq号（586505个群成员）");

// ----------------------------
// Collection structure for 动漫qq邮箱（586505个群成员）
// ----------------------------
db.getCollection("动漫qq邮箱（586505个群成员）").drop();
db.createCollection("动漫qq邮箱（586505个群成员）");

// ----------------------------
// Collection structure for 动漫游戏qq号（4677个群成员）
// ----------------------------
db.getCollection("动漫游戏qq号（4677个群成员）").drop();
db.createCollection("动漫游戏qq号（4677个群成员）");

// ----------------------------
// Collection structure for 动漫游戏qq邮箱（4677个群成员）
// ----------------------------
db.getCollection("动漫游戏qq邮箱（4677个群成员）").drop();
db.createCollection("动漫游戏qq邮箱（4677个群成员）");

// ----------------------------
// Collection structure for 化妆qq号码（172823个群成员）
// ----------------------------
db.getCollection("化妆qq号码（172823个群成员）").drop();
db.createCollection("化妆qq号码（172823个群成员）");

// ----------------------------
// Collection structure for 化妆qq邮箱（172823个群成员）
// ----------------------------
db.getCollection("化妆qq邮箱（172823个群成员）").drop();
db.createCollection("化妆qq邮箱（172823个群成员）");

// ----------------------------
// Collection structure for 化妆品qq号（80714个群成员）
// ----------------------------
db.getCollection("化妆品qq号（80714个群成员）").drop();
db.createCollection("化妆品qq号（80714个群成员）");

// ----------------------------
// Collection structure for 化妆品qq邮箱（80714个群成员）
// ----------------------------
db.getCollection("化妆品qq邮箱（80714个群成员）").drop();
db.createCollection("化妆品qq邮箱（80714个群成员）");

// ----------------------------
// Collection structure for 单机游戏qq号码（167004个群成员）
// ----------------------------
db.getCollection("单机游戏qq号码（167004个群成员）").drop();
db.createCollection("单机游戏qq号码（167004个群成员）");

// ----------------------------
// Collection structure for 单机游戏qq邮箱（167004个群成员）
// ----------------------------
db.getCollection("单机游戏qq邮箱（167004个群成员）").drop();
db.createCollection("单机游戏qq邮箱（167004个群成员）");

// ----------------------------
// Collection structure for 古董收藏qq号（2617个群成员）
// ----------------------------
db.getCollection("古董收藏qq号（2617个群成员）").drop();
db.createCollection("古董收藏qq号（2617个群成员）");

// ----------------------------
// Collection structure for 古董收藏qq邮箱（2617个群成员）
// ----------------------------
db.getCollection("古董收藏qq邮箱（2617个群成员）").drop();
db.createCollection("古董收藏qq邮箱（2617个群成员）");

// ----------------------------
// Collection structure for 司法考试qq号（90796个群成员）
// ----------------------------
db.getCollection("司法考试qq号（90796个群成员）").drop();
db.createCollection("司法考试qq号（90796个群成员）");

// ----------------------------
// Collection structure for 司法考试qq邮箱（90796个群成员）
// ----------------------------
db.getCollection("司法考试qq邮箱（90796个群成员）").drop();
db.createCollection("司法考试qq邮箱（90796个群成员）");

// ----------------------------
// Collection structure for 吉利车主qq号（14246个群成员）
// ----------------------------
db.getCollection("吉利车主qq号（14246个群成员）").drop();
db.createCollection("吉利车主qq号（14246个群成员）");

// ----------------------------
// Collection structure for 吉利车主qq邮箱（14246个群成员）
// ----------------------------
db.getCollection("吉利车主qq邮箱（14246个群成员）").drop();
db.createCollection("吉利车主qq邮箱（14246个群成员）");

// ----------------------------
// Collection structure for 同城交友qq号码（2391578个群成员）
// ----------------------------
db.getCollection("同城交友qq号码（2391578个群成员）").drop();
db.createCollection("同城交友qq号码（2391578个群成员）");

// ----------------------------
// Collection structure for 同城交友qq邮箱（2391578个群成员）
// ----------------------------
db.getCollection("同城交友qq邮箱（2391578个群成员）").drop();
db.createCollection("同城交友qq邮箱（2391578个群成员）");

// ----------------------------
// Collection structure for 周六登山协会9群
// ----------------------------
db.getCollection("周六登山协会9群").drop();
db.createCollection("周六登山协会9群");

// ----------------------------
// Collection structure for 在路上户外-休闲-旅游
// ----------------------------
db.getCollection("在路上户外-休闲-旅游").drop();
db.createCollection("在路上户外-休闲-旅游");

// ----------------------------
// Collection structure for 天津778单车俱乐部
// ----------------------------
db.getCollection("天津778单车俱乐部").drop();
db.createCollection("天津778单车俱乐部");

// ----------------------------
// Collection structure for 天津e游人-远离喧嚣群
// ----------------------------
db.getCollection("天津e游人-远离喧嚣群").drop();
db.createCollection("天津e游人-远离喧嚣群");

// ----------------------------
// Collection structure for 天津快乐自驾1
// ----------------------------
db.getCollection("天津快乐自驾1").drop();
db.createCollection("天津快乐自驾1");

// ----------------------------
// Collection structure for 天津户外开心驴群
// ----------------------------
db.getCollection("天津户外开心驴群").drop();
db.createCollection("天津户外开心驴群");

// ----------------------------
// Collection structure for 天津户外旅游安途社
// ----------------------------
db.getCollection("天津户外旅游安途社").drop();
db.createCollection("天津户外旅游安途社");

// ----------------------------
// Collection structure for 天津旅游
// ----------------------------
db.getCollection("天津旅游").drop();
db.createCollection("天津旅游");

// ----------------------------
// Collection structure for 天津滨海驴友快乐营
// ----------------------------
db.getCollection("天津滨海驴友快乐营").drop();
db.createCollection("天津滨海驴友快乐营");

// ----------------------------
// Collection structure for 天津驴友小窝
// ----------------------------
db.getCollection("天津驴友小窝").drop();
db.createCollection("天津驴友小窝");

// ----------------------------
// Collection structure for 天津驴社车友俱乐部
// ----------------------------
db.getCollection("天津驴社车友俱乐部").drop();
db.createCollection("天津驴社车友俱乐部");

// ----------------------------
// Collection structure for 天津骑行
// ----------------------------
db.getCollection("天津骑行").drop();
db.createCollection("天津骑行");

// ----------------------------
// Collection structure for 奇瑞车主qq号（33309个群成员）
// ----------------------------
db.getCollection("奇瑞车主qq号（33309个群成员）").drop();
db.createCollection("奇瑞车主qq号（33309个群成员）");

// ----------------------------
// Collection structure for 奇瑞车主qq邮箱（33309个群成员）
// ----------------------------
db.getCollection("奇瑞车主qq邮箱（33309个群成员）").drop();
db.createCollection("奇瑞车主qq邮箱（33309个群成员）");

// ----------------------------
// Collection structure for 奔腾车主qq号（5401个群成员）
// ----------------------------
db.getCollection("奔腾车主qq号（5401个群成员）").drop();
db.createCollection("奔腾车主qq号（5401个群成员）");

// ----------------------------
// Collection structure for 奔腾车主qq邮箱（5401个群成员）
// ----------------------------
db.getCollection("奔腾车主qq邮箱（5401个群成员）").drop();
db.createCollection("奔腾车主qq邮箱（5401个群成员）");

// ----------------------------
// Collection structure for 奔驰车主qq号（3782个群成员）
// ----------------------------
db.getCollection("奔驰车主qq号（3782个群成员）").drop();
db.createCollection("奔驰车主qq号（3782个群成员）");

// ----------------------------
// Collection structure for 奔驰车主qq邮箱（3782个群成员）
// ----------------------------
db.getCollection("奔驰车主qq邮箱（3782个群成员）").drop();
db.createCollection("奔驰车主qq邮箱（3782个群成员）");

// ----------------------------
// Collection structure for 奥迪车主qq号（28670个群成员）
// ----------------------------
db.getCollection("奥迪车主qq号（28670个群成员）").drop();
db.createCollection("奥迪车主qq号（28670个群成员）");

// ----------------------------
// Collection structure for 奥迪车主qq邮箱（28670个群成员）
// ----------------------------
db.getCollection("奥迪车主qq邮箱（28670个群成员）").drop();
db.createCollection("奥迪车主qq邮箱（28670个群成员）");

// ----------------------------
// Collection structure for 女装qq号码（58223个群成员）
// ----------------------------
db.getCollection("女装qq号码（58223个群成员）").drop();
db.createCollection("女装qq号码（58223个群成员）");

// ----------------------------
// Collection structure for 女装qq邮箱（58223个群成员）
// ----------------------------
db.getCollection("女装qq邮箱（58223个群成员）").drop();
db.createCollection("女装qq邮箱（58223个群成员）");

// ----------------------------
// Collection structure for 婴幼宝贝qq号（52111个群成员）
// ----------------------------
db.getCollection("婴幼宝贝qq号（52111个群成员）").drop();
db.createCollection("婴幼宝贝qq号（52111个群成员）");

// ----------------------------
// Collection structure for 婴幼宝贝qq邮箱（52111个群成员）
// ----------------------------
db.getCollection("婴幼宝贝qq邮箱（52111个群成员）").drop();
db.createCollection("婴幼宝贝qq邮箱（52111个群成员）");

// ----------------------------
// Collection structure for 宝马车主qq号（22860个群成员）
// ----------------------------
db.getCollection("宝马车主qq号（22860个群成员）").drop();
db.createCollection("宝马车主qq号（22860个群成员）");

// ----------------------------
// Collection structure for 宝马车主qq邮箱（22860个群成员）
// ----------------------------
db.getCollection("宝马车主qq邮箱（22860个群成员）").drop();
db.createCollection("宝马车主qq邮箱（22860个群成员）");

// ----------------------------
// Collection structure for 宠物qq号（210501个群成员）
// ----------------------------
db.getCollection("宠物qq号（210501个群成员）").drop();
db.createCollection("宠物qq号（210501个群成员）");

// ----------------------------
// Collection structure for 宠物qq邮箱（210501个群成员）
// ----------------------------
db.getCollection("宠物qq邮箱（210501个群成员）").drop();
db.createCollection("宠物qq邮箱（210501个群成员）");

// ----------------------------
// Collection structure for 家具、日用品qq号（21324个群成员）
// ----------------------------
db.getCollection("家具、日用品qq号（21324个群成员）").drop();
db.createCollection("家具、日用品qq号（21324个群成员）");

// ----------------------------
// Collection structure for 家具、日用品qq邮箱（21324个群成员）
// ----------------------------
db.getCollection("家具、日用品qq邮箱（21324个群成员）").drop();
db.createCollection("家具、日用品qq邮箱（21324个群成员）");

// ----------------------------
// Collection structure for 家用电子qq号（56548个群成员）
// ----------------------------
db.getCollection("家用电子qq号（56548个群成员）").drop();
db.createCollection("家用电子qq号（56548个群成员）");

// ----------------------------
// Collection structure for 家用电子qq邮箱（56548个群成员）
// ----------------------------
db.getCollection("家用电子qq邮箱（56548个群成员）").drop();
db.createCollection("家用电子qq邮箱（56548个群成员）");

// ----------------------------
// Collection structure for 工艺品qq号（1664个群成员）
// ----------------------------
db.getCollection("工艺品qq号（1664个群成员）").drop();
db.createCollection("工艺品qq号（1664个群成员）");

// ----------------------------
// Collection structure for 工艺品qq邮箱（1664个群成员）
// ----------------------------
db.getCollection("工艺品qq邮箱（1664个群成员）").drop();
db.createCollection("工艺品qq邮箱（1664个群成员）");

// ----------------------------
// Collection structure for 市场营销qq号（283622个群成员）
// ----------------------------
db.getCollection("市场营销qq号（283622个群成员）").drop();
db.createCollection("市场营销qq号（283622个群成员）");

// ----------------------------
// Collection structure for 市场营销qq邮箱（283622个群成员）
// ----------------------------
db.getCollection("市场营销qq邮箱（283622个群成员）").drop();
db.createCollection("市场营销qq邮箱（283622个群成员）");

// ----------------------------
// Collection structure for 庞大车友俱乐部2群
// ----------------------------
db.getCollection("庞大车友俱乐部2群").drop();
db.createCollection("庞大车友俱乐部2群");

// ----------------------------
// Collection structure for 律师qq号（87181个群成员）
// ----------------------------
db.getCollection("律师qq号（87181个群成员）").drop();
db.createCollection("律师qq号（87181个群成员）");

// ----------------------------
// Collection structure for 律师qq邮箱（87181个群成员）
// ----------------------------
db.getCollection("律师qq邮箱（87181个群成员）").drop();
db.createCollection("律师qq邮箱（87181个群成员）");

// ----------------------------
// Collection structure for 怪兽美食-程度自驾游
// ----------------------------
db.getCollection("怪兽美食-程度自驾游").drop();
db.createCollection("怪兽美食-程度自驾游");

// ----------------------------
// Collection structure for 房地产qq号（96087个群成员）
// ----------------------------
db.getCollection("房地产qq号（96087个群成员）").drop();
db.createCollection("房地产qq号（96087个群成员）");

// ----------------------------
// Collection structure for 房地产qq邮箱（96087个群成员）
// ----------------------------
db.getCollection("房地产qq邮箱（96087个群成员）").drop();
db.createCollection("房地产qq邮箱（96087个群成员）");

// ----------------------------
// Collection structure for 手机qq号码（226868个群成员）
// ----------------------------
db.getCollection("手机qq号码（226868个群成员）").drop();
db.createCollection("手机qq号码（226868个群成员）");

// ----------------------------
// Collection structure for 手机qq邮箱（226868个群成员）
// ----------------------------
db.getCollection("手机qq邮箱（226868个群成员）").drop();
db.createCollection("手机qq邮箱（226868个群成员）");

// ----------------------------
// Collection structure for 打工一族qq号（110146个群成员）
// ----------------------------
db.getCollection("打工一族qq号（110146个群成员）").drop();
db.createCollection("打工一族qq号（110146个群成员）");

// ----------------------------
// Collection structure for 打工一族qq邮箱（110146个群成员）
// ----------------------------
db.getCollection("打工一族qq邮箱（110146个群成员）").drop();
db.createCollection("打工一族qq邮箱（110146个群成员）");

// ----------------------------
// Collection structure for 探险猎奇qq号（55838个群成员）
// ----------------------------
db.getCollection("探险猎奇qq号（55838个群成员）").drop();
db.createCollection("探险猎奇qq号（55838个群成员）");

// ----------------------------
// Collection structure for 探险猎奇qq邮箱（55838个群成员）
// ----------------------------
db.getCollection("探险猎奇qq邮箱（55838个群成员）").drop();
db.createCollection("探险猎奇qq邮箱（55838个群成员）");

// ----------------------------
// Collection structure for 摄影qq邮箱
// ----------------------------
db.getCollection("摄影qq邮箱").drop();
db.createCollection("摄影qq邮箱");

// ----------------------------
// Collection structure for 摄影qq邮箱（14618个群成员）
// ----------------------------
db.getCollection("摄影qq邮箱（14618个群成员）").drop();
db.createCollection("摄影qq邮箱（14618个群成员）");

// ----------------------------
// Collection structure for 摄影玩家qq号（125333个群成员）
// ----------------------------
db.getCollection("摄影玩家qq号（125333个群成员）").drop();
db.createCollection("摄影玩家qq号（125333个群成员）");

// ----------------------------
// Collection structure for 摄影玩家qq邮箱（125333个群成员）
// ----------------------------
db.getCollection("摄影玩家qq邮箱（125333个群成员）").drop();
db.createCollection("摄影玩家qq邮箱（125333个群成员）");

// ----------------------------
// Collection structure for 新东方考试qq号（27781个群成员）
// ----------------------------
db.getCollection("新东方考试qq号（27781个群成员）").drop();
db.createCollection("新东方考试qq号（27781个群成员）");

// ----------------------------
// Collection structure for 新东方考试qq邮箱（27781个群成员）
// ----------------------------
db.getCollection("新东方考试qq邮箱（27781个群成员）").drop();
db.createCollection("新东方考试qq邮箱（27781个群成员）");

// ----------------------------
// Collection structure for 旅游
// ----------------------------
db.getCollection("旅游").drop();
db.createCollection("旅游");

// ----------------------------
// Collection structure for 旅游qq邮箱比较全的
// ----------------------------
db.getCollection("旅游qq邮箱比较全的").drop();
db.createCollection("旅游qq邮箱比较全的");

// ----------------------------
// Collection structure for 旅游美食
// ----------------------------
db.getCollection("旅游美食").drop();
db.createCollection("旅游美食");

// ----------------------------
// Collection structure for 早教qq号码（33956个群成员）
// ----------------------------
db.getCollection("早教qq号码（33956个群成员）").drop();
db.createCollection("早教qq号码（33956个群成员）");

// ----------------------------
// Collection structure for 早教qq邮箱（33956个群成员）
// ----------------------------
db.getCollection("早教qq邮箱（33956个群成员）").drop();
db.createCollection("早教qq邮箱（33956个群成员）");

// ----------------------------
// Collection structure for 景点qq号（241890个群成员）
// ----------------------------
db.getCollection("景点qq号（241890个群成员）").drop();
db.createCollection("景点qq号（241890个群成员）");

// ----------------------------
// Collection structure for 景点qq邮箱（241890个群成员）
// ----------------------------
db.getCollection("景点qq邮箱（241890个群成员）").drop();
db.createCollection("景点qq邮箱（241890个群成员）");

// ----------------------------
// Collection structure for 朋友圈-天津自助游
// ----------------------------
db.getCollection("朋友圈-天津自助游").drop();
db.createCollection("朋友圈-天津自助游");

// ----------------------------
// Collection structure for 本田车主qq号（19147个群成员）
// ----------------------------
db.getCollection("本田车主qq号（19147个群成员）").drop();
db.createCollection("本田车主qq号（19147个群成员）");

// ----------------------------
// Collection structure for 本田车主qq邮箱（19147个群成员）
// ----------------------------
db.getCollection("本田车主qq邮箱（19147个群成员）").drop();
db.createCollection("本田车主qq邮箱（19147个群成员）");

// ----------------------------
// Collection structure for 求职qq号（107317个群成员）
// ----------------------------
db.getCollection("求职qq号（107317个群成员）").drop();
db.createCollection("求职qq号（107317个群成员）");

// ----------------------------
// Collection structure for 求职qq邮箱（107317个群成员）
// ----------------------------
db.getCollection("求职qq邮箱（107317个群成员）").drop();
db.createCollection("求职qq邮箱（107317个群成员）");

// ----------------------------
// Collection structure for 汽车交易群qq号（76463个群成员）
// ----------------------------
db.getCollection("汽车交易群qq号（76463个群成员）").drop();
db.createCollection("汽车交易群qq号（76463个群成员）");

// ----------------------------
// Collection structure for 汽车交易群qq邮箱（76463个群成员）
// ----------------------------
db.getCollection("汽车交易群qq邮箱（76463个群成员）").drop();
db.createCollection("汽车交易群qq邮箱（76463个群成员）");

// ----------------------------
// Collection structure for 海马车主qq号（7782个群成员）
// ----------------------------
db.getCollection("海马车主qq号（7782个群成员）").drop();
db.createCollection("海马车主qq号（7782个群成员）");

// ----------------------------
// Collection structure for 海马车主qq邮箱（7782个群成员）
// ----------------------------
db.getCollection("海马车主qq邮箱（7782个群成员）").drop();
db.createCollection("海马车主qq邮箱（7782个群成员）");

// ----------------------------
// Collection structure for 游多多天津群
// ----------------------------
db.getCollection("游多多天津群").drop();
db.createCollection("游多多天津群");

// ----------------------------
// Collection structure for 游戏交易qq号码（17328个群成员）
// ----------------------------
db.getCollection("游戏交易qq号码（17328个群成员）").drop();
db.createCollection("游戏交易qq号码（17328个群成员）");

// ----------------------------
// Collection structure for 游戏交易qq邮箱（17328个群成员）
// ----------------------------
db.getCollection("游戏交易qq邮箱（17328个群成员）").drop();
db.createCollection("游戏交易qq邮箱（17328个群成员）");

// ----------------------------
// Collection structure for 激情旅游
// ----------------------------
db.getCollection("激情旅游").drop();
db.createCollection("激情旅游");

// ----------------------------
// Collection structure for 玩转旅游
// ----------------------------
db.getCollection("玩转旅游").drop();
db.createCollection("玩转旅游");

// ----------------------------
// Collection structure for 珠宝饰品qq号码（35829个群成员）
// ----------------------------
db.getCollection("珠宝饰品qq号码（35829个群成员）").drop();
db.createCollection("珠宝饰品qq号码（35829个群成员）");

// ----------------------------
// Collection structure for 珠宝饰品qq邮箱（35829个群成员）
// ----------------------------
db.getCollection("珠宝饰品qq邮箱（35829个群成员）").drop();
db.createCollection("珠宝饰品qq邮箱（35829个群成员）");

// ----------------------------
// Collection structure for 电脑qq号码（213718个群成员）
// ----------------------------
db.getCollection("电脑qq号码（213718个群成员）").drop();
db.createCollection("电脑qq号码（213718个群成员）");

// ----------------------------
// Collection structure for 电脑qq邮箱（213718个群成员）
// ----------------------------
db.getCollection("电脑qq邮箱（213718个群成员）").drop();
db.createCollection("电脑qq邮箱（213718个群成员）");

// ----------------------------
// Collection structure for 电脑技术交流qq号（679419个群成员）
// ----------------------------
db.getCollection("电脑技术交流qq号（679419个群成员）").drop();
db.createCollection("电脑技术交流qq号（679419个群成员）");

// ----------------------------
// Collection structure for 电脑技术交流qq邮箱（679419个群成员）
// ----------------------------
db.getCollection("电脑技术交流qq邮箱（679419个群成员）").drop();
db.createCollection("电脑技术交流qq邮箱（679419个群成员）");

// ----------------------------
// Collection structure for 男士产品qq号（29580个群成员）
// ----------------------------
db.getCollection("男士产品qq号（29580个群成员）").drop();
db.createCollection("男士产品qq号（29580个群成员）");

// ----------------------------
// Collection structure for 男士产品qq邮箱（29580个群成员）
// ----------------------------
db.getCollection("男士产品qq邮箱（29580个群成员）").drop();
db.createCollection("男士产品qq邮箱（29580个群成员）");

// ----------------------------
// Collection structure for 直销qq号码（114392个群成员）
// ----------------------------
db.getCollection("直销qq号码（114392个群成员）").drop();
db.createCollection("直销qq号码（114392个群成员）");

// ----------------------------
// Collection structure for 直销qq邮箱（114392个群成员）
// ----------------------------
db.getCollection("直销qq邮箱（114392个群成员）").drop();
db.createCollection("直销qq邮箱（114392个群成员）");

// ----------------------------
// Collection structure for 硬件交流qq号（66270个群成员）
// ----------------------------
db.getCollection("硬件交流qq号（66270个群成员）").drop();
db.createCollection("硬件交流qq号（66270个群成员）");

// ----------------------------
// Collection structure for 硬件交流qq邮箱（66270个群成员）
// ----------------------------
db.getCollection("硬件交流qq邮箱（66270个群成员）").drop();
db.createCollection("硬件交流qq邮箱（66270个群成员）");

// ----------------------------
// Collection structure for 站长qq号（305613个群成员）
// ----------------------------
db.getCollection("站长qq号（305613个群成员）").drop();
db.createCollection("站长qq号（305613个群成员）");

// ----------------------------
// Collection structure for 站长qq邮箱（305613个群成员）
// ----------------------------
db.getCollection("站长qq邮箱（305613个群成员）").drop();
db.createCollection("站长qq邮箱（305613个群成员）");

// ----------------------------
// Collection structure for 红旗车主qq号（1070个群成员）
// ----------------------------
db.getCollection("红旗车主qq号（1070个群成员）").drop();
db.createCollection("红旗车主qq号（1070个群成员）");

// ----------------------------
// Collection structure for 红旗车主qq邮箱（1070个群成员）
// ----------------------------
db.getCollection("红旗车主qq邮箱（1070个群成员）").drop();
db.createCollection("红旗车主qq邮箱（1070个群成员）");

// ----------------------------
// Collection structure for 网赚qq号码（229030个群成员）
// ----------------------------
db.getCollection("网赚qq号码（229030个群成员）").drop();
db.createCollection("网赚qq号码（229030个群成员）");

// ----------------------------
// Collection structure for 网赚qq邮箱（229030个群成员）
// ----------------------------
db.getCollection("网赚qq邮箱（229030个群成员）").drop();
db.createCollection("网赚qq邮箱（229030个群成员）");

// ----------------------------
// Collection structure for 美容护肤类qq群成员
// ----------------------------
db.getCollection("美容护肤类qq群成员").drop();
db.createCollection("美容护肤类qq群成员");

// ----------------------------
// Collection structure for 美食特产qq号码（131001个群成员）
// ----------------------------
db.getCollection("美食特产qq号码（131001个群成员）").drop();
db.createCollection("美食特产qq号码（131001个群成员）");

// ----------------------------
// Collection structure for 翱翔天津户外摄影群
// ----------------------------
db.getCollection("翱翔天津户外摄影群").drop();
db.createCollection("翱翔天津户外摄影群");

// ----------------------------
// Collection structure for 考研qq号（335617个群成员）
// ----------------------------
db.getCollection("考研qq号（335617个群成员）").drop();
db.createCollection("考研qq号（335617个群成员）");

// ----------------------------
// Collection structure for 考研qq邮箱（335617个群成员）
// ----------------------------
db.getCollection("考研qq邮箱（335617个群成员）").drop();
db.createCollection("考研qq邮箱（335617个群成员）");

// ----------------------------
// Collection structure for 职业广告人qq号（503382个群成员）
// ----------------------------
db.getCollection("职业广告人qq号（503382个群成员）").drop();
db.createCollection("职业广告人qq号（503382个群成员）");

// ----------------------------
// Collection structure for 职业广告人qq邮箱（503382个群成员）
// ----------------------------
db.getCollection("职业广告人qq邮箱（503382个群成员）").drop();
db.createCollection("职业广告人qq邮箱（503382个群成员）");

// ----------------------------
// Collection structure for 股票qq号（103489个群成员）
// ----------------------------
db.getCollection("股票qq号（103489个群成员）").drop();
db.createCollection("股票qq号（103489个群成员）");

// ----------------------------
// Collection structure for 股票qq邮箱（103489个群成员）
// ----------------------------
db.getCollection("股票qq邮箱（103489个群成员）").drop();
db.createCollection("股票qq邮箱（103489个群成员）");

// ----------------------------
// Collection structure for 自助游qq号（112553个群成员）
// ----------------------------
db.getCollection("自助游qq号（112553个群成员）").drop();
db.createCollection("自助游qq号（112553个群成员）");

// ----------------------------
// Collection structure for 自助游qq邮箱（112553个群成员）
// ----------------------------
db.getCollection("自助游qq邮箱（112553个群成员）").drop();
db.createCollection("自助游qq邮箱（112553个群成员）");

// ----------------------------
// Collection structure for 自驾游qq号（71983个群成员）
// ----------------------------
db.getCollection("自驾游qq号（71983个群成员）").drop();
db.createCollection("自驾游qq号（71983个群成员）");

// ----------------------------
// Collection structure for 自驾游qq邮箱（71983个群成员）
// ----------------------------
db.getCollection("自驾游qq邮箱（71983个群成员）").drop();
db.createCollection("自驾游qq邮箱（71983个群成员）");

// ----------------------------
// Collection structure for 英语四六级qq号（48901个群成员）
// ----------------------------
db.getCollection("英语四六级qq号（48901个群成员）").drop();
db.createCollection("英语四六级qq号（48901个群成员）");

// ----------------------------
// Collection structure for 英语四六级qq邮箱（48901个群成员）
// ----------------------------
db.getCollection("英语四六级qq邮箱（48901个群成员）").drop();
db.createCollection("英语四六级qq邮箱（48901个群成员）");

// ----------------------------
// Collection structure for 营销广告群qq号（92355个群成员）
// ----------------------------
db.getCollection("营销广告群qq号（92355个群成员）").drop();
db.createCollection("营销广告群qq号（92355个群成员）");

// ----------------------------
// Collection structure for 装修qq号（256532个群成员）
// ----------------------------
db.getCollection("装修qq号（256532个群成员）").drop();
db.createCollection("装修qq号（256532个群成员）");

// ----------------------------
// Collection structure for 装修qq邮箱（256532个群成员）
// ----------------------------
db.getCollection("装修qq邮箱（256532个群成员）").drop();
db.createCollection("装修qq邮箱（256532个群成员）");

// ----------------------------
// Collection structure for 起亚车主qq号（7260个群成员）
// ----------------------------
db.getCollection("起亚车主qq号（7260个群成员）").drop();
db.createCollection("起亚车主qq号（7260个群成员）");

// ----------------------------
// Collection structure for 起亚车主qq邮箱（7260个群成员）
// ----------------------------
db.getCollection("起亚车主qq邮箱（7260个群成员）").drop();
db.createCollection("起亚车主qq邮箱（7260个群成员）");

// ----------------------------
// Collection structure for 越野车qq号码（48938个群成员）
// ----------------------------
db.getCollection("越野车qq号码（48938个群成员）").drop();
db.createCollection("越野车qq号码（48938个群成员）");

// ----------------------------
// Collection structure for 越野车qq邮箱（48938个群成员）
// ----------------------------
db.getCollection("越野车qq邮箱（48938个群成员）").drop();
db.createCollection("越野车qq邮箱（48938个群成员）");

// ----------------------------
// Collection structure for 运动鞋、运动服qq号（20662个群成员）
// ----------------------------
db.getCollection("运动鞋、运动服qq号（20662个群成员）").drop();
db.createCollection("运动鞋、运动服qq号（20662个群成员）");

// ----------------------------
// Collection structure for 运动鞋、运动服qq邮箱（20662个群成员）
// ----------------------------
db.getCollection("运动鞋、运动服qq邮箱（20662个群成员）").drop();
db.createCollection("运动鞋、运动服qq邮箱（20662个群成员）");

// ----------------------------
// Collection structure for 邮箱
// ----------------------------
db.getCollection("邮箱").drop();
db.createCollection("邮箱");

// ----------------------------
// Collection structure for 重庆旅游交流群（驴）
// ----------------------------
db.getCollection("重庆旅游交流群（驴）").drop();
db.createCollection("重庆旅游交流群（驴）");

// ----------------------------
// Collection structure for 重庆渴乐户外自驾游
// ----------------------------
db.getCollection("重庆渴乐户外自驾游").drop();
db.createCollection("重庆渴乐户外自驾游");

// ----------------------------
// Collection structure for 金融专才qq号（114497个群成员）
// ----------------------------
db.getCollection("金融专才qq号（114497个群成员）").drop();
db.createCollection("金融专才qq号（114497个群成员）");

// ----------------------------
// Collection structure for 金融专才qq邮箱（114497个群成员）
// ----------------------------
db.getCollection("金融专才qq邮箱（114497个群成员）").drop();
db.createCollection("金融专才qq邮箱（114497个群成员）");

// ----------------------------
// Collection structure for 金融投资qq号码（191295个群成员）
// ----------------------------
db.getCollection("金融投资qq号码（191295个群成员）").drop();
db.createCollection("金融投资qq号码（191295个群成员）");

// ----------------------------
// Collection structure for 金融投资qq邮箱（191295个群成员）
// ----------------------------
db.getCollection("金融投资qq邮箱（191295个群成员）").drop();
db.createCollection("金融投资qq邮箱（191295个群成员）");

// ----------------------------
// Collection structure for 长丰车主qq号（1347个群成员）
// ----------------------------
db.getCollection("长丰车主qq号（1347个群成员）").drop();
db.createCollection("长丰车主qq号（1347个群成员）");

// ----------------------------
// Collection structure for 长丰车主qq邮箱（1347个群成员）
// ----------------------------
db.getCollection("长丰车主qq邮箱（1347个群成员）").drop();
db.createCollection("长丰车主qq邮箱（1347个群成员）");

// ----------------------------
// Collection structure for 雪铁龙车主qq号（7345个群成员）
// ----------------------------
db.getCollection("雪铁龙车主qq号（7345个群成员）").drop();
db.createCollection("雪铁龙车主qq号（7345个群成员）");

// ----------------------------
// Collection structure for 雪铁龙车主qq邮箱（7345个群成员）
// ----------------------------
db.getCollection("雪铁龙车主qq邮箱（7345个群成员）").drop();
db.createCollection("雪铁龙车主qq邮箱（7345个群成员）");

// ----------------------------
// Collection structure for 音响qq号码（12601个群成员）
// ----------------------------
db.getCollection("音响qq号码（12601个群成员）").drop();
db.createCollection("音响qq号码（12601个群成员）");

// ----------------------------
// Collection structure for 音响qq邮箱（12601个群成员）
// ----------------------------
db.getCollection("音响qq邮箱（12601个群成员）").drop();
db.createCollection("音响qq邮箱（12601个群成员）");

// ----------------------------
// Collection structure for 驴友qq号（258290个群成员）
// ----------------------------
db.getCollection("驴友qq号（258290个群成员）").drop();
db.createCollection("驴友qq号（258290个群成员）");

// ----------------------------
// Collection structure for 驴友qq邮箱（258290个群成员）
// ----------------------------
db.getCollection("驴友qq邮箱（258290个群成员）").drop();
db.createCollection("驴友qq邮箱（258290个群成员）");
