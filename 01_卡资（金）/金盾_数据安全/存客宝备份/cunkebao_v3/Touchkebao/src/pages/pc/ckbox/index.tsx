import React from "react";
import Layout from "@/components/Layout/Layout";
import { Outlet } from "react-router-dom";
import NavCommon from "./components/NavCommon";
const CkboxPage: React.FC = () => {
  return (
    <Layout header={<NavCommon title="触客宝" />}>
      <Outlet />
    </Layout>
  );
};

export default CkboxPage;
