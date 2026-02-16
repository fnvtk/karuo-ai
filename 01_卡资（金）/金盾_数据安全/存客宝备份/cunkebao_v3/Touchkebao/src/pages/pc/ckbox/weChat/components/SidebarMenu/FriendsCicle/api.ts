// 朋友圈相关的API接口
import { useWebSocketStore } from "@/store/module/websocket/websocket";

// 朋友圈请求参数接口
export interface FetchMomentParams {
  wechatAccountId: number;
  wechatFriendId?: number;
  createTimeSec?: number;
  prevSnsId?: number;
  count?: number;
  isTimeline?: boolean;
  seq?: number;
}

// 获取朋友圈数据
export const fetchFriendsCircleData = async (params: FetchMomentParams) => {
  const { sendCommand } = useWebSocketStore.getState();
  sendCommand("CmdFetchMoment", params);
};

// 点赞朋友圈
export const likeMoment = async (params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  snsId: string;
  seq?: number;
}) => {
  const { sendCommand } = useWebSocketStore.getState();
  const requestData = {
    cmdType: "CmdMomentInteract",
    momentInteractType: 1,
    wechatAccountId: params.wechatAccountId,
    wechatFriendId: params.wechatFriendId || 0,
    snsId: params.snsId,
    seq: params.seq || Date.now(),
  };

  sendCommand("CmdMomentInteract", requestData);
};

// 取消点赞
export const cancelLikeMoment = async (params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  snsId: string;
  seq?: number;
}) => {
  const { sendCommand } = useWebSocketStore.getState();
  const requestData = {
    cmdType: "CmdMomentCancelInteract",
    optType: 1,
    wechatAccountId: params.wechatAccountId,
    wechatFriendId: params.wechatFriendId || 0,
    CommentId2: "",
    CommentTime: 0,
    snsId: params.snsId,
    seq: params.seq || Date.now(),
  };

  sendCommand("CmdMomentCancelInteract", requestData);
};

// 评论朋友圈
export const commentMoment = async (params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  snsId: string;
  sendWord: string;
  seq?: number;
}) => {
  const { sendCommand } = useWebSocketStore.getState();
  const requestData = {
    cmdType: "CmdMomentInteract",
    wechatAccountId: params.wechatAccountId,
    wechatFriendId: params.wechatFriendId || 0,
    snsId: params.snsId,
    sendWord: params.sendWord,
    momentInteractType: 2,
    seq: params.seq || Date.now(),
  };

  sendCommand("CmdMomentInteract", requestData);
};

// 撤销评论
export const cancelCommentMoment = async (params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  snsId: string;
  CommentTime: number;
  seq?: number;
}) => {
  const { sendCommand } = useWebSocketStore.getState();
  const requestData = {
    cmdType: "CmdMomentCancelInteract",
    optType: 2,
    wechatAccountId: params.wechatAccountId,
    wechatFriendId: params.wechatFriendId || 0,
    CommentId2: "",
    CommentTime: params.CommentTime,
    snsId: params.snsId,
    seq: params.seq || Date.now(),
  };

  sendCommand("CmdMomentCancelInteract", requestData);
};
