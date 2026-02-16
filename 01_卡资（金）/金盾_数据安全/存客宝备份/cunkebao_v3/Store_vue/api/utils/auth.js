/**
 * token验证与跳转工具函数
 */

// 检查token是否存在
export const hasToken = () => {
    return !!uni.getStorageSync('token');
};

// 检查token是否过期
export const isTokenExpired = () => {
    const expiredTime = uni.getStorageSync('token_expired');
    if (!expiredTime) return true;
    
    // 将当前时间转换为秒级时间戳，确保与expiredTime单位一致
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    return currentTimeInSeconds >= expiredTime;
};

// 检查是否有有效token
export const hasValidToken = () => {
    return hasToken() && !isTokenExpired();
};

// 清除token信息
export const clearToken = () => {
    uni.removeStorageSync('token');
    uni.removeStorageSync('member');
    uni.removeStorageSync('token_expired');
};

// 跳转到登录页面
export const redirectToLogin = () => {
    const currentPage = getCurrentPages().pop();
    if (currentPage && currentPage.route !== 'pages/login/index') {
        uni.reLaunch({
            url: '/pages/login/index'
        });
    }
};

// 跳转到聊天页面
export const redirectToChat = () => {
    uni.reLaunch({
        url: '/pages/chat/index'
    });
}; 