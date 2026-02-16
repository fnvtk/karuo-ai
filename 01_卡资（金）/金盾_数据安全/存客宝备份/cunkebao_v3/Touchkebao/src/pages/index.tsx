import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";

const IndexPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 检测是否为移动端
    const isMobile = () => {
      const userAgent = navigator.userAgent;
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      return mobileRegex.test(userAgent) || window.innerWidth <= 768;
    };

    // 如果是移动端，跳转到/pc/dashboard
    if (isMobile()) {
      navigate("/mobile/dashboard");
    } else {
      navigate("/pc/weChat");
    }
  }, [navigate]);

  return (
    <Layout>
      <div>
        <h1>首页</h1>
      </div>
    </Layout>
  );
};

export default IndexPage;
