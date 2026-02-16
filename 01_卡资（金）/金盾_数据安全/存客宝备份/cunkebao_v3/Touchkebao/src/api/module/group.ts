import request from "@/api/request";
// 添加分组
interface AddGroupData {
  groupName: string;
  groupMemo: string;
  groupType: number;
  sort: number;
}
export function addGroup(data: AddGroupData) {
  return request("/v1/kefu/wechatGroup/add", data, "POST");
}

// 更新分组
interface UpdateGroupData {
  id: number;
  groupName: string;
  groupMemo: string;
  groupType: number;
  sort: number;
}

export function updateGroup(data: UpdateGroupData) {
  return request("/v1/kefu/wechatGroup/update", data, "POST");
}

// 删除分组
export function deleteGroup(id: number) {
  return request(`/v1/kefu/wechatGroup/delete/${id}`, null, "DELETE");
}

// 获取分组列表
export function getGroupList() {
  return request("/v1/kefu/wechatGroup/list", null, "GET");
}

// 移动分组
interface MoveGroupData {
  type: "friend" | "chatroom";
  groupId: number;
  id: number;
}
export function moveGroup(data: MoveGroupData) {
  return request("/v1/kefu/wechatGroup/move", data, "POST");
}
