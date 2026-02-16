import React, { useState, useRef, useEffect } from "react";
import { EmojiCategory, EmojiInfo, getEmojisByCategory } from "./wechatEmoji";
import "./EmojiPicker.css";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: EmojiInfo) => void;
  trigger?: React.ReactNode;
  className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  trigger,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>(
    EmojiCategory.FACE,
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  // 分类配置
  const categories = [
    { key: EmojiCategory.FACE, label: "😊", title: "人脸" },
    { key: EmojiCategory.GESTURE, label: "👋", title: "手势" },
    { key: EmojiCategory.ANIMAL, label: "🐷", title: "动物" },
    { key: EmojiCategory.BLESSING, label: "🎉", title: "祝福" },
    { key: EmojiCategory.OTHER, label: "❤️", title: "其他" },
  ];

  // 获取当前分类的表情
  const currentEmojis = getEmojisByCategory(activeCategory);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 处理表情选择
  const handleEmojiClick = (emoji: EmojiInfo) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  // 默认触发器
  const defaultTrigger = <span className="emoji-picker-trigger">😊</span>;

  return (
    <div className={`emoji-picker-container ${className}`} ref={pickerRef}>
      {/* 触发器 */}
      <div onClick={() => setIsOpen(!isOpen)}>{trigger || defaultTrigger}</div>

      {/* 表情选择器面板 */}
      {isOpen && (
        <div className="emoji-picker-panel">
          {/* 分类标签 */}
          <div className="emoji-categories">
            {categories.map(category => (
              <button
                key={category.key}
                className={`category-btn ${
                  activeCategory === category.key ? "active" : ""
                }`}
                onClick={() => setActiveCategory(category.key)}
                title={category.title}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* 表情网格 */}
          <div className="emoji-grid">
            {currentEmojis.map(emoji => (
              <div
                key={emoji.name}
                className="emoji-item"
                onClick={() => handleEmojiClick(emoji)}
                title={emoji.name}
              >
                <img
                  src={emoji.path}
                  alt={emoji.name}
                  className="emoji-image"
                />
              </div>
            ))}
          </div>

          {/* 空状态 */}
          {currentEmojis.length === 0 && (
            <div className="emoji-empty">暂无表情</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
