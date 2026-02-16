/**
 * 性能测试工具
 * 用于测试新架构的各项性能指标
 */

import { performanceMonitor } from "../performance";
import { useMessageStore } from "@/store/module/weChat/message";
import { useContactStoreNew } from "@/store/module/weChat/contacts.new";

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  name: string;
  duration: number;
  passed: boolean;
  target: number;
  metadata?: Record<string, any>;
}

/**
 * 性能测试套件
 */
export class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];

  /**
   * 测试会话列表切换账号性能
   */
  async testSwitchAccount(accountId: number): Promise<PerformanceTestResult> {
    const result = await performanceMonitor.measureAsync(
      "切换账号",
      async () => {
        const messageStore = useMessageStore.getState();
        await messageStore.switchAccount(accountId);
      },
      { accountId },
    );

    const passed = result.duration < 100;
    const testResult: PerformanceTestResult = {
      name: "切换账号",
      duration: result.duration,
      passed,
      target: 100,
      metadata: { accountId },
    };

    this.results.push(testResult);
    return testResult;
  }

  /**
   * 测试联系人分组展开性能
   */
  async testExpandGroup(
    groupId: number,
    groupType: 1 | 2,
  ): Promise<PerformanceTestResult> {
    const result = await performanceMonitor.measureAsync(
      "展开分组",
      async () => {
        const contactStore = useContactStoreNew.getState();
        const accountId = contactStore.selectedAccountId;
        const groupKey = `${groupId}_${groupType}_${accountId}`;

        // 如果分组未展开，先展开
        if (!contactStore.expandedGroups.has(groupKey)) {
          contactStore.toggleGroup(groupId, groupType);
        }

        // 加载分组联系人
        await contactStore.loadGroupContacts(groupId, groupType);
      },
      { groupId, groupType },
    );

    const passed = result.duration < 200;
    const testResult: PerformanceTestResult = {
      name: "展开分组",
      duration: result.duration,
      passed,
      target: 200,
      metadata: { groupId, groupType },
    };

    this.results.push(testResult);
    return testResult;
  }

  /**
   * 测试搜索性能
   */
  async testSearch(keyword: string): Promise<PerformanceTestResult> {
    const result = await performanceMonitor.measureAsync(
      "搜索",
      async () => {
        const contactStore = useContactStoreNew.getState();
        await contactStore.searchContacts(keyword);
      },
      { keyword },
    );

    const passed = result.duration < 250;
    const testResult: PerformanceTestResult = {
      name: "搜索",
      duration: result.duration,
      passed,
      target: 250,
      metadata: { keyword },
    };

    this.results.push(testResult);
    return testResult;
  }

  /**
   * 测试缓存读取性能
   */
  async testCacheRead(cacheKey: string): Promise<PerformanceTestResult> {
    const result = await performanceMonitor.measureAsync(
      "缓存读取",
      async () => {
        // 这里需要根据实际的缓存实现来测试
        // 示例：从IndexedDB读取
        const db = (window as any).indexedDB;
        if (db) {
          // 模拟缓存读取
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      },
      { cacheKey },
    );

    const passed = result.duration < 50;
    const testResult: PerformanceTestResult = {
      name: "缓存读取",
      duration: result.duration,
      passed,
      target: 50,
      metadata: { cacheKey },
    };

    this.results.push(testResult);
    return testResult;
  }

  /**
   * 获取所有测试结果
   */
  getAllResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * 获取测试统计
   */
  getStats(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    averageDuration: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const averageDuration =
      total > 0
        ? this.results.reduce((sum, r) => sum + r.duration, 0) / total
        : 0;

    return {
      total,
      passed,
      failed,
      passRate,
      averageDuration,
    };
  }

  /**
   * 清空结果
   */
  clear(): void {
    this.results = [];
  }

  /**
   * 导出测试报告
   */
  exportReport(): string {
    const stats = this.getStats();
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      results: this.results,
    };

    return JSON.stringify(report, null, 2);
  }
}

// 创建全局测试套件实例
export const performanceTestSuite = new PerformanceTestSuite();

/**
 * 在浏览器控制台运行性能测试
 * 使用方法：在控制台输入 window.runPerformanceTests()
 */
if (typeof window !== "undefined") {
  (window as any).runPerformanceTests = async () => {
    console.log("开始性能测试...");
    const suite = performanceTestSuite;

    // 测试切换账号
    console.log("测试切换账号...");
    await suite.testSwitchAccount(0); // 切换到"全部"

    // 测试展开分组
    console.log("测试展开分组...");
    const contactStore = useContactStoreNew.getState();
    if (contactStore.groups.length > 0) {
      const firstGroup = contactStore.groups[0];
      await suite.testExpandGroup(firstGroup.id, firstGroup.groupType);
    }

    // 测试搜索
    console.log("测试搜索...");
    await suite.testSearch("测试");

    // 输出结果
    const stats = suite.getStats();
    console.log("性能测试完成！");
    console.log("统计结果：", stats);
    console.log("详细结果：", suite.getAllResults());
    console.log("测试报告：", suite.exportReport());
  };
}
