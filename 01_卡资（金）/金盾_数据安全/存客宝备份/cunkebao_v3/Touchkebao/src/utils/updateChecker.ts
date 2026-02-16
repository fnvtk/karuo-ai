/**
 * 应用更新检测工具
 */

interface UpdateInfo {
  hasUpdate: boolean;
  version?: string;
  timestamp?: number;
}

class UpdateChecker {
  private currentVersion: string;
  private checkInterval: number = 1000 * 60 * 5; // 5分钟检查一次
  private intervalId: NodeJS.Timeout | null = null;
  private updateCallbacks: ((info: UpdateInfo) => void)[] = [];
  private readonly STORAGE_KEY = "__app_manifest_hash__";

  constructor() {
    // 从package.json获取版本号
    this.currentVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
  }

  /**
   * 从 localStorage 获取保存的 manifest 哈希值
   */
  private getStoredHashes(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("读取保存的哈希值失败:", error);
    }
    return [];
  }

  /**
   * 保存 manifest 哈希值到 localStorage
   */
  private saveHashes(hashes: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(hashes));
    } catch (error) {
      console.warn("保存哈希值失败:", error);
    }
  }

  /**
   * 开始检测更新
   */
  start() {
    if (this.intervalId) {
      return;
    }

    // 延迟首次检查，等待页面资源加载完成
    // 延迟 3 秒后再进行首次检查，避免页面刚加载时误判
    setTimeout(() => {
      this.checkForUpdate();
    }, 3000);

    // 设置定时检查
    this.intervalId = setInterval(() => {
      this.checkForUpdate();
    }, this.checkInterval);
  }

  /**
   * 停止检测更新
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdate(): Promise<UpdateInfo> {
    try {
      // 获取新的manifest文件
      let manifestResponse;
      let manifestPath = "/.vite/manifest.json";

      try {
        manifestResponse = await fetch(manifestPath, {
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
      } catch (error) {
        // 如果.vite路径失败，尝试根路径
        manifestPath = "/manifest.json";
        manifestResponse = await fetch(manifestPath, {
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
      }

      if (!manifestResponse.ok) {
        return { hasUpdate: false };
      }

      const manifest = await manifestResponse.json();

      // 从Vite manifest中提取文件哈希
      const newHashes: string[] = [];

      Object.values(manifest).forEach((entry: any) => {
        if (entry.file && entry.file.includes("assets/")) {
          // console.log("处理manifest entry file:", entry.file);
          // 修改正则表达式，匹配包含字母、数字和下划线的哈希值
          const match = entry.file.match(/[a-zA-Z0-9_-]{8,}/);
          if (match) {
            const hash = match[0];
            newHashes.push(hash);
          }
        }
        // 也检查CSS文件
        if (entry.css) {
          entry.css.forEach((cssFile: string) => {
            if (cssFile.includes("assets/")) {
              // console.log("处理manifest entry css:", cssFile);
              // 修改正则表达式，匹配包含字母、数字和下划线的哈希值
              const match = cssFile.match(/[a-zA-Z0-9_-]{8,}/);
              if (match) {
                const hash = match[0];
                // console.log("提取的manifest css哈希:", hash);
                newHashes.push(hash);
              }
            }
          });
        }
      });

      // 去重新哈希值数组
      const uniqueNewHashes = [...new Set(newHashes)];

      // 从 localStorage 获取保存的哈希值
      const storedHashes = this.getStoredHashes();

      // 如果 localStorage 中没有保存的哈希值，说明是首次加载或清除了缓存
      // 此时保存当前 manifest 的哈希值，不触发更新提示
      if (storedHashes.length === 0) {
        this.saveHashes(uniqueNewHashes);
        return { hasUpdate: false };
      }

      // 比较哈希值
      const hasUpdate = this.compareHashes(storedHashes, uniqueNewHashes);

      // 如果有更新，更新保存的哈希值
      if (hasUpdate) {
        // 注意：这里不立即更新，等用户刷新后再更新
        // 这样用户刷新后就不会再提示了
      } else {
        // 如果没有更新，确保保存的哈希值是最新的（防止 manifest 格式变化）
        this.saveHashes(uniqueNewHashes);
      }

      const updateInfo: UpdateInfo = {
        hasUpdate,
        version: manifest.version || this.currentVersion,
        timestamp: Date.now(),
      };

      // 通知所有回调
      this.updateCallbacks.forEach(callback => callback(updateInfo));

      return updateInfo;
    } catch (error) {
      return { hasUpdate: false };
    }
  }

  /**
   * 比较哈希值
   */
  private compareHashes(current: string[], newHashes: string[]): boolean {
    if (current.length !== newHashes.length) {
      return true;
    }

    // 对两个数组进行排序后比较，忽略顺序
    const sortedCurrent = [...current].sort();
    const sortedNewHashes = [...newHashes].sort();

    const hasUpdate = sortedCurrent.some((hash, index) => {
      return hash !== sortedNewHashes[index];
    });

    return hasUpdate;
  }

  /**
   * 注册更新回调
   */
  onUpdate(callback: (info: UpdateInfo) => void) {
    this.updateCallbacks.push(callback);
  }

  /**
   * 移除更新回调
   */
  offUpdate(callback: (info: UpdateInfo) => void) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * 强制刷新页面
   */
  forceReload() {
    // 刷新前清除保存的哈希值，这样刷新后不会立即提示更新
    localStorage.removeItem(this.STORAGE_KEY);
    window.location.reload();
  }
}

export const updateChecker = new UpdateChecker();
