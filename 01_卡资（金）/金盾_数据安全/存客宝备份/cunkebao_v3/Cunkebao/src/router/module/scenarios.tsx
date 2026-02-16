import ScenariosList from "@/pages/mobile/scenarios/list";
import NewPlan from "@/pages/mobile/scenarios/plan/new";
import ListPlan from "@/pages/mobile/scenarios/plan/list";

const scenarioRoutes = [
  {
    path: "/scenarios",
    element: <ScenariosList />,
    auth: true,
  },
  {
    path: "/scenarios/new",
    element: <NewPlan />,
    auth: true,
  },
  {
    path: "/scenarios/new/:scenarioId",
    element: <NewPlan />,
    auth: true,
  },
  {
    path: "/scenarios/edit/:planId",
    element: <NewPlan />,
    auth: true,
  },
  {
    path: "/scenarios/list/:scenarioId/:scenarioName",
    element: <ListPlan />,
    auth: true,
  },
];

export default scenarioRoutes;
