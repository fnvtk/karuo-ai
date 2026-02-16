/**
 * 表单验证工具
 */

/**
 * 验证手机号
 * @param phone 手机号
 * @returns 是否有效
 */
export const validatePhone = (phone: string): boolean => {
  const phoneReg = /^1[3-9]\d{9}$/
  return phoneReg.test(phone)
}

/**
 * 验证邮箱
 * @param email 邮箱
 * @returns 是否有效
 */
export const validateEmail = (email: string): boolean => {
  const emailReg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailReg.test(email)
}

/**
 * 验证身份证号
 * @param idCard 身份证号
 * @returns 是否有效
 */
export const validateIdCard = (idCard: string): boolean => {
  const idCardReg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return idCardReg.test(idCard)
}

/**
 * 验证URL
 * @param url URL地址
 * @returns 是否有效
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证Cron表达式
 * @param cron Cron表达式
 * @returns 是否有效
 */
export const validateCron = (cron: string): boolean => {
  const cronReg = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
  return cronReg.test(cron)
}

/**
 * 验证是否为正整数
 * @param value 值
 * @returns 是否有效
 */
export const validatePositiveInteger = (value: number | string): boolean => {
  const num = typeof value === 'string' ? Number(value) : value
  return Number.isInteger(num) && num > 0
}

/**
 * 验证是否为正数
 * @param value 值
 * @returns 是否有效
 */
export const validatePositiveNumber = (value: number | string): boolean => {
  const num = typeof value === 'string' ? Number(value) : value
  return !isNaN(num) && num > 0
}

