/**
 * 数据脱敏工具
 */

/**
 * 脱敏手机号
 * @param phone 手机号
 * @returns 脱敏后的手机号，如：138****8000
 */
export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-'
  if (phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 脱敏身份证号
 * @param idCard 身份证号
 * @returns 脱敏后的身份证号，如：110101********1234
 */
export const maskIdCard = (idCard: string | null | undefined): string => {
  if (!idCard) return '-'
  if (idCard.length === 18) {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
  } else if (idCard.length === 15) {
    return idCard.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2')
  }
  return idCard
}

/**
 * 脱敏银行卡号
 * @param cardNo 银行卡号
 * @returns 脱敏后的银行卡号，如：6222 **** **** 1234
 */
export const maskBankCard = (cardNo: string | null | undefined): string => {
  if (!cardNo) return '-'
  if (cardNo.length < 8) return cardNo
  const start = cardNo.substring(0, 4)
  const end = cardNo.substring(cardNo.length - 4)
  const middle = '*'.repeat(Math.max(0, cardNo.length - 8))
  return `${start} ${middle} ${end}`
}

/**
 * 脱敏姓名
 * @param name 姓名
 * @returns 脱敏后的姓名，如：张*、李**
 */
export const maskName = (name: string | null | undefined): string => {
  if (!name) return '-'
  if (name.length === 1) return name
  if (name.length === 2) return `${name[0]}*`
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`
}

/**
 * 脱敏邮箱
 * @param email 邮箱
 * @returns 脱敏后的邮箱，如：abc****@example.com
 */
export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '-'
  const [username, domain] = email.split('@')
  if (!domain) return email
  if (username.length <= 2) {
    return `${username[0]}*@${domain}`
  }
  return `${username.substring(0, 2)}${'*'.repeat(Math.max(0, username.length - 2))}@${domain}`
}

