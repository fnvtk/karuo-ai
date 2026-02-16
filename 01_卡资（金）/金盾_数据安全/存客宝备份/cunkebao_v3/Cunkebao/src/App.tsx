import React from "react";
import AppRouter from "@/router";
import UpdateNotification from "@/components/UpdateNotification";

function App() {
  return (
    <>
      <AppRouter />
      <UpdateNotification position="top" autoReload={false} showToast={true} />
    </>
  );
}

export default App;
