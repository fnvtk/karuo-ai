import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toast } from "antd-mobile";
import { PlusOutlined, RiseOutlined } from "@ant-design/icons";
import MeauMobile from "@/components/MeauMobile/MeauMoible";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import { getScenarios } from "./api";
import style from "./index.module.scss";

interface Scenario {
  id: string;
  name: string;
  image: string;
  description?: string;
  count: number;
  growth: string;
  status: number;
}

const Scene: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchScenarios = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getScenarios({ page: 1, limit: 20 });
        const transformedScenarios: Scenario[] = response.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          image:
            item.image ||
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-api.png",
          description: "",
          count: item.count,
          growth: item.growth,
          status: item.status,
        }));
        setScenarios(transformedScenarios);
      } catch (error) {
        setError("获取场景数据失败，请稍后重试");
        Toast.show({
          content: "获取场景数据失败，请稍后重试",
          position: "top",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchScenarios();
  }, []);

  const handleScenarioClick = (scenarioId: string, scenarioName: string) => {
    navigate(
      `/scenarios/list/${scenarioId}/${encodeURIComponent(scenarioName)}`,
    );
  };

  const handleNewPlan = () => {
    navigate("/scenarios/new");
  };

  if (error && scenarios.length === 0) {
    return (
      <Layout
        header={
          <NavCommon
            left={<></>}
            title="场景获客"
            right={
              <Button size="small" color="primary" onClick={handleNewPlan}>
                <PlusOutlined /> 新建计划
              </Button>
            }
          />
        }
        footer={<MeauMobile activeKey="scenarios" />}
      >
        <div className={style["error"]}>
          <div className={style["error-text"]}>{error}</div>
          <Button color="primary" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      loading={loading}
      header={
        <NavCommon
          left={<div className="nav-title">场景获客</div>}
          title={""}
          right={
            <Button
              size="small"
              color="primary"
              onClick={handleNewPlan}
              className="new-plan-btn"
            >
              <PlusOutlined /> 新建计划
            </Button>
          }
        />
      }
      footer={<MeauMobile activeKey="scenarios" />}
    >
      <div className={style["scene-page"]}>
        <div className={style["scenarios-grid"]}>
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              className={style["scenario-card"]}
              onClick={() => handleScenarioClick(scenario.id, scenario.name)}
            >
              <div className={style["card-inner"]}>
                <div className={style["card-img-wrap"]}>
                  <div className={style["card-img-bg"]}>
                    <img
                      src={scenario.image}
                      alt={scenario.name}
                      className={style["card-img"]}
                      onError={e => {
                        e.currentTarget.src =
                          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-api.png";
                      }}
                    />
                  </div>
                </div>
                <div className={style["card-title"]}>{scenario.name}</div>

                <div className={style["card-stats"]}>
                  <span className={style["card-count"]}>
                    今日: {scenario.count}
                  </span>
                  <span className={style["card-growth"]}>
                    <RiseOutlined
                      style={{ fontSize: 14, color: "#52c41a", marginRight: 2 }}
                    />
                    {scenario.growth}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Scene;
