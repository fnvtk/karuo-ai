// 朋友圈相关的API接口
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import request from "@/api/request";
// 朋友圈请求参数接口
export interface FetchMomentParams {
  friendMessageId: number;
  chatroomMessageId: number;
  seq: number;
}

// 获取朋友圈数据
export const fetchReCallApi = async (params: FetchMomentParams) => {
  const { sendCommand } = useWebSocketStore.getState();
  sendCommand("CmdRecallMessage", params);
};

// 音频转文字请求参数接口
export interface VoiceToTextParams {
  friendMessageId: number;
  chatroomMessageId: number;
  seq: number;
}

// 音频转文字
export const fetchVoiceToTextApi = async (params: VoiceToTextParams) => {
  const { sendCommand } = useWebSocketStore.getState();
  sendCommand("CmdVoiceToText", {
    friendMessageId: params.friendMessageId,
    chatroomMessageId: params.chatroomMessageId,
    seq: params.seq,
  });
};

export const getChatroomMemberList = async (params: { groupId: number }) => {
  return request(
    "/v1/chatroom/getMemberList",
    {
      groupId: params.groupId,
      keyword: "",
      limit: 500,
      page: 1,
    },
    "GET",
  );
};
