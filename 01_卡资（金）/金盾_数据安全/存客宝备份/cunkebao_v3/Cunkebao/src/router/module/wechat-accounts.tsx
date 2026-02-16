import WechatAccounts from "@/pages/mobile/mine/wechat-accounts/list";
import WechatAccountDetail from "@/pages/mobile/mine/wechat-accounts/detail";

const wechatAccountRoutes = [
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
];

export default wechatAccountRoutes;
