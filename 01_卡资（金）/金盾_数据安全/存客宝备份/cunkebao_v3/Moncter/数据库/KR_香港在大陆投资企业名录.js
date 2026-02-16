/*
 Navicat Premium Data Transfer

 Source Server         : 标签数据库
 Source Server Type    : MongoDB
 Source Server Version : 60025 (6.0.25)
 Source Host           : 192.168.2.6:27017
 Source Schema         : KR_香港在大陆投资企业名录

 Target Server Type    : MongoDB
 Target Server Version : 60025 (6.0.25)
 File Encoding         : 65001

 Date: 19/11/2025 15:21:07
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
// Collection structure for 上海
// ----------------------------
db.getCollection("上海").drop();
db.createCollection("上海");

// ----------------------------
// Collection structure for 云南
// ----------------------------
db.getCollection("云南").drop();
db.createCollection("云南");

// ----------------------------
// Collection structure for 内蒙
// ----------------------------
db.getCollection("内蒙").drop();
db.createCollection("内蒙");

// ----------------------------
// Collection structure for 北京
// ----------------------------
db.getCollection("北京").drop();
db.createCollection("北京");

// ----------------------------
// Collection structure for 吉林
// ----------------------------
db.getCollection("吉林").drop();
db.createCollection("吉林");

// ----------------------------
// Collection structure for 四川
// ----------------------------
db.getCollection("四川").drop();
db.createCollection("四川");

// ----------------------------
// Collection structure for 天津
// ----------------------------
db.getCollection("天津").drop();
db.createCollection("天津");

// ----------------------------
// Collection structure for 宁夏
// ----------------------------
db.getCollection("宁夏").drop();
db.createCollection("宁夏");

// ----------------------------
// Collection structure for 安徽
// ----------------------------
db.getCollection("安徽").drop();
db.createCollection("安徽");

// ----------------------------
// Collection structure for 山东
// ----------------------------
db.getCollection("山东").drop();
db.createCollection("山东");

// ----------------------------
// Collection structure for 山西
// ----------------------------
db.getCollection("山西").drop();
db.createCollection("山西");

// ----------------------------
// Collection structure for 广东
// ----------------------------
db.getCollection("广东").drop();
db.createCollection("广东");

// ----------------------------
// Collection structure for 广西
// ----------------------------
db.getCollection("广西").drop();
db.createCollection("广西");

// ----------------------------
// Collection structure for 新疆
// ----------------------------
db.getCollection("新疆").drop();
db.createCollection("新疆");

// ----------------------------
// Collection structure for 江苏
// ----------------------------
db.getCollection("江苏").drop();
db.createCollection("江苏");

// ----------------------------
// Collection structure for 江西
// ----------------------------
db.getCollection("江西").drop();
db.createCollection("江西");

// ----------------------------
// Collection structure for 河北
// ----------------------------
db.getCollection("河北").drop();
db.createCollection("河北");

// ----------------------------
// Collection structure for 河南
// ----------------------------
db.getCollection("河南").drop();
db.createCollection("河南");

// ----------------------------
// Collection structure for 浙江
// ----------------------------
db.getCollection("浙江").drop();
db.createCollection("浙江");

// ----------------------------
// Collection structure for 海南
// ----------------------------
db.getCollection("海南").drop();
db.createCollection("海南");

// ----------------------------
// Collection structure for 湖北
// ----------------------------
db.getCollection("湖北").drop();
db.createCollection("湖北");

// ----------------------------
// Collection structure for 湖南
// ----------------------------
db.getCollection("湖南").drop();
db.createCollection("湖南");

// ----------------------------
// Collection structure for 甘肃
// ----------------------------
db.getCollection("甘肃").drop();
db.createCollection("甘肃");

// ----------------------------
// Collection structure for 福建
// ----------------------------
db.getCollection("福建").drop();
db.createCollection("福建");

// ----------------------------
// Collection structure for 西藏
// ----------------------------
db.getCollection("西藏").drop();
db.createCollection("西藏");

// ----------------------------
// Collection structure for 贵州
// ----------------------------
db.getCollection("贵州").drop();
db.createCollection("贵州");

// ----------------------------
// Collection structure for 辽宁
// ----------------------------
db.getCollection("辽宁").drop();
db.createCollection("辽宁");

// ----------------------------
// Collection structure for 重庆
// ----------------------------
db.getCollection("重庆").drop();
db.createCollection("重庆");

// ----------------------------
// Collection structure for 陕西
// ----------------------------
db.getCollection("陕西").drop();
db.createCollection("陕西");

// ----------------------------
// Collection structure for 青海
// ----------------------------
db.getCollection("青海").drop();
db.createCollection("青海");

// ----------------------------
// Collection structure for 香港投资企业名录
// ----------------------------
db.getCollection("香港投资企业名录").drop();
db.createCollection("香港投资企业名录");

// ----------------------------
// Collection structure for 黑龙江
// ----------------------------
db.getCollection("黑龙江").drop();
db.createCollection("黑龙江");
