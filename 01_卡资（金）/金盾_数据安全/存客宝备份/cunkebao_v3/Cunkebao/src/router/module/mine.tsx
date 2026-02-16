import Mine from "@/pages/mobile/mine/main/index";
import Devices from "@/pages/mobile/mine/devices/index";
import DeviceDetail from "@/pages/mobile/mine/devices/DeviceDetail";
import TrafficPool from "@/pages/mobile/mine/traffic-pool/list/index";
import TrafficPool2 from "@/pages/mobile/mine/traffic-pool/poolList1/index";
import TrafficPoolUserList from "@/pages/mobile/mine/traffic-pool/userList/index";
import CreateTrafficPackage from "@/pages/mobile/mine/traffic-pool/form/index";
import WechatAccounts from "@/pages/mobile/mine/wechat-accounts/list/index";
import WechatAccountDetail from "@/pages/mobile/mine/wechat-accounts/detail/index";
import Recharge from "@/pages/mobile/mine/recharge/index";
import RechargeOrder from "@/pages/mobile/mine/recharge/order/index";
import RechargeOrderDetail from "@/pages/mobile/mine/recharge/order/detail";
import BuyPower from "@/pages/mobile/mine/recharge/buy-power";
import UsageRecords from "@/pages/mobile/mine/recharge/usage-records";
import Setting from "@/pages/mobile/mine/setting/index";
import SecuritySetting from "@/pages/mobile/mine/setting/SecuritySetting";
import About from "@/pages/mobile/mine/setting/About";
import Privacy from "@/pages/mobile/mine/setting/Privacy";
import UserSetting from "@/pages/mobile/mine/setting/UserSetting";
const routes = [
  {
    path: "/mine",
    element: <Mine />,
    auth: true,
  },
  {
    path: "/mine/devices",
    element: <Devices />,
    auth: true,
  },
  {
    path: "/mine/devices/:id",
    element: <DeviceDetail />,
    auth: true,
  },
  //流量池列表页面
  {
    path: "/mine/traffic-pool",
    element: <TrafficPool />,
    auth: true,
  },
  {
    path: "/mine/traffic-pool/list2",
    element: <TrafficPool2 />,
    auth: true,
  },
  //新建流量包页面
  {
    path: "/mine/traffic-pool/create",
    element: <CreateTrafficPackage />,
    auth: true,
  },
  {
    path: "/mine/traffic-pool/userList/:id",
    element: <TrafficPoolUserList />,
    auth: true,
  },

  // 微信号管理路由
  {
    path: "/wechat-accounts",
    element: <WechatAccounts />,
    auth: true,
  },
  {
    path: "/wechat-accounts/detail/:id",
    element: <WechatAccountDetail />,
    auth: true,
  },
  {
    path: "/recharge",
    element: <Recharge />,
    auth: true,
  },
  {
    path: "/recharge/order",
    element: <RechargeOrder />,
    auth: true,
  },
  {
    path: "/recharge/order/:id",
    element: <RechargeOrderDetail />,
    auth: true,
  },
  {
    path: "/recharge/buy-power",
    element: <BuyPower />,
    auth: true,
  },
  {
    path: "/recharge/usage-records",
    element: <UsageRecords />,
    auth: true,
  },
  {
    path: "/settings",
    element: <Setting />,
    auth: true,
  },
  {
    path: "/security",
    element: <SecuritySetting />,
    auth: true,
  },
  {
    path: "/about",
    element: <About />,
    auth: true,
  },
  {
    path: "/privacy",
    element: <Privacy />,
    auth: true,
  },
  {
    path: "/userSet",
    element: <UserSetting />,
    auth: true,
  },
];

export default routes;
