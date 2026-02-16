export interface Message {
  type: number; // 数据类型：0数据交互 1App功能调用
  data: any;
}
export const TYPE_EMUE = {
  CONNECT: 0,
  DATA: 1,
  FUNCTION: 2,
  CONFIG: 3,
};
// 向 App 发送消息
export const sendMessageToParent = (message: any, type: number) => {
  const params: Message = {
    type: type,
    data: message,
  };

  if (window.uni && window.uni.postMessage) {
    try {
      window.uni.postMessage({
        data: params,
      });
      console.log("[存客宝]SendMessage=>\n" + JSON.stringify(params));
    } catch (e) {
      console.error(
        "[存客宝]SendMessage=>\n" + JSON.stringify(params) + "发送失败:",
        e,
      );
    }
  } else {
    console.error(
      "[存客宝]SendMessage=>\n" + JSON.stringify(params) + "无法发送消息",
    );
  }
};
// 解析 URL 参数中的消息
export const parseUrlMessage = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const search = window.location.search.substring(1);
    let messageParam = null;

    if (search) {
      const pairs = search.split("&");
      for (const pair of pairs) {
        const [key, value] = pair.split("=");
        if (key === "message" && value) {
          messageParam = decodeURIComponent(value);
          break;
        }
      }
    }

    if (messageParam) {
      try {
        const message = JSON.parse(decodeURIComponent(messageParam));
        console.log("[存客宝]ReceiveMessage=>\n" + JSON.stringify(message));
        resolve(message);
        // 清除URL中的message参数
        const newUrl =
          window.location.pathname +
          window.location.search
            .replace(/[?&]message=[^&]*/, "")
            .replace(/^&/, "?");
        window.history.replaceState({}, "", newUrl);
      } catch (e) {
        console.error("解析URL消息失败:", e);
        reject(e);
      }
    }
    reject(null);
  });
};
