import Home from "@/pages/mobile/home/index";
import Init from "@/pages/iframe/init";

const routes = [
  // 基础路由
  {
    path: "/",
    element: <Home />,
    auth: true, // 需要登录
  },
  {
    path: "/init",
    element: <Init />,
    auth: false, // 需要登录
  },
];

export default routes;
