import Login from "@/pages/login/Login";
import Guide from "@/pages/guide";
import Init from "@/pages/iframe/init";
import Index from "@/pages/index";
const authRoutes = [
  {
    path: "/",
    element: <Index />,
    auth: false, // 需要登录
  },
  {
    path: "/init",
    element: <Init />,
    auth: false, // 需要登录
  },
  {
    path: "/login",
    element: <Login />,
    auth: false, // 不需要权限
  },
  {
    path: "/guide",
    element: <Guide />,
    auth: true, // 需要登录权限
  },
];

export default authRoutes;
