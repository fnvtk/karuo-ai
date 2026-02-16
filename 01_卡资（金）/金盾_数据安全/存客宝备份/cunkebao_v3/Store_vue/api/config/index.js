// API配置文件

// 基础配置
//export const BASE_URL = 'http://yishi.com'
export const BASE_URL = 'https://ckbapi.quwanzhi.com'

// 获取请求头
const getHeaders = (options = {}) => {
    const token = uni.getStorageSync('token');
    return {
        'content-type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.header
    };
};

// 请求配置
export const request = (options) => {
    return new Promise((resolve, reject) => {
        const requestTask = uni.request({
            url: BASE_URL + options.url,
            method: options.method || 'GET',
            data: options.data,
            header: getHeaders(options),
            success: (res) => {
                if (res.statusCode === 200) {
                    resolve(res.data)
                } else if (res.statusCode === 401) {
                    // token过期或无效
                    uni.removeStorageSync('token');
                    uni.removeStorageSync('member');
                    uni.removeStorageSync('token_expired');
                    uni.showToast({
                        title: '登录已过期，请重新登录',
                        icon: 'none'
                    });
                    setTimeout(() => {
                        uni.reLaunch({
                            url: '/pages/login/index'
                        });
                    }, 1500);
                    reject(res);
                } else {
                    handleError(res)
                    reject(res)
                }
            },
            fail: (err) => {
                handleError(err)
                reject(err)
            }
        })

        // 超时处理
        setTimeout(() => {
            if (requestTask) {
                requestTask.abort()
                handleError({ message: '请求超时，请稍后重试' })
                reject({ message: '请求超时，请稍后重试' })
            }
        }, options.timeout || 30000)
    })
}

// 错误处理函数
const handleError = (error) => {
    let message = '网络请求失败，请稍后重试'
    
    if (error.errMsg && error.errMsg.includes('解析失败')) {
        message = '网页解析失败，可能是不支持的网页类型，请稍后重试'
    }
    
    console.log(message)
    // uni.showToast({
    //     title: message,
    //     icon: 'none',
    //     duration: 2000
    // })
}

// 请求重试函数
export const requestWithRetry = async (options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await request(options)
        } catch (error) {
            if (i === maxRetries - 1) throw error
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
    }
} 