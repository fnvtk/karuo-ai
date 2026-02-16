import Login from "@/pages/login/Login";
import Guide from "@/pages/guide";

const authRoutes = [
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
