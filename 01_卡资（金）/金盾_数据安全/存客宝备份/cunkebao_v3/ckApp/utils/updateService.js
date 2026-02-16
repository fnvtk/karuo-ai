/**
 * App自动更新服务
 * 用于检查新版本并触发下载更新
 */

/**
 * 检查应用更新
 * @param {Object} options 配置选项
 * @param {String} options.currentVersion 当前应用版本号
 * @param {String} options.apiUrl 检查更新的API地址
 * @param {Function} options.onSuccess 检查成功回调
 * @param {Function} options.onError 检查失败回调
 * @returns {Promise} 更新检查的Promise
 */
export function checkUpdate(options) {
  const { currentVersion, apiUrl, onSuccess, onError } = options;
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
      
      
        if (res.statusCode === 200 && res.data) {
          

          try {
            const result = res.data;
           
            const updateInfo = result.data;
            
            // 检查是否有新版本
            if (compareVersion(updateInfo.version, currentVersion) > 0) {
              // 有新版本
              const result = {
                hasUpdate: true,
                version: updateInfo.version,
                downloadUrl: updateInfo.downloadUrl,
                updateContent: updateInfo.updateContent || '发现新版本，请更新！'
              };
              
              if (onSuccess) {
                onSuccess(result);
              }
              
              resolve(result);
            } else {
              // 没有新版本
              const result = {
                hasUpdate: false,
                currentVersion
              };
              
              if (onSuccess) {
                onSuccess(result);
              }
              
              resolve(result);
            }
          } catch (error) {
            const errorMsg = '解析更新信息失败';
            if (onError) {
              onError(errorMsg, error);
            }
            reject(error);
          }
        } else {
          const errorMsg = '获取更新信息失败';
          if (onError) {
            onError(errorMsg);
          }
          reject(new Error(errorMsg));
        }
      },
      fail: (error) => {
        const errorMsg = '检查更新请求失败';
        if (onError) {
          onError(errorMsg, error);
        }
        reject(error);
      }
    });
  });
}

/**
 * 下载并安装更新
 * @param {Object} options 配置选项
 * @param {String} options.downloadUrl 下载地址
 * @param {Function} options.onProgress 下载进度回调
 * @param {Function} options.onSuccess 下载成功回调
 * @param {Function} options.onError 下载失败回调
 */
export function downloadAndInstallUpdate(options) {
  const { downloadUrl, onProgress, onSuccess, onError } = options;
  
  // 判断平台
  const platform = uni.getSystemInfoSync().platform;
  
  if (platform === 'android') {
    // Android平台下载APK并安装
    const downloadTask = uni.downloadFile({
      url: downloadUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 下载成功，安装APK
          plus.runtime.install(
            res.tempFilePath, 
            {
              force: false
            },
            () => {
              if (onSuccess) {
                onSuccess();
              }
            },
            (error) => {
              if (onError) {
                onError('安装更新失败', error);
              }
            }
          );
        } else {
          if (onError) {
            onError('下载更新文件失败');
          }
        }
      },
      fail: (error) => {
        if (onError) {
          onError('下载更新文件失败', error);
        }
      }
    });
    
    // 监听下载进度
    if (onProgress) {
      downloadTask.onProgressUpdate((res) => {
        onProgress(res.progress);
      });
    }
  } else if (platform === 'ios') {
    // iOS平台打开App Store
    plus.runtime.openURL(downloadUrl);
    if (onSuccess) {
      onSuccess();
    }
  } else {
    if (onError) {
      onError('不支持的平台');
    }
  }
}

/**
 * 比较版本号
 * @param {String} v1 版本号1
 * @param {String} v2 版本号2
 * @returns {Number} 1: v1>v2, -1: v1<v2, 0: v1=v2
 */
export function compareVersion(v1, v2) {
  const v1Parts = v1.split('.');
  const v2Parts = v2.split('.');
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = parseInt(v1Parts[i] || 0, 10);
    const v2Part = parseInt(v2Parts[i] || 0, 10);
    
    if (v1Part > v2Part) {
      return 1;
    }
    
    if (v1Part < v2Part) {
      return -1;
    }
  }
  
  return 0;
}

/**
 * 显示更新对话框
 * @param {Object} updateInfo 更新信息
 * @param {Function} onConfirm 确认更新回调
 */
export function showUpdateDialog(updateInfo, onConfirm) {
  // 处理更新内容中的换行符
  let content = updateInfo.updateContent || `发现新版本 ${updateInfo.version}，是否更新？`;
  
  // 确保字符串中的\n被转换为实际的换行符
  content = content.replace(/\\n/g, '\n');
  
  uni.showModal({
    title: '发现新版本',
    content: content,
    confirmText: '立即更新',
    cancelText: '稍后再说',
    success: (res) => {
      if (res.confirm && onConfirm) {
        onConfirm();
      }
    }
  });
}