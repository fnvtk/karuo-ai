// 预定义的颜色数组，确保颜色不重复且美观
const CHART_COLORS = [
  "#1677ff", // 蓝色
  "#52c41a", // 绿色
  "#fa8c16", // 橙色
  "#eb2f96", // 粉色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#fa541c", // 红色
  "#2f54eb", // 深蓝色
  "#faad14", // 黄色
  "#a0d911", // 青绿色
  "#f5222d", // 红色
  "#1890ff", // 天蓝色
  "#52c41a", // 绿色
  "#fa8c16", // 橙色
  "#eb2f96", // 粉色
];

/**
 * 获取图表颜色
 * @param index 颜色索引
 * @returns 颜色值
 */
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

/**
 * 获取多个图表颜色
 * @param count 需要的颜色数量
 * @returns 颜色数组
 */
export const getChartColors = (count: number): string[] => {
  return Array.from({ length: count }, (_, index) => getChartColor(index));
};

/**
 * 获取随机图表颜色
 * @returns 随机颜色值
 */
export const getRandomChartColor = (): string => {
  const randomIndex = Math.floor(Math.random() * CHART_COLORS.length);
  return CHART_COLORS[randomIndex];
};

/**
 * 获取渐变色数组
 * @param baseColor 基础颜色
 * @param count 渐变数量
 * @returns 渐变色数组
 */
export const getGradientColors = (
  baseColor: string,
  count: number,
): string[] => {
  // 这里可以实现颜色渐变逻辑
  // 暂时返回相同颜色的数组
  return Array.from({ length: count }, () => baseColor);
};

export default {
  getChartColor,
  getChartColors,
  getRandomChartColor,
  getGradientColors,
};
