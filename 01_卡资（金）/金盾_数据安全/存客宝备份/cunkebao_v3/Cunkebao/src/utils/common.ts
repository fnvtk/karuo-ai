import { Modal } from "antd-mobile";
import { getSetting } from "@/store/module/settings";
export function formatWechatTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  // 处理时间戳（兼容秒级/毫秒级）
  const date = new Date(
    timestamp.toString().length === 10 ? timestamp * 1000 : timestamp,
  );
  const now = new Date();

  // 获取消息时间的年月日时分
  const messageYear = date.getFullYear();
  const messageMonth = date.getMonth();
  const messageDate = date.getDate();
  const messageHour = date.getHours().toString().padStart(2, "0");
  const messageMinute = date.getMinutes().toString().padStart(2, "0");

  // 获取当前时间的年月日
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDate = now.getDate();

  // 创建当天0点的时间对象，用于比较是否同一天
  const today = new Date(nowYear, nowMonth, nowDate, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6); // 7天前（包括今天）

  // 消息日期（不含时间）
  const messageDay = new Date(messageYear, messageMonth, messageDate, 0, 0, 0);

  // 当天消息：只显示时分
  if (messageDay.getTime() === today.getTime()) {
    return `${messageHour}:${messageMinute}`;
  }

  // 昨天消息：显示"昨天 时分"
  if (messageDay.getTime() === yesterday.getTime()) {
    return `昨天 ${messageHour}:${messageMinute}`;
  }

  // 一周内消息：显示"星期X 时分"
  if (messageDay.getTime() >= weekAgo.getTime()) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${weekdays[date.getDay()]} ${messageHour}:${messageMinute}`;
  }

  // 超过一周：显示"年月日 时分"
  return `${messageYear}年${messageMonth + 1}月${messageDate}日 ${messageHour}:${messageMinute}`;
}
/**
 * 通用js调用弹窗，Promise风格
 * @param content 弹窗内容
 * @param config  配置项（title, cancelText, confirmText）
 * @returns Promise<void>
 */
export const comfirm = (
  content: string,
  config?: {
    title?: string;
    cancelText?: string;
    confirmText?: string;
  },
): Promise<void> => {
  return new Promise((resolve, reject) => {
    Modal.show({
      title: config?.title || "提示",
      content,
      closeOnAction: true,
      actions: [
        {
          key: "cancel",
          text: config?.cancelText || "取消",
          onClick: () => reject(),
        },
        {
          key: "confirm",
          text: config?.confirmText || "确认",
          danger: true,
          onClick: () => resolve(),
        },
      ],
    });
  });
};

export function getSafeAreaHeight() {
  // 1. 优先使用 CSS 环境变量
  if (CSS.supports("padding-top", "env(safe-area-inset-top)")) {
    const safeAreaTop = getComputedStyle(
      document.documentElement,
    ).getPropertyValue("env(safe-area-inset-top)");
    const height = parseInt(safeAreaTop) || 0;
    if (height > 0) return height;
  }

  // 2. 设备检测
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isAppMode = getSetting("isAppMode");
  if (isIOS && isAppMode) {
    // iOS 设备
    const isIPhoneX = window.screen.height >= 812;
    return isIPhoneX ? 44 : 20;
  } else if (isAndroid) {
    // Android 设备
    return 24;
  }

  // 3. 默认值
  return 0;
}

/**
 * 深拷贝函数，支持对象、数组、Date、RegExp等类型
 * @param obj 要拷贝的对象
 * @returns 深拷贝后的对象
 */
export function deepCopy<T>(obj: T): T {
  // 处理 null 和 undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理基本数据类型
  if (typeof obj !== "object") {
    return obj;
  }

  // 处理 Date 对象
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // 处理 RegExp 对象
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  // 处理 Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as T;
  }

  // 处理普通对象
  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepCopy(obj[key]);
    }
  }

  return clonedObj;
}
/**
 * 专门解析微信小程序消息格式（外层JSON+内层XML）的函数
 * @param {string} inputStr - 输入的字符串（外层为JSON，含contentXml和type字段）
 * @returns {Object} 合并后的完整JSON对象（外层字段 + 解析后的XML内容）
 * @throws {Error} 当输入格式错误、JSON解析失败或XML解析失败时抛出异常
 */
export function parseWeappMsgStr(inputStr: string): any {
  try {
    // 1. 解析外层JSON
    const outerJson = JSON.parse(inputStr);

    // 2. 检查必要字段
    if (!outerJson.contentXml || outerJson.type !== "miniprogram") {
      throw new Error("Invalid miniprogram message format");
    }

    // 3. 解析内层XML为JSON
    const xmlContent = outerJson.contentXml;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // 检查XML解析是否成功
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("XML parsing failed");
    }

    // 4. 提取XML中的关键信息
    const msgElement = xmlDoc.getElementsByTagName("msg")[0];
    const appmsgElement = xmlDoc.getElementsByTagName("appmsg")[0];
    const weappinfoElement = xmlDoc.getElementsByTagName("weappinfo")[0];

    if (!msgElement || !appmsgElement) {
      throw new Error("Invalid XML structure");
    }

    // 5. 构建appmsg对象
    const appmsg: any = {
      title: appmsgElement.getElementsByTagName("title")[0]?.textContent || "",
      des: appmsgElement.getElementsByTagName("des")[0]?.textContent || "",
      type: appmsgElement.getElementsByTagName("type")[0]?.textContent || "",
      sourcedisplayname:
        appmsgElement.getElementsByTagName("sourcedisplayname")[0]
          ?.textContent || "",
      appname:
        appmsgElement.getElementsByTagName("appname")[0]?.textContent || "",
    };

    // 6. 处理weappinfo信息
    if (weappinfoElement) {
      appmsg.weappinfo = {
        username:
          weappinfoElement.getElementsByTagName("username")[0]?.textContent ||
          "",
        appid:
          weappinfoElement.getElementsByTagName("appid")[0]?.textContent || "",
        type:
          weappinfoElement.getElementsByTagName("type")[0]?.textContent || "",
        version:
          weappinfoElement.getElementsByTagName("version")[0]?.textContent ||
          "",
        weappiconurl:
          weappinfoElement.getElementsByTagName("weappiconurl")[0]
            ?.textContent || "",
        pagepath:
          weappinfoElement.getElementsByTagName("pagepath")[0]?.textContent ||
          "",
      };

      // 处理thumburl - 从weappiconurl中提取
      const weappiconurl = appmsg.weappinfo.weappiconurl;
      if (weappiconurl && weappiconurl.includes("http")) {
        // 清理URL中的特殊字符和CDATA标记
        appmsg.weappinfo.thumburl = weappiconurl
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/[`"']/g, "")
          .replace(/&amp;/g, "&")
          .trim();
      } else {
        appmsg.weappinfo.thumburl = "";
      }
    }

    // 7. 合并结果
    const result = {
      ...outerJson,
      type: "miniprogram",
      appmsg,
    };

    return result;
  } catch (error) {
    console.error("parseWeappMsgStr error:", error);
    throw new Error(`Failed to parse miniprogram message: ${error.message}`);
  }
}
