// 评论数据类型
export interface CommentItem {
  commentArg: number;
  commentId1: number;
  commentId2: number;
  commentTime: number;
  content: string;
  nickName: string;
  wechatId: string;
}

// 点赞数据类型
export interface LikeItem {
  createTime: number;
  nickName: string;
  wechatId: string;
}

// 朋友圈实体数据类型
export interface MomentEntity {
  content: string;
  createTime: number;
  lat: number;
  lng: number;
  location: string;
  objectType: number;
  picSize: number;
  resUrls: string[];
  snsId: string;
  urls: string[];
  userName: string;
}

// 朋友圈数据类型定义
export interface FriendsCircleItem {
  commentList: CommentItem[];
  createTime: number;
  likeList: LikeItem[];
  momentEntity: MomentEntity;
  snsId: string;
  type: number;
}

// API响应类型
export interface ApiResponse {
  list: FriendsCircleItem[];
  total: number;
  hasMore: boolean;
}

export interface FriendCardProps {
  monent: FriendsCircleItem;
  isNotMy?: boolean;
  currentKf?: any;
  wechatFriendId?: number;
  formatTime: (time: number) => string;
}

export interface MomentListProps {
  MomentCommon: FriendsCircleItem[];
  MomentCommonLoading: boolean;
  currentKf?: any;
  wechatFriendId?: number;
  formatTime: (time: number) => string;
  loadMomentData: (loadMore: boolean) => void;
}
export interface likeListItem {
  createTime: number;
  nickName: string;
  wechatId: string;
}
