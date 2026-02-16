import { UserLoginRecord, userLoginRecordService } from "@/utils/db";

/**
 * 登录管理器
 * 负责用户登录记录相关的数据库操作和业务逻辑
 */
export class LoginManager {
  /**
   * 记录用户登录
   */
  static async recordLogin(userId: number): Promise<void> {
    try {
      const serverId = `user_${userId}`;
      const existingRecord =
        await userLoginRecordService.findByPrimaryKey(serverId);

      if (existingRecord) {
        // 更新已存在的记录
        await userLoginRecordService.update(serverId, {
          lastLoginTime: new Date().toISOString(),
          loginCount: (existingRecord.loginCount || 0) + 1,
          lastActiveTime: new Date().toISOString(),
        });
      } else {
        // 创建新记录
        const newRecord: UserLoginRecord = {
          serverId,
          userId,
          lastLoginTime: new Date().toISOString(),
          loginCount: 1,
          createTime: new Date().toISOString(),
          lastActiveTime: new Date().toISOString(),
        };
        await userLoginRecordService.create(newRecord);
      }
    } catch (error) {
      console.error("记录用户登录失败:", error);
      throw error;
    }
  }

  /**
   * 更新用户活跃时间
   */
  static async updateActiveTime(userId: number): Promise<void> {
    try {
      const serverId = `user_${userId}`;
      await userLoginRecordService.update(serverId, {
        lastActiveTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error("更新用户活跃时间失败:", error);
    }
  }

  /**
   * 获取用户登录记录
   */
  static async getLoginRecord(userId: number): Promise<UserLoginRecord | null> {
    try {
      const serverId = `user_${userId}`;
      const record = await userLoginRecordService.findByPrimaryKey(serverId);
      return record as UserLoginRecord | null;
    } catch (error) {
      console.error("获取用户登录记录失败:", error);
      return null;
    }
  }

  /**
   * 检查用户是否是首次登录
   */
  static async isFirstLogin(userId: number): Promise<boolean> {
    try {
      const record = await this.getLoginRecord(userId);
      return !record || record.loginCount === 0;
    } catch (error) {
      console.error("检查首次登录失败:", error);
      return true;
    }
  }

  /**
   * 清理过期用户数据（未登录超过指定天数）
   */
  static async cleanupInactiveUsers(inactiveDays: number = 7): Promise<void> {
    try {
      const allRecords = await userLoginRecordService.findAll();
      const currentTime = new Date().getTime();
      const inactiveThreshold = inactiveDays * 24 * 60 * 60 * 1000;

      const inactiveUserIds: number[] = [];

      for (const record of allRecords) {
        const lastActiveTime = new Date(record.lastActiveTime).getTime();
        if (currentTime - lastActiveTime > inactiveThreshold) {
          inactiveUserIds.push(record.userId);
          await userLoginRecordService.delete(record.serverId);
        }
      }

      console.log(`清理了 ${inactiveUserIds.length} 个不活跃用户的数据`);
    } catch (error) {
      console.error("清理不活跃用户数据失败:", error);
    }
  }

  /**
   * 获取所有登录记录
   */
  static async getAllLoginRecords(): Promise<UserLoginRecord[]> {
    try {
      return (await userLoginRecordService.findAll()) as UserLoginRecord[];
    } catch (error) {
      console.error("获取所有登录记录失败:", error);
      return [];
    }
  }

  /**
   * 删除用户登录记录
   */
  static async deleteLoginRecord(userId: number): Promise<void> {
    try {
      const serverId = `user_${userId}`;
      await userLoginRecordService.delete(serverId);
    } catch (error) {
      console.error("删除用户登录记录失败:", error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
  }> {
    try {
      const allRecords = await userLoginRecordService.findAll();
      const currentTime = new Date().getTime();
      const activeDays = 7;
      const activeThreshold = activeDays * 24 * 60 * 60 * 1000;

      let activeCount = 0;
      for (const record of allRecords) {
        const lastActiveTime = new Date(record.lastActiveTime).getTime();
        if (currentTime - lastActiveTime <= activeThreshold) {
          activeCount++;
        }
      }

      return {
        totalUsers: allRecords.length,
        activeUsers: activeCount,
        inactiveUsers: allRecords.length - activeCount,
      };
    } catch (error) {
      console.error("获取用户统计信息失败:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
      };
    }
  }
}
