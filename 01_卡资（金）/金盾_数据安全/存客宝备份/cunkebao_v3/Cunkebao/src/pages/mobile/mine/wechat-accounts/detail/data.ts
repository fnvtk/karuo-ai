// 概览数据接口
export interface WechatAccountOverview {
  healthScoreAssessment: {
    score: number;
    dailyLimit: number;
    todayAdded: number;
    lastAddTime: string;
    statusTag: string;
    baseComposition?: Array<{
      name: string;
      score: number;
      formatted: string;
      friendCount?: number;
    }>;
    dynamicRecords?: Array<{
      title?: string;
      description?: string;
      time?: string;
      score?: number;
      formatted?: string;
      statusTag?: string;
    }>;
  };
  accountValue: {
    value: number;
    formatted: string;
  };
  todayValueChange: {
    change: number;
    formatted: string;
    isPositive: boolean;
  };
  totalFriends: number;
  todayNewFriends: number;
  highValueChatrooms: number;
  todayNewChatrooms: number;
}

export interface WechatAccountSummary {
  accountAge: string;
  activityLevel: {
    allTimes: number;
    dayTimes: number;
  };
  accountWeight: {
    scope: number;
    ageWeight: number;
    activityWeigth: number;
    restrictWeight: number;
    realNameWeight: number;
  };
  statistics: {
    todayAdded: number;
    addLimit: number;
  };
  healthScore?: {
    score: number;
    lastUpdate?: string;
    lastAddTime?: string;
    baseScore?: number;
    verifiedScore?: number;
    friendsScore?: number;
    activities?: {
      type: string;
      time?: string;
      score: number;
      description?: string;
      status?: string;
    }[];
  };
  moments?: {
    id: string;
    date: string;
    month: string;
    day: string;
    content: string;
    images?: string[];
    timeAgo?: string;
    hasEmoji?: boolean;
  }[];
  accountValue?: {
    value: number;
    todayChange?: number;
  };
  friendsCount?: {
    total: number;
    todayAdded?: number;
  };
  groupsCount?: {
    total: number;
    todayAdded?: number;
  };
  restrictions: {
    id: number;
    level: number;
    reason: string;
    date: string;
  }[];
  // 新增概览数据
  overview?: WechatAccountOverview;
}

export interface Friend {
  id: string;
  friendId?: string;
  avatar: string;
  nickname: string;
  wechatId: string;
  accountUserName: string;
  accountRealName: string;
  remark: string;
  addTime: string;
  lastInteraction: string;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  region: string;
  source: string;
  notes: string;
  value?: number;
  valueFormatted?: string;
  statusTags?: string[];
}

export interface MomentItem {
  id: string;
  snsId: string;
  type: number;
  content: string;
  resUrls: string[];
  commentList?: any[];
  likeList?: any[];
  createTime: string;
  momentEntity?: {
    lat?: string;
    lng?: string;
    location?: string;
    picSize?: number;
    userName?: string;
  };
}

export interface WechatFriendDetail {
  id: number;
  avatar: string;
  nickname: string;
  region: string;
  wechatId: string;
  addDate: string;
  tags: string[];
  memo: string;
  source: string;
}
