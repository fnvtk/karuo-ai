import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Customer, CustomerState } from "./customer.data";
export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customerList: [], //客服列表
      currentCustomer: null, //当前选中的客服
      updateCustomerList: (customerList: Customer[]) => set({ customerList }), //更新客服列表
      updateCurrentCustomer: (customer: Customer) =>
        set({ currentCustomer: customer }), //更新当前选中的客服
      updateCustomerStatus: (customerId: number, status: string) =>
        set({
          customerList: get().customerList.map(customer =>
            customer.id === customerId ? { ...customer, status } : customer,
          ),
        }), //更新客服状态
    }),
    {
      name: "customer-storage",
      partialize: state => ({
        customerList: [],
        currentCustomer: null,
      }),
    },
  ),
);
/**
 * 更新当前选中的客服
 * @param customer 客服
 * @returns void
 */
export const updateCurrentCustomer = (customer: Customer) =>
  useCustomerStore.getState().updateCurrentCustomer(customer);
/**
 * 更新客服列表
 * @param customerList 客服列表
 * @returns void
 */
export const updateCustomerList = (customerList: Customer[]) =>
  useCustomerStore.getState().updateCustomerList(customerList);
/**
 * 获取当前选中的客服
 * @returns Customer | null
 */
export const getCurrentCustomer = () =>
  useCustomerStore.getState().currentCustomer;

/**
 * 更新客服状态
 * @param customerId 客服ID
 * @param status 状态
 * @returns void
 */
export const updateCustomerStatus = (customerId: number, status: string) =>
  useCustomerStore.getState().updateCustomerStatus(customerId, status);
