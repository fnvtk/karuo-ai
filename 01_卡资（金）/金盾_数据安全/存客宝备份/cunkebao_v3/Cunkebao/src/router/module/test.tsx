import SelectTest from "@/pages/mobile/test/select";
import TestIndex from "@/pages/mobile/test/index";
import UploadTest from "@/pages/mobile/test/upload";
import UpdateNotificationTest from "@/pages/mobile/test/update-notification";
import IframeDebugPage from "@/pages/iframe";
import { DEV_FEATURES } from "@/utils/env";

// 只在开发环境启用测试路由
const componentTestRoutes = DEV_FEATURES.SHOW_TEST_PAGES
  ? [
      {
        path: "/test",
        element: <TestIndex />,
        auth: true,
      },
      {
        path: "/test/select",
        element: <SelectTest />,
        auth: true,
      },
      {
        path: "/test/upload",
        element: <UploadTest />,
        auth: true,
      },
      {
        path: "/test/update-notification",
        element: <UpdateNotificationTest />,
        auth: true,
      },
      {
        path: "/test/iframe",
        element: <IframeDebugPage />,
        auth: false, // 不需要认证，方便调试
      },
    ]
  : [];

export default componentTestRoutes;
