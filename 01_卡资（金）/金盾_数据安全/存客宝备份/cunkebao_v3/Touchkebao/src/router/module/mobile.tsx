import UserSetting from "@/pages/mobile/Profile/Profile";
const routes = [
  {
    path: "/profile",
    element: <UserSetting />,
    auth: true,
  },
];

export default routes;
