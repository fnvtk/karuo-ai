import { request, requestWithRetry } from '../config'

// 示例API
export const exampleApi = {
    // 普通请求示例
    getData: (params) => {
        return request({
            url: '/api/getData',
            method: 'GET',
            data: params
        })
    },

    // 使用重试机制的请求示例
    getDataWithRetry: (params) => {
        return requestWithRetry({
            url: '/api/getData',
            method: 'GET',
            data: params
        })
    },

    // POST请求示例
    postData: (data) => {
        return request({
            url: '/api/postData',
            method: 'POST',
            data
        })
    }
} 