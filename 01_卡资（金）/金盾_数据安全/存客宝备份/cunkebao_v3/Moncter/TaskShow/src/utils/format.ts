/**
 * 日期时间格式化工具
 */

/**
 * 格式化日期时间
 * @param date 日期对象或时间戳或日期字符串
 * @param format 格式字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (
  date: Date | number | string | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!date) return '-'
  
  try {
    let d: Date
    
    if (date instanceof Date) {
      d = date
    } else if (typeof date === 'string') {
      // 处理 ISO 8601 格式字符串
      d = new Date(date)
    } else if (typeof date === 'number') {
      d = new Date(date)
    } else {
      // 如果是对象，尝试转换为字符串再解析
      d = new Date(String(date))
    }
    
    // 检查日期是否有效
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return '-'
    }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
  } catch (error) {
    console.error('formatDateTime error:', error, date)
    return '-'
  }
}

/**
 * 格式化日期
 * @param date 日期对象或时间戳或日期字符串
 * @returns 格式化后的日期字符串 YYYY-MM-DD
 */
export const formatDate = (date: Date | number | string | null | undefined): string => {
  return formatDateTime(date, 'YYYY-MM-DD')
}

/**
 * 格式化时间
 * @param date 日期对象或时间戳或日期字符串
 * @returns 格式化后的时间字符串 HH:mm:ss
 */
export const formatTime = (date: Date | number | string | null | undefined): string => {
  return formatDateTime(date, 'HH:mm:ss')
}

/**
 * 相对时间格式化（如：1分钟前、2小时前）
 * @param date 日期对象或时间戳或日期字符串
 * @returns 相对时间字符串
 */
export const formatRelativeTime = (date: Date | number | string | null | undefined): string => {
  if (!date) return '-'
  
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date
  
  if (isNaN(d.getTime())) return '-'
  
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

