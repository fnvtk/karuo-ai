/**
 * 异步获取设备顶部安全区域高度
 * @returns {Promise<number>} 顶部安全区域高度
 */
export function getTopSafeAreaHeightAsync() {
    return new Promise((resolve, reject) => {
      uni.getSystemInfo({
        success: (res) => {
          try {
            const safeAreaInsets = res.safeAreaInsets;
            
            if (safeAreaInsets && safeAreaInsets.top !== undefined) {
              resolve(safeAreaInsets.top);
              return;
            }
            
            if (res.safeArea) {
              const safeArea = res.safeArea;
              const statusBarHeight = res.statusBarHeight || 0;
              const topSafeHeight = safeArea.top - statusBarHeight;
              resolve(Math.max(0, topSafeHeight));
              return;
            }
            
            resolve(`${res.statusBarHeight*2 || 0}px`);
            
          } catch (error) {
            reject(error);
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }