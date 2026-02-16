import Workspace from "@/pages/mobile/workspace/main";
import ListAutoLike from "@/pages/mobile/workspace/auto-like/list";
import NewAutoLike from "@/pages/mobile/workspace/auto-like/new";
import RecordAutoLike from "@/pages/mobile/workspace/auto-like/record";
import AutoGroupList from "@/pages/mobile/workspace/auto-group/list";
import AutoGroupDetail from "@/pages/mobile/workspace/auto-group/detail";
import AutoGroupForm from "@/pages/mobile/workspace/auto-group/form";
import GroupCreateList from "@/pages/mobile/workspace/group-create/list";
import GroupCreateForm from "@/pages/mobile/workspace/group-create/form";
import GroupCreateDetail from "@/pages/mobile/workspace/group-create/detail";
import GroupListPage from "@/pages/mobile/workspace/group-create/detail/groups-list";
import GroupDetailPage from "@/pages/mobile/workspace/group-create/detail/group-detail";
import GroupPush from "@/pages/mobile/workspace/group-push/list";
import FormGroupPush from "@/pages/mobile/workspace/group-push/form";
import DetailGroupPush from "@/pages/mobile/workspace/group-push/detail";
import MomentsSync from "@/pages/mobile/workspace/moments-sync/list";
import NewMomentsSync from "@/pages/mobile/workspace/moments-sync/new/index";
import MomentsSyncRecord from "@/pages/mobile/workspace/moments-sync/record";
import AIAssistant from "@/pages/mobile/workspace/ai-assistant/AIAssistant";
import TrafficDistribution from "@/pages/mobile/workspace/traffic-distribution/list/index";
import TrafficDistributionDetail from "@/pages/mobile/workspace/traffic-distribution/detail/index";
import NewDistribution from "@/pages/mobile/workspace/traffic-distribution/form/index";
import ContactImportList from "@/pages/mobile/workspace/contact-import/list";
import ContactImportForm from "@/pages/mobile/workspace/contact-import/form";
import ContactImportDetail from "@/pages/mobile/workspace/contact-import/detail";
import AiAnalyzer from "@/pages/mobile/workspace/ai-analyzer";
import AIKnowledgeList from "@/pages/mobile/workspace/ai-knowledge/list";
import AIKnowledgeDetail from "@/pages/mobile/workspace/ai-knowledge/detail";
import AIKnowledgeForm from "@/pages/mobile/workspace/ai-knowledge/form";
import DistributionManagement from "@/pages/mobile/workspace/distribution-management";
import ChannelDetailPage from "@/pages/mobile/workspace/distribution-management/detail";
import GroupWelcome from "@/pages/mobile/workspace/group-welcome/list";
import FormGroupWelcome from "@/pages/mobile/workspace/group-welcome/form";
import DetailGroupWelcome from "@/pages/mobile/workspace/group-welcome/detail";
import PlaceholderPage from "@/components/PlaceholderPage";

