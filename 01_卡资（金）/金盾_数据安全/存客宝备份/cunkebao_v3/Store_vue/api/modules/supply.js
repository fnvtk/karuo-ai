import { request, requestWithRetry } from '../config'

// 供应链相关API
export const supplyApi = {
    // 获取供应商列表
    getVendorList: (page, pageSize) => {
        return request({
            url: '/v1/store/vendor/list',
            method: 'GET',
            data: {
                page: page || 1,
                page_size: pageSize || 10
            }
        })
    },
    
    // 获取供应商详情
    getVendorDetail: (id) => {
        return request({
            url: '/v1/store/vendor/detail',
            method: 'GET',
            data: {
                id: id
            }
        })
    },
    
    // 提交订单
    submitOrder: (packageId) => {
        return request({
            url: '/v1/store/vendor/order',
            method: 'POST',
            header: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            data: {
                packageId: packageId
            }
        })
    }
}