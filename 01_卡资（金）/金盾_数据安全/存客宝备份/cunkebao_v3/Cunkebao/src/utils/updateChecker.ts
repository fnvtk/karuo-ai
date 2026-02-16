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
  private currentHashes: string[] = [];

  constructor() {
    // 从package.json获取版本号
    this.currentVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
    // 初始化当前哈希值
    this.initCurrentHashes();
  }

  /**
   * 初始化当前哈希值
   */
  private initCurrentHashes() {
    // 从当前页面的资源中提取哈希值
    const scripts = document.querySelectorAll("script[src]");
    const links = document.querySelectorAll("link[href]");

    const scriptHashes = Array.from(scripts)
      .map(script => script.getAttribute("src"))
      .filter(
        src => src && (src.includes("assets/") || src.includes("/assets/")),
      )
      .map(src => {
        // 修改正则表达式，匹配包含字母、数字和下划线的哈希值
        const match = src?.match(/[a-zA-Z0-9_-]{8,}/);
        return match ? match[0] : "";
      })
      .filter(hash => hash);

    const linkHashes = Array.from(links)
      .map(link => link.getAttribute("href"))
      .filter(
        href => href && (href.includes("assets/") || href.includes("/assets/")),
      )
      .map(href => {
        // 修改正则表达式，匹配包含字母、数字和下划线的哈希值
        const match = href?.match(/[a-zA-Z0-9_-]{8,}/);
        return match ? match[0] : "";
      })
      .filter(hash => hash);

    this.currentHashes = [...new Set([...scriptHashes, ...linkHashes])];
  }

  /**
   * 开始检测更新
   */
  start() {
    if (this.intervalId) {
      return;
    }

    // 立即检查一次
    this.checkForUpdate();

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

      // 比较哈希值
      const hasUpdate = this.compareHashes(this.currentHashes, uniqueNewHashes);

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
    window.location.reload();
  }
}

export const updateChecker = new UpdateChecker();
