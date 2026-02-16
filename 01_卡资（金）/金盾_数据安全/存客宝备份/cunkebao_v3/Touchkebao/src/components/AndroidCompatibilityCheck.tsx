import React, { useEffect, useState } from "react";

interface AndroidCompatibilityInfo {
  isAndroid: boolean;
  androidVersion: number;
  chromeVersion: number;
  webViewVersion: number;
  issues: string[];
  suggestions: string[];
}

const AndroidCompatibilityCheck: React.FC = () => {
  const [compatibility, setCompatibility] = useState<AndroidCompatibilityInfo>({
    isAndroid: false,
    androidVersion: 0,
    chromeVersion: 0,
    webViewVersion: 0,
    issues: [],
    suggestions: [],
  });

  useEffect(() => {
    const checkAndroidCompatibility = () => {
      const ua = navigator.userAgent;
      const issues: string[] = [];
      const suggestions: string[] = [];
      let isAndroid = false;
      let androidVersion = 0;
      let chromeVersion = 0;
      let webViewVersion = 0;

      // 检测Android系统
      if (ua.indexOf("Android") > -1) {
        isAndroid = true;
        const androidMatch = ua.match(/Android\s+(\d+)/);
        if (androidMatch) {
          androidVersion = parseInt(androidMatch[1]);
        }

        // 检测Chrome版本
        const chromeMatch = ua.match(/Chrome\/(\d+)/);
        if (chromeMatch) {
          chromeVersion = parseInt(chromeMatch[1]);
        }

        // 检测WebView版本
        const webViewMatch = ua.match(/Version\/\d+\.\d+/);
        if (webViewMatch) {
          const versionMatch = webViewMatch[0].match(/\d+/);
          if (versionMatch) {
            webViewVersion = parseInt(versionMatch[0]);
          }
        }

        // Android 7 (API 24) 兼容性检查
        if (androidVersion === 7) {
          issues.push("Android 7 系统对ES6+特性支持不完整");
          suggestions.push("建议升级到Android 8+或使用最新版Chrome");
        }

        // Android 6 (API 23) 兼容性检查
        if (androidVersion === 6) {
          issues.push("Android 6 系统对现代Web特性支持有限");
          suggestions.push("强烈建议升级系统或使用最新版Chrome");
        }

        // Chrome版本检查
        if (chromeVersion > 0 && chromeVersion < 50) {
          issues.push(`Chrome版本过低 (${chromeVersion})，建议升级到50+`);
          suggestions.push("请在Google Play商店更新Chrome浏览器");
        }

        // WebView版本检查
        if (webViewVersion > 0 && webViewVersion < 50) {
          issues.push(`WebView版本过低 (${webViewVersion})，可能影响应用功能`);
          suggestions.push("建议使用Chrome浏览器或更新系统WebView");
        }

        // 检测特定问题
        const features = {
          Promise: typeof Promise !== "undefined",
          fetch: typeof fetch !== "undefined",
          "Array.from": typeof Array.from !== "undefined",
          "Object.assign": typeof Object.assign !== "undefined",
          "String.includes": typeof String.prototype.includes !== "undefined",
          "Array.includes": typeof Array.prototype.includes !== "undefined",
          requestAnimationFrame: typeof requestAnimationFrame !== "undefined",
          IntersectionObserver: typeof IntersectionObserver !== "undefined",
          ResizeObserver: typeof ResizeObserver !== "undefined",
          URLSearchParams: typeof URLSearchParams !== "undefined",
          TextEncoder: typeof TextEncoder !== "undefined",
          AbortController: typeof AbortController !== "undefined",
        };

        Object.entries(features).forEach(([feature, supported]) => {
          if (!supported) {
            issues.push(`${feature} 特性不支持`);
          }
        });

        // 微信内置浏览器检测
        if (ua.indexOf("MicroMessenger") > -1) {
          issues.push("微信内置浏览器对某些Web特性支持有限");
          suggestions.push("建议在系统浏览器中打开以获得最佳体验");
        }

        // QQ内置浏览器检测
        if (ua.indexOf("QQ/") > -1) {
          issues.push("QQ内置浏览器对某些Web特性支持有限");
          suggestions.push("建议在系统浏览器中打开以获得最佳体验");
        }
      }

      setCompatibility({
        isAndroid,
        androidVersion,
        chromeVersion,
        webViewVersion,
        issues,
        suggestions,
      });
    };

    checkAndroidCompatibility();
  }, []);

  if (!compatibility.isAndroid || compatibility.issues.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff3cd",
        border: "1px solid #ffeaa7",
        padding: "15px",
        zIndex: 9999,
        textAlign: "center",
        fontSize: "14px",
        maxHeight: "50vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{ fontWeight: "bold", marginBottom: "10px", color: "#856404" }}
      >
        🚨 Android 兼容性警告
      </div>

      <div style={{ marginBottom: "8px", fontSize: "12px" }}>
        系统版本: Android {compatibility.androidVersion}
        {compatibility.chromeVersion > 0 &&
          ` | Chrome: ${compatibility.chromeVersion}`}
        {compatibility.webViewVersion > 0 &&
          ` | WebView: ${compatibility.webViewVersion}`}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <div
          style={{ fontWeight: "bold", marginBottom: "5px", color: "#856404" }}
        >
          检测到的问题:
        </div>
        <div style={{ color: "#856404", fontSize: "12px" }}>
          {compatibility.issues.map((issue, index) => (
            <div key={index} style={{ marginBottom: "3px" }}>
              • {issue}
            </div>
          ))}
        </div>
      </div>

      {compatibility.suggestions.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "5px",
              color: "#155724",
            }}
          >
            建议解决方案:
          </div>
          <div style={{ color: "#155724", fontSize: "12px" }}>
            {compatibility.suggestions.map((suggestion, index) => (
              <div key={index} style={{ marginBottom: "3px" }}>
                • {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: "11px", color: "#6c757d", marginTop: "10px" }}>
        💡 应用已启用兼容模式，但建议升级系统以获得最佳体验
      </div>

      <button
        onClick={() => {
          const element = document.querySelector(
            '[style*="position: fixed"][style*="top: 0"]',
          ) as HTMLElement;
          if (element) {
            element.style.display = "none";
          }
        }}
        style={{
          position: "absolute",
          top: "5px",
          right: "10px",
          background: "none",
          border: "none",
          fontSize: "18px",
          cursor: "pointer",
          color: "#856404",
        }}
      >
        ×
      </button>
    </div>
  );
};

export default AndroidCompatibilityCheck;
