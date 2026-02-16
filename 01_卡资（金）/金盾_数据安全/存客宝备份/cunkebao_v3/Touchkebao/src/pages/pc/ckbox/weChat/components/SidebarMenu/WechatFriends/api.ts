import request from "@/api/request";

//分组列表
export function getGroupList(params) {
  return request("/v1/kefu/wechatGroup/list", params, "GET");
}
interface GroupParams {
  id?: number;
  groupName: string;
  groupMemo: string;
  groupType: number;
  sort: number;
}
//添加分组
export function addGroup(params: GroupParams) {
  return request("/v1/kefu/wechatGroup/add", params, "POST");
}

//编辑分组
export function editGroup(params: GroupParams) {
  return request("/v1/kefu/wechatGroup/edit", params, "POST");
}

//删除分组
export function deleteGroup(id) {
  return request("/v1/kefu/wechatGroup/delete?id=" + id, "DELETE");
}

//移动分组
interface MoveGroupParams {
  type: "friend" | "chatroom";
  groupId: number;
  id: number;
}
export function moveGroup(params: MoveGroupParams) {
  return request("/v1/kefu/wechatGroup/move", params, "POST");
}
