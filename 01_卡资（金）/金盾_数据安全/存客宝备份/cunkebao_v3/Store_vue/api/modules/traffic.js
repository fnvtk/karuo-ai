import { request, requestWithRetry } from '../config'

// 流量相关API
export const trafficApi = {
    // 获取流量套餐列表
    getFlowPackages: () => {
        return requestWithRetry({
            url: '/v1/store/flow-packages',
            method: 'GET'
        })
    },
    
    // 获取本月流量使用情况
    getRemainingFlow: () => {
        return requestWithRetry({
            url: '/v1/store/flow-packages/remaining-flow',
            method: 'GET'
        })
    },
    
    // 创建流量套餐订单
    createOrder: (packageId) => {
        return request({
            url: '/v1/store/flow-packages/order',
            method: 'POST',
            data: {
                packageId
            }
        })
    }
} 