const workspaceRoutes = [
  {
    path: "/workspace",
    element: <Workspace />,
    auth: true,
  },
  // 自动点赞
  {
    path: "/workspace/auto-like",
    element: <ListAutoLike />,
    auth: true,
  },
  {
    path: "/workspace/auto-like/new",
    element: <NewAutoLike />,
    auth: true,
  },
  {
    path: "/workspace/auto-like/record/:id",
    element: <RecordAutoLike />,
    auth: true,
  },
  {
    path: "/workspace/auto-like/edit/:id",
    element: <NewAutoLike />,
    auth: true,
  },
  // 自动建群（旧版）
  {
    path: "/workspace/auto-group",
    element: <AutoGroupList />,
    auth: true,
  },
  {
    path: "/workspace/auto-group/new",
    element: <AutoGroupForm />,
    auth: true,
  },
  {
    path: "/workspace/auto-group/:id",
    element: <AutoGroupDetail />,
    auth: true,
  },
  {
    path: "/workspace/auto-group/:id/edit",
    element: <AutoGroupForm />,
    auth: true,
  },
  // 自动建群（新版）
  {
    path: "/workspace/group-create",
    element: <GroupCreateList />,
    auth: true,
  },
  {
    path: "/workspace/group-create/new",
    element: <GroupCreateForm />,
    auth: true,
  },
  {
    path: "/workspace/group-create/:id",
    element: <GroupCreateDetail />,
    auth: true,
  },
  {
    path: "/workspace/group-create/:id/groups",
    element: <GroupListPage />,
    auth: true,
  },
  {
    path: "/workspace/group-create/:id/groups/:groupId",
    element: <GroupDetailPage />,
    auth: true,
  },
  {
    path: "/workspace/group-create/:id/edit",
    element: <GroupCreateForm />,
    auth: true,
  },
  // 群发推送
  {
    path: "/workspace/group-push",
    element: <GroupPush />,
    auth: true,
  },
  {
    path: "/workspace/group-push/:id",
    element: <DetailGroupPush />,
    auth: true,
  },
  {
    path: "/workspace/group-push/new",
    element: <FormGroupPush />,
    auth: true,
  },
  {
    path: "/workspace/group-push/edit/:id",
    element: <FormGroupPush />,
    auth: true,
  },
  // 朋友圈同步
  {
    path: "/workspace/moments-sync",
    element: <MomentsSync />,
    auth: true,
  },
  {
    path: "/workspace/moments-sync/new",
    element: <NewMomentsSync />,
    auth: true,
  },

  {
    path: "/workspace/moments-sync/record/:id",
    element: <MomentsSyncRecord />,
    auth: true,
  },
  {
    path: "/workspace/moments-sync/edit/:id",
    element: <NewMomentsSync />,
    auth: true,
  },
  // AI助手
  {
    path: "/workspace/ai-assistant",
    element: <AIAssistant />,
    auth: true,
  },
  // AI数据分析
  {
    path: "/workspace/ai-analyzer",
    element: <AiAnalyzer />,
    auth: true,
  },
  // AI策略优化
  {
    path: "/workspace/ai-strategy",
    element: <PlaceholderPage title="AI策略优化" />,
    auth: true,
  },
  // AI销售预测
  {
    path: "/workspace/ai-forecast",
    element: <PlaceholderPage title="AI销售预测" />,
    auth: true,
  },
  // 流量分发
  {
    path: "/workspace/traffic-distribution",
    element: <TrafficDistribution />,
    auth: true,
  },
  {
    path: "/workspace/traffic-distribution/new",
    element: <NewDistribution />,
    auth: true,
  },
  {
    path: "/workspace/traffic-distribution/edit/:id",
    element: <NewDistribution />,
    auth: true,
  },
  {
    path: "/workspace/traffic-distribution/:id",
    element: <TrafficDistributionDetail />,
    auth: true,
  },
  // 通讯录导入
  {
    path: "/workspace/contact-import/list",
    element: <ContactImportList />,
    auth: true,
  },
  {
    path: "/workspace/contact-import/form",
    element: <ContactImportForm />,
    auth: true,
  },
  {
    path: "/workspace/contact-import/form/:id",
    element: <ContactImportForm />,
    auth: true,
  },
  {
    path: "/workspace/contact-import/detail/:id",
    element: <ContactImportDetail />,
    auth: true,
  },
  // AI知识库
  {
    path: "/workspace/ai-knowledge",
    element: <AIKnowledgeList />,
    auth: true,
  },
  {
    path: "/workspace/ai-knowledge/new",
    element: <AIKnowledgeForm />,
    auth: true,
  },
  {
    path: "/workspace/ai-knowledge/:id",
    element: <AIKnowledgeDetail />,
    auth: true,
  },
  {
    path: "/workspace/ai-knowledge/:id/edit",
    element: <AIKnowledgeForm />,
    auth: true,
  },
  // 分销管理
  {
    path: "/workspace/distribution-management",
    element: <DistributionManagement />,
    auth: true,
  },
  {
    path: "/workspace/distribution-management/:id",
    element: <ChannelDetailPage />,
    auth: true,
  },
  // 入群欢迎语
  {
    path: "/workspace/group-welcome",
    element: <GroupWelcome />,
    auth: true,
  },
  {
    path: "/workspace/group-welcome/new",
    element: <FormGroupWelcome />,
    auth: true,
  },
  {
    path: "/workspace/group-welcome/:id",
    element: <DetailGroupWelcome />,
    auth: true,
  },
  {
    path: "/workspace/group-welcome/edit/:id",
    element: <FormGroupWelcome />,
    auth: true,
  },
];

export default workspaceRoutes;
