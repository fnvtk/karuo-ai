import CkboxPage from "@/pages/pc/ckbox";
import WeChatPage from "@/pages/pc/ckbox/weChat";
import Dashboard from "@/pages/pc/ckbox/dashboard";
import PowerCenter from "@/pages/pc/ckbox/powerCenter";
import CustomerManagement from "@/pages/pc/ckbox/powerCenter/customer-management";
import CommunicationRecord from "@/pages/pc/ckbox/powerCenter/communication-record";
import ContentManagement from "@/pages/pc/ckbox/powerCenter/content-management/index";
import AiTraining from "@/pages/pc/ckbox/powerCenter/ai-training";
import AutoGreeting from "@/pages/pc/ckbox/powerCenter/auto-greeting";
import MessagePushAssistant from "@/pages/pc/ckbox/powerCenter/message-push-assistant";
import CreatePushTask from "@/pages/pc/ckbox/powerCenter/message-push-assistant/create-push-task";
import DataStatistics from "@/pages/pc/ckbox/powerCenter/data-statistics";
import PushHistory from "@/pages/pc/ckbox/powerCenter/push-history";
import CommonConfig from "@/pages/pc/ckbox/commonConfig";
const ckboxRoutes = [
  {
    path: "/pc",
    element: <CkboxPage />,
    auth: true,
    children: [
      {
        path: "commonConfig",
        element: <CommonConfig />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "weChat",
        element: <WeChatPage />,
      },
      {
        path: "powerCenter",
        element: <PowerCenter />,
      },
      {
        path: "powerCenter/customer-management",
        element: <CustomerManagement />,
      },
      {
        path: "powerCenter/communication-record",
        element: <CommunicationRecord />,
      },
      {
        path: "powerCenter/content-management",
        element: <ContentManagement />,
      },
      {
        path: "powerCenter/ai-training",
        element: <AiTraining />,
      },
      {
        path: "powerCenter/auto-greeting",
        element: <AutoGreeting />,
      },
      {
        path: "powerCenter/message-push-assistant",
        element: <MessagePushAssistant />,
      },
      {
        path: "powerCenter/message-push-assistant/create-push-task/:pushType",
        element: <CreatePushTask />,
      },
      {
        path: "powerCenter/data-statistics",
        element: <DataStatistics />,
      },
      {
        path: "powerCenter/push-history",
        element: <PushHistory />,
      },
    ],
  },
];

export default ckboxRoutes;
