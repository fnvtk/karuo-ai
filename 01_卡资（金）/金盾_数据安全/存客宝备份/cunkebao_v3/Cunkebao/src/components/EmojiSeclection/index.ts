// 导出主要组件
export { default as EmojiPicker } from "./EmojiPicker";

// 导出表情数据和类型
export {
  EmojiCategory,
  type EmojiInfo,
  type EmojiName,
  getAllEmojis,
  getEmojisByCategory,
  getEmojiInfo,
  getEmojiPath,
  searchEmojis,
  EMOJI_CATEGORIES,
} from "./wechatEmoji";

// 默认导出
export { default } from "./EmojiPicker";
