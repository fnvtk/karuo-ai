import ContentLibraryList from "@/pages/mobile/mine/content/list/index";
import ContentLibraryForm from "@/pages/mobile/mine/content/form/index";
import MaterialsList from "@/pages/mobile/mine/content/materials/list/index";
import MaterialForm from "@/pages/mobile/mine/content/materials/form/index";

const contentRoutes = [
  {
    path: "/mine/content",
    element: <ContentLibraryList />,
    auth: true,
  },
  {
    path: "/mine/content/new",
    element: <ContentLibraryForm />,
    auth: true,
  },
  {
    path: "/mine/content/edit/:id",
    element: <ContentLibraryForm />,
    auth: true,
  },
  {
    path: "/mine/content/materials/:id",
    element: <MaterialsList />,
    auth: true,
  },
  {
    path: "/mine/content/materials/new/:id",
    element: <MaterialForm />,
    auth: true,
  },
  {
    path: "/mine/content/materials/edit/:id/:materialId",
    element: <MaterialForm />,
    auth: true,
  },
];

export default contentRoutes;
