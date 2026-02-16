/**
 * 测试辅助工具函数
 * 用于测试和调试新架构功能
 */

import { useMessageStore } from "@/store/module/weChat/message";
import { useContactStoreNew } from "@/store/module/weChat/contacts.new";
import { performanceMonitor } from "../performance";

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  /**
   * 生成模拟会话数据
   */
  static generateSessions(count: number, accountId: number = 0) {
    const sessions = [];
    for (let i = 0; i < count; i++) {
      sessions.push({
        id: i + 1,
        type: i % 2 === 0 ? "friend" : "group",
        wechatAccountId: accountId || (i % 3) + 1,
        wechatFriendId: i % 2 === 0 ? i + 1 : undefined,
        wechatChatroomId: i % 2 === 1 ? i + 1 : undefined,
        nickname: `测试用户${i + 1}`,
        conRemark: i % 3 === 0 ? `备注${i + 1}` : undefined,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        content: `这是第${i + 1}条消息`,
        lastUpdateTime: new Date(Date.now() - i * 60000).toISOString(),
        config: {
          top: i % 10 === 0 ? 1 : 0,
          unreadCount: i % 5 === 0 ? Math.floor(Math.random() * 10) : 0,
        },
      });
    }
    return sessions;
  }

  /**
   * 生成模拟联系人数据
   */
  static generateContacts(count: number, groupId: number = 0) {
    const contacts = [];
    for (let i = 0; i < count; i++) {
      contacts.push({
        id: i + 1,
        type: i % 2 === 0 ? "friend" : "group",
        groupId: groupId || (i % 5) + 1,
        nickname: `联系人${i + 1}`,
        conRemark: i % 3 === 0 ? `备注${i + 1}` : undefined,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        wechatId: `wxid_${i + 1}`,
      });
    }
    return contacts;
  }
}

/**
 * 性能测试辅助函数
 */
export class PerformanceTestHelpers {
  /**
   * 批量测试切换账号性能
   */
  static async batchTestSwitchAccount(
    accountIds: number[],
    iterations: number = 10,
  ) {
    const results: Array<{ accountId: number; durations: number[] }> = [];

    for (const accountId of accountIds) {
      const durations: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const duration = await performanceMonitor.measureAsync(
          `批量测试切换账号${accountId}`,
          async () => {
            const messageStore = useMessageStore.getState();
            await messageStore.switchAccount(accountId);
          },
        );
        durations.push(duration.duration);
      }
      results.push({ accountId, durations });
    }

    return results;
  }

  /**
   * 测试虚拟滚动性能
   */
  static testVirtualScrollPerformance(
    itemCount: number,
    containerHeight: number = 600,
    itemHeight: number = 72,
  ) {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const renderCount = visibleCount + 4; // 加上缓冲项

    return {
      totalItems: itemCount,
      visibleItems: visibleCount,
      renderItems: renderCount,
      renderRatio: (renderCount / itemCount) * 100,
      memoryEstimate: itemCount * 0.5, // 估算内存占用（KB）
    };
  }

  /**
   * 生成性能报告
   */
  static generatePerformanceReport() {
    const stats = performanceMonitor.getStats();
    const report = {
      timestamp: new Date().toISOString(),
      totalMeasurements: stats.count,
      averageDuration: stats.average,
      minDuration: stats.min,
      maxDuration: stats.max,
      totalDuration: stats.total,
      results: stats.results,
    };

    return report;
  }
}

/**
 * 数据验证辅助函数
 */
export class DataValidator {
  /**
   * 验证会话数据完整性
   */
  static validateSession(session: any): boolean {
    if (!session) return false;
    if (!session.id) return false;
    if (!session.type) return false;
    if (!["friend", "group"].includes(session.type)) return false;
    return true;
  }

  /**
   * 验证联系人数据完整性
   */
  static validateContact(contact: any): boolean {
    if (!contact) return false;
    if (!contact.id) return false;
    if (!contact.type) return false;
    if (!["friend", "group"].includes(contact.type)) return false;
    return true;
  }

  /**
   * 验证索引一致性
   */
  static validateIndexConsistency() {
    const messageStore = useMessageStore.getState();
    const allSessions = messageStore.allSessions;
    const sessionIndex = messageStore.sessionIndex;

    // 验证索引中的会话总数是否等于allSessions的长度
    let indexCount = 0;
    sessionIndex.forEach(sessions => {
      indexCount += sessions.length;
    });

    const isValid = indexCount === allSessions.length;

    return {
      isValid,
      allSessionsCount: allSessions.length,
      indexCount,
      difference: Math.abs(indexCount - allSessions.length),
    };
  }
}

/**
 * 调试辅助函数
 */
export class DebugHelpers {
  /**
   * 打印Store状态
   */
  static printStoreState() {
    const messageStore = useMessageStore.getState();
    const contactStore = useContactStoreNew.getState();

    console.group("📊 Store状态");
    console.log("MessageStore:", {
      sessionsCount: messageStore.sessions.length,
      allSessionsCount: messageStore.allSessions.length,
      indexSize: messageStore.sessionIndex.size,
      selectedAccountId: messageStore.selectedAccountId,
      searchKeyword: messageStore.searchKeyword,
    });
    console.log("ContactStore:", {
      groupsCount: contactStore.groups.length,
      expandedGroupsCount: contactStore.expandedGroups.size,
      groupDataSize: contactStore.groupData.size,
      selectedAccountId: contactStore.selectedAccountId,
      isSearchMode: contactStore.isSearchMode,
      searchResultsCount: contactStore.searchResults.length,
    });
    console.groupEnd();
  }

  /**
   * 打印性能统计
   */
  static printPerformanceStats() {
    const stats = performanceMonitor.getStats();
    console.group("⚡ 性能统计");
    console.log("总测量次数:", stats.count);
    console.log("平均耗时:", `${stats.average.toFixed(2)}ms`);
    console.log("最小耗时:", `${stats.min.toFixed(2)}ms`);
    console.log("最大耗时:", `${stats.max.toFixed(2)}ms`);
    console.log("总耗时:", `${stats.total.toFixed(2)}ms`);
    console.groupEnd();
  }

  /**
   * 导出性能数据
   */
  static exportPerformanceData() {
    const data = performanceMonitor.export();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 在浏览器控制台暴露调试工具
if (typeof window !== "undefined") {
  (window as any).__CKB_TEST_HELPERS__ = {
    TestDataGenerator,
    PerformanceTestHelpers,
    DataValidator,
    DebugHelpers,
    printStoreState: DebugHelpers.printStoreState,
    printPerformanceStats: DebugHelpers.printPerformanceStats,
    exportPerformanceData: DebugHelpers.exportPerformanceData,
  };

  console.log(
    "%c🧪 测试工具已加载",
    "color: #1890ff; font-weight: bold; font-size: 14px;",
  );
  console.log("使用 window.__CKB_TEST_HELPERS__ 访问测试工具");
}
