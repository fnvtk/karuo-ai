export interface Friend {
  id: string
  nickname: string
  wechatId: string
  tags: string[]
}

export interface GroupConfig {
  size: number
  specificWechatIds: string[]
  keywords: string[]
  tags: string[]
}

export class AutoGroupService {
  static async createGroups(friends: Friend[], config: GroupConfig) {
    // 1. 过滤好友
    const filteredFriends = this.filterFriends(friends, config)

    // 2. 分组
    const groups = this.groupFriends(filteredFriends, config)

    return groups
  }

  private static filterFriends(friends: Friend[], config: GroupConfig) {
    return friends.filter((friend) => {
      // 关键词匹配
      const matchesKeywords =
        config.keywords.length === 0 ||
        config.keywords.some((keyword) => friend.nickname.includes(keyword) || friend.wechatId.includes(keyword))

      // 标签匹配
      const matchesTags = config.tags.length === 0 || config.tags.some((tag) => friend.tags.includes(tag))

      return matchesKeywords && matchesTags
    })
  }

  private static groupFriends(friends: Friend[], config: GroupConfig) {
    const groups: Friend[][] = []
    let currentGroup: Friend[] = []

    // 添加指定的微信号到每个组
    const specificFriends = friends.filter((f) => config.specificWechatIds.includes(f.wechatId))

    // 剩余好友
    const remainingFriends = friends.filter((f) => !config.specificWechatIds.includes(f.wechatId))

    // 分组
    for (const friend of remainingFriends) {
      if (currentGroup.length >= config.size - specificFriends.length) {
        groups.push([...specificFriends, ...currentGroup])
        currentGroup = []
      }
      currentGroup.push(friend)
    }

    // 处理最后一组
    if (currentGroup.length > 0) {
      groups.push([...specificFriends, ...currentGroup])
    }

    return groups
  }

  static async checkGroupSize(groupId: string): Promise<number> {
    // 模拟检查群大小的API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.floor(Math.random() * 10) + 30)
      }, 1000)
    })
  }

  static async addMembersToGroup(groupId: string, members: Friend[]): Promise<boolean> {
    // 模拟添加成员的API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 2000)
    })
  }
}
