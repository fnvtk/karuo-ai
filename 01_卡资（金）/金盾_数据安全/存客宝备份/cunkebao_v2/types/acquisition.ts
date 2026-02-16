export interface AcquisitionPlan {
  id: string
  name: string
  type: string
  reward: {
    type: "disabled" | "onSubmit" | "onApprove"
    amount: number
  }
  workers: Worker[]
  webUrl?: string
  miniappUrl?: string
}

export interface Worker {
  id: string
  name: string
  avatar?: string
}

export interface OrderFormData {
  customerName: string
  phone: string
  wechatId: string
  source: string
  amount?: number
  orderDate: string
  remark: string
}
