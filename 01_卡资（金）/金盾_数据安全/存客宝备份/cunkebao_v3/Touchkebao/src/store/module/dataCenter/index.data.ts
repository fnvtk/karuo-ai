import { ChatRecord, ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import {
  CommentItem,
  likeListItem,
  FriendsCircleItem,
} from "@/pages/pc/ckbox/weChat/components/SidebarMenu/FriendsCicle/index.data";

/**
 * 微信聊天状态管理接口定义
 * 包含聊天消息、联系人管理、朋友圈等功能的状态和方法
 */
export interface WeChatState {
  showChatRecordModel: boolean;
  updateShowChatRecordModel: (show: boolean) => void;
  aiQuoteMessageContent: number;
  updateAiQuoteMessageContent: (message: number) => void;
  quoteMessageContent: string;
  updateQuoteMessageContent: (value: string) => void;
  // ==================== Transmit Module =========Start===========
  /** 选中的聊天记录列表 */
  selectedChatRecords: ChatRecord[];
  /** 更新选中的聊天记录 */
  updateSelectedChatRecords: (message: ChatRecord[]) => void;

  /** 选中的联系人或群组列表 */
  selectedTransmitContact: ContractData[] | weChatGroup[];
  /** 更新选中的联系人或群组 */
  updateSelectedTransmitContact: (
    contact: ContractData[] | weChatGroup[],
  ) => void;

  /** 转发弹窗开启状态 */
  openTransmitModal: boolean;
  /** 更新转发弹窗状态 */
  updateTransmitModal: (open: boolean) => void;
  // ==================== Transmit Module =========END===========

  // ==================== 当前联系人管理 ====================
  /** 当前选中的联系人/群组 */
  currentContract: ContractData | weChatGroup | null;
  /** 清空当前联系人 */
  clearCurrentContact: () => void;
  /** 设置当前联系人 */
  setCurrentContact: (
    contract: ContractData | weChatGroup,
    isExist?: boolean,
  ) => void;

  // ==================== 聊天消息管理 ====================
  /** 当前聊天的消息列表 */
  currentMessages: ChatRecord[];
  /** 添加新消息 */
  addMessage: (message: ChatRecord) => void;
  /** 更新指定消息 */
  updateMessage: (messageId: number, updates: Partial<ChatRecord>) => void;
  /** 撤回指定消息 */
  recallMessage: (messageId: number) => void;
  /** 消息加载状态 */
  messagesLoading: boolean;
  /** 数据初始化加载状态 */
  isLoadingData: boolean;
  /** 当前群组成员列表 */
  currentGroupMembers: any[];

  // ==================== 界面状态管理 ====================
  /** 是否显示复选框 */
  showCheckbox: boolean;
  /** 更新复选框显示状态 */
  updateShowCheckbox: (show: boolean) => void;
  /** 进入模块类型 (common | multipleForwarding) */
  EnterModule: string;
  /** 更新进入模块类型 */
  updateEnterModule: (module: string) => void;

  // ==================== 朋友圈相关 ====================
  /** 朋友圈数据列表 */
  MomentCommon: FriendsCircleItem[];
  /** 朋友圈数据加载状态 */
  MomentCommonLoading: boolean;
  /** 清空朋友圈数据 */
  clearMomentCommon: () => void;
  /** 添加朋友圈数据 */
  addMomentCommon: (moment: FriendsCircleItem[]) => void;
  /** 更新朋友圈数据 */
  updateMomentCommon: (moments: FriendsCircleItem[]) => void;
  /** 更新朋友圈加载状态 */
  updateMomentCommonLoading: (loading: boolean) => void;
  /** 更新朋友圈点赞 */
  updateLikeMoment: (snsId: string, likeList: likeListItem[]) => void;
  /** 更新朋友圈评论 */
  updateComment: (snsId: string, commentList: CommentItem[]) => void;

  // ==================== 消息加载方法 ====================
  /** 加载聊天消息 */
  loadChatMessages: (Init: boolean, To?: number) => Promise<void>;
  /** 搜索消息 */
  SearchMessage: (params: {
    From: number;
    To: number;
    keyword: string;
    Count?: number;
  }) => Promise<void>;

  // ==================== 视频消息处理 ====================
  /** 设置视频消息加载状态 */
  setVideoLoading: (messageId: number, isLoading: boolean) => void;
  /** 设置视频消息URL */
  setVideoUrl: (messageId: number, videoUrl: string) => void;

  // ==================== 消息接收处理 ====================
  /** 接收新消息处理 */
  receivedMsg: (message: ChatRecord) => void;
}
