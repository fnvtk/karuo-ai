import { request, requestWithRetry } from '../config'

// 认证相关API
export const authApi = {
    // 用户登录
    // @param {string} account - 账号
    // @param {string} password - 密码
    // @param {string} deviceId - 设备ID（仅APP端传递，H5端为空字符串）
    login: (account, password, deviceId) => {
        return request({
            url: '/v1/auth/login',
            method: 'POST',
            data: {
                account: account,
                password: password,
                typeId: 2, // 固定为2
                deviceId: deviceId || '' // 设备ID（仅APP端有值，H5端为空字符串）
            }
        })
    },
    
    // 免密登录
    // @param {string} deviceId - 设备ID
    noPasswordLogin: (deviceId) => {
        return request({
            url: '/v1/store/login',
            method: 'GET',
            data: {
                deviceId: deviceId || ''
            }
        })
    }
} 