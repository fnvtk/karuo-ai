/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_淘宝

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:20:35
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
// Collection structure for zippo1（去重复后33万）
// ----------------------------
db.getCollection("zippo1（去重复后33万）").drop();
db.createCollection("zippo1（去重复后33万）");

// ----------------------------
// Collection structure for zippo2
// ----------------------------
db.getCollection("zippo2").drop();
db.createCollection("zippo2");

// ----------------------------
// Collection structure for zippo3
// ----------------------------
db.getCollection("zippo3").drop();
db.createCollection("zippo3");

// ----------------------------
// Collection structure for zippo4
// ----------------------------
db.getCollection("zippo4").drop();
db.createCollection("zippo4");

// ----------------------------
// Collection structure for zippo5
// ----------------------------
db.getCollection("zippo5").drop();
db.createCollection("zippo5");

// ----------------------------
// Collection structure for 办公设备文具（去重复64.5万）
// ----------------------------
db.getCollection("办公设备文具（去重复64.5万）").drop();
db.createCollection("办公设备文具（去重复64.5万）");

// ----------------------------
// Collection structure for 包（去重复后71万）
// ----------------------------
db.getCollection("包（去重复后71万）").drop();
db.createCollection("包（去重复后71万）");

// ----------------------------
// Collection structure for 卖家邮箱（去重复后300万）
// ----------------------------
db.getCollection("卖家邮箱（去重复后300万）").drop();
db.createCollection("卖家邮箱（去重复后300万）");

// ----------------------------
// Collection structure for 女士内衣（去重复后132.6万）
// ----------------------------
db.getCollection("女士内衣（去重复后132.6万）").drop();
db.createCollection("女士内衣（去重复后132.6万）");

// ----------------------------
// Collection structure for 女士箱包配件（去重复后34.8万）
// ----------------------------
db.getCollection("女士箱包配件（去重复后34.8万）").drop();
db.createCollection("女士箱包配件（去重复后34.8万）");

// ----------------------------
// Collection structure for 女装1（去重复后388.6万）
// ----------------------------
db.getCollection("女装1（去重复后388.6万）").drop();
db.createCollection("女装1（去重复后388.6万）");

// ----------------------------
// Collection structure for 女装2（去重复后83万，带旺旺号及支付宝）
// ----------------------------
db.getCollection("女装2（去重复后83万，带旺旺号及支付宝）").drop();
db.createCollection("女装2（去重复后83万，带旺旺号及支付宝）");

// ----------------------------
// Collection structure for 女鞋（去重复后118.6万）
// ----------------------------
db.getCollection("女鞋（去重复后118.6万）").drop();
db.createCollection("女鞋（去重复后118.6万）");

// ----------------------------
// Collection structure for 家具定制代购（去重复后20万）
// ----------------------------
db.getCollection("家具定制代购（去重复后20万）").drop();
db.createCollection("家具定制代购（去重复后20万）");

// ----------------------------
// Collection structure for 家用电器（去重复后93.5万）
// ----------------------------
db.getCollection("家用电器（去重复后93.5万）").drop();
db.createCollection("家用电器（去重复后93.5万）");

// ----------------------------
// Collection structure for 床上用品（去重复后19万）
// ----------------------------
db.getCollection("床上用品（去重复后19万）").drop();
db.createCollection("床上用品（去重复后19万）");

// ----------------------------
// Collection structure for 彩妆护肤（去重复后138万）
// ----------------------------
db.getCollection("彩妆护肤（去重复后138万）").drop();
db.createCollection("彩妆护肤（去重复后138万）");

// ----------------------------
// Collection structure for 成人用品避孕用品情趣内衣（去重复后8万）
// ----------------------------
db.getCollection("成人用品避孕用品情趣内衣（去重复后8万）").drop();
db.createCollection("成人用品避孕用品情趣内衣（去重复后8万）");

// ----------------------------
// Collection structure for 户外军品旅游机票（去重复后64万）
// ----------------------------
db.getCollection("户外军品旅游机票（去重复后64万）").drop();
db.createCollection("户外军品旅游机票（去重复后64万）");

// ----------------------------
// Collection structure for 手机（去重复后80万）
// ----------------------------
db.getCollection("手机（去重复后80万）").drop();
db.createCollection("手机（去重复后80万）");

// ----------------------------
// Collection structure for 数码相机图形冲印（去重复后23.8万）
// ----------------------------
db.getCollection("数码相机图形冲印（去重复后23.8万）").drop();
db.createCollection("数码相机图形冲印（去重复后23.8万）");

// ----------------------------
// Collection structure for 数码配件电子元件（去重复后51.6万）
// ----------------------------
db.getCollection("数码配件电子元件（去重复后51.6万）").drop();
db.createCollection("数码配件电子元件（去重复后51.6万）");

// ----------------------------
// Collection structure for 时尚家饰工艺品（去重复后41万）
// ----------------------------
db.getCollection("时尚家饰工艺品（去重复后41万）").drop();
db.createCollection("时尚家饰工艺品（去重复后41万）");

// ----------------------------
// Collection structure for 汽车配件（去重复后38.6万）
// ----------------------------
db.getCollection("汽车配件（去重复后38.6万）").drop();
db.createCollection("汽车配件（去重复后38.6万）");

// ----------------------------
// Collection structure for 珠宝钻石翡翠（去重复后44.5万）
// ----------------------------
db.getCollection("珠宝钻石翡翠（去重复后44.5万）").drop();
db.createCollection("珠宝钻石翡翠（去重复后44.5万）");

// ----------------------------
// Collection structure for 电脑硬件台式机网络设备（去重复后20万）
// ----------------------------
db.getCollection("电脑硬件台式机网络设备（去重复后20万）").drop();
db.createCollection("电脑硬件台式机网络设备（去重复后20万）");

// ----------------------------
// Collection structure for 男装（去重复后216万）
// ----------------------------
db.getCollection("男装（去重复后216万）").drop();
db.createCollection("男装（去重复后216万）");

// ----------------------------
// Collection structure for 童装婴儿服鞋帽（去重复后52万）
// ----------------------------
db.getCollection("童装婴儿服鞋帽（去重复后52万）").drop();
db.createCollection("童装婴儿服鞋帽（去重复后52万）");

// ----------------------------
// Collection structure for 笔记本（去重复后32万）
// ----------------------------
db.getCollection("笔记本（去重复后32万）").drop();
db.createCollection("笔记本（去重复后32万）");

// ----------------------------
// Collection structure for 网络服务电脑软件（去重复后17万）
// ----------------------------
db.getCollection("网络服务电脑软件（去重复后17万）").drop();
db.createCollection("网络服务电脑软件（去重复后17万）");

// ----------------------------
// Collection structure for 装潢灯具五金（去重复后107万）
// ----------------------------
db.getCollection("装潢灯具五金（去重复后107万）").drop();
db.createCollection("装潢灯具五金（去重复后107万）");

// ----------------------------
// Collection structure for 食品保健（去重复后84.5万）
// ----------------------------
db.getCollection("食品保健（去重复后84.5万）").drop();
db.createCollection("食品保健（去重复后84.5万）");

// ----------------------------
// Collection structure for 饰品（去重复14.7万）
// ----------------------------
db.getCollection("饰品（去重复14.7万）").drop();
db.createCollection("饰品（去重复14.7万）");
