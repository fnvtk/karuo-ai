//消息过滤器
export const messageFilter = (message: string) => {
  if (!message) return "";

  try {
    // 尝试解析为 JSON
    const parsed = JSON.parse(message);

    // 根据消息类型返回对应的显示文本
    switch (true) {
      // 图片消息：包含 previewImage 或 tencentUrl
      case !!(parsed.previewImage || parsed.tencentUrl):
        return "[图片]";

      // 视频消息：包含 videoUrl 或 video（需要在语音消息之前判断）
      case !!(parsed.videoUrl || parsed.video):
        return "[视频]";

      // 语音消息：包含 voiceUrl、voice 或 (url + durationMs)
      case !!(
        parsed.voiceUrl ||
        parsed.voice ||
        (parsed.url && parsed.durationMs)
      ):
        return parsed.text ? `[语音] ${parsed.text}` : "[语音]";

      // 文件消息：包含 fileUrl 或 file
      case !!(parsed.fileUrl || parsed.file):
        return "[文件]";

      // 表情消息：包含 emoji 或 emojiUrl
      case !!(parsed.emoji || parsed.emojiUrl):
        return "[表情]";

      // 位置消息：包含 latitude 和 longitude
      case !!(parsed.latitude && parsed.longitude):
        return "[位置]";

      // 链接消息：包含 linkUrl
      case !!parsed.linkUrl:
        return "[链接]";

      // 微信红包消息：包含 paymsgid 或 nativeurl 中包含红包链接
      case !!(
        parsed.paymsgid ||
        (parsed.nativeurl &&
          parsed.nativeurl.includes(
            "wxpay://c2cbizmessagehandler/hongbao/receivehongbao",
          ))
      ):
        return parsed.sendertitle
          ? `[微信红包] ${parsed.sendertitle}`
          : "[微信红包]";

      // 微信转账消息：包含 title="微信转账" 或 transferid + feedesc
      case !!(
        parsed.title === "微信转账" ||
        (parsed.transferid && parsed.feedesc)
      ):
        return parsed.feedesc ? `[微信转账] ${parsed.feedesc}` : "[微信转账]";

      // 文本消息：包含 text 或 content
      case !!(parsed.text || parsed.content):
        return parsed.text || parsed.content;

      // 其他未知 JSON 格式
      default:
        return message;
    }
  } catch (error) {
    // 如果不是 JSON 格式，检查是否为特殊格式
    // 以 @ 开头的图片URL，例如：@https://...jpg
    if (
      message.startsWith("@") &&
      /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(message)
    ) {
      return "[图片]";
    }

    // XML 格式的位置消息：包含 <location 标签
    if (/<location[\s>]/i.test(message)) {
      return "[位置]";
    }

    // 其他情况直接返回原始消息
    return message;
  }
};

/**
 * 解析系统消息中的HTML标签，提取纯文本
 * 例如：<img src="SystemMessages_HongbaoIcon.png"/>  你领取了许老板的<_wc_custom_link_>红包</_wc_custom_link_>。
 * 提取为：🧧 你领取了许老板的红包
 */
export const parseSystemMessage = (html: string): string => {
  if (!html) return "";

  let text = html;

  // 移除所有 <img> 标签
  text = text.replace(/<img[^>]*>/gi, "");

  // 提取 <_wc_custom_link_> 标签内的文本内容
  // 匹配 <_wc_custom_link_ ...>内容</_wc_custom_link_>
  text = text.replace(
    /<_wc_custom_link_[^>]*>(.*?)<\/_wc_custom_link_>/gi,
    "$1",
  );

  // 清理多余的空格（将多个连续空格替换为单个空格）
  text = text.replace(/\s+/g, " ");

  // 去除首尾空格
  text = text.trim();

  // 如果消息内容包含红包相关关键词，在前面添加🧧图标
  if (/红包|hongbao/i.test(text)) {
    text = `🧧 ${text}`;
  }

  return text;
};
