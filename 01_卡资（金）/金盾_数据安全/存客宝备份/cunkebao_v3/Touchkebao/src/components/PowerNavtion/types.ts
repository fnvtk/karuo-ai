import React from "react";

/**
 * PowerNavigation 组件类型定义文件
 *
 * 简化版本，按照图片设计
 */

/**
 * PowerNavigation 组件属性类型
 */
export interface PowerNavigationProps {
  /** 页面标题 */
  title?: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 返回按钮文本 */
  backButtonText?: string;
  /** 返回按钮点击事件 */
  onBackClick?: () => void;
  /** 自定义CSS类名 */
  className?: string;
  /** 自定义样式对象 */
  style?: React.CSSProperties;
}

// 导出所有类型
export type { PowerNavigationProps as default };
