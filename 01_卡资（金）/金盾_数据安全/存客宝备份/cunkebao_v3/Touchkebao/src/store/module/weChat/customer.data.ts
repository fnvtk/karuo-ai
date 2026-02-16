export interface Customer {
  id: number;
  tenantId: number;
  wechatId: string;
  nickname: string;
  alias: string;
  avatar: string;
  gender: number;
  region: string;
  signature: string;
  bindQQ: string;
  bindEmail: string;
  bindMobile: string;
  createTime: string;
  currentDeviceId: number;
  isDeleted: boolean;
  deleteTime: string;
  groupId: number;
  memo: string;
  wechatVersion: string;
  labels: string[];
  lastUpdateTime: string;
  isOnline?: boolean;
  momentsMax: number;
  momentsNum: number;
  [key: string]: any;
}

//Store State
export interface CustomerState {
  //客服列表
  customerList: Customer[];
  //当前选中的客服
  currentCustomer: Customer | null;
  //更新客服列表
  updateCustomerList: (customerList: Customer[]) => void;
  //更新客服状态
  updateCustomerStatus: (customerId: number, status: string) => void;
  //更新当前选中的客服
  updateCurrentCustomer: (customer: Customer) => void;
}
