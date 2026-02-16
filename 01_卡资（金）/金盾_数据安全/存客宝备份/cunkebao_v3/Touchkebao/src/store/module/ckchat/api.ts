//构建联系人列表标签
import { contactUnifiedService } from "@/utils/db";
import { request } from "@/api/request2";
import { ContactGroupByLabel } from "@/pages/pc/ckbox/data";

export function WechatGroup(params) {
  return request("/api/WechatGroup/list", params, "GET");
}

export const createContractList = async (
  kfSelected: number,
  countLables: ContactGroupByLabel[],
) => {
  const realGroup = countLables
    .filter(item => item.id !== 0)
    .map(item => item.id);

  const dataByLabels = [];
  for (const label of countLables) {
    let data;

    // 使用统一的联系人服务查询
    if (label.id == 0) {
      // 未分组：排除所有已分组的联系人
      data = await contactUnifiedService.findWhereMultiple([
        {
          field: "groupId",
          operator: "notIn",
          value: realGroup,
        },
      ]);
    } else {
      // 指定分组：查询该分组的联系人
      data = await contactUnifiedService.findWhere("groupId", label.id);
    }

    // 过滤出 kfSelected 对应的联系人
    if (kfSelected && kfSelected != 0) {
      data = data.filter(contact => contact.wechatAccountId === kfSelected);
    }

    dataByLabels.push({
      ...label,
      contacts: data,
    });
  }

  return dataByLabels;
};
