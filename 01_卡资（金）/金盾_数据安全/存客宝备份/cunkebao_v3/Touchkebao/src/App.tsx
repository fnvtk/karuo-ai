import React from "react";
import * as Sentry from "@sentry/react";
import AppRouter from "@/router";
import UpdateNotification from "@/components/UpdateNotification";

const ErrorFallback = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(circle at top, #e0f2fe 0, #f9fafb 45%, #f1f5f9 100%)",
      color: "#0f172a",
      fontFamily:
        "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    }}
  >
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 20px 45px rgba(15,23,42,0.18)",
        borderRadius: 16,
        padding: "32px 40px",
        maxWidth: 480,
        width: "90%",
        textAlign: "center",
        border: "1px solid rgba(148,163,184,0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "999px",
          background: "rgba(248, 113, 113, 0.06)",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 30,
            lineHeight: 1,
            color: "#f97373",
          }}
        >
          !
        </span>
      </div>
      <h2
        style={{
          fontSize: 20,
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        出现了一点小问题
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#64748b",
          marginBottom: 24,
        }}
      >
        我们已经自动记录了这个错误，工程师正在紧急排查中。你可以尝试刷新页面重新进入。
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "8px 20px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background:
            "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4f46e5 100%)",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 500,
          boxShadow: "0 12px 25px rgba(37,99,235,0.35)",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        }}
        onMouseOver={e => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(-1px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 16px 30px rgba(37,99,235,0.4)";
        }}
        onMouseOut={e => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 12px 25px rgba(37,99,235,0.35)";
        }}
      >
        刷新页面
      </button>
    </div>
  </div>
);

function App() {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      <AppRouter />
      <UpdateNotification position="top" autoReload={false} showToast={true} />
    </Sentry.ErrorBoundary>
  );
}

export default App;
