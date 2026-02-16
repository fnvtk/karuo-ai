import React, { useEffect, useState } from "react";

interface CompatibilityInfo {
  isCompatible: boolean;
  browser: string;
  version: string;
  issues: string[];
}

const CompatibilityCheck: React.FC = () => {
  const [compatibility, setCompatibility] = useState<CompatibilityInfo>({
    isCompatible: true,
    browser: "",
    version: "",
    issues: [],
  });

  useEffect(() => {
    const checkCompatibility = () => {
      const ua = navigator.userAgent;
      const issues: string[] = [];
      let browser = "Unknown";
      let version = "Unknown";

      // 检测浏览器类型和版本
      if (ua.indexOf("Chrome") > -1) {
        browser = "Chrome";
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : "Unknown";
        if (parseInt(version) < 50) {
          issues.push("Chrome版本过低，建议升级到50+");
        }
      } else if (ua.indexOf("Firefox") > -1) {
        browser = "Firefox";
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : "Unknown";
        if (parseInt(version) < 50) {
          issues.push("Firefox版本过低，建议升级到50+");
        }
      } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
        browser = "Safari";
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : "Unknown";
        if (parseInt(version) < 10) {
          issues.push("Safari版本过低，建议升级到10+");
        }
      } else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) {
        browser = "Internet Explorer";
        const match = ua.match(/(?:MSIE |rv:)(\d+)/);
        version = match ? match[1] : "Unknown";
        issues.push("Internet Explorer不受支持，建议使用现代浏览器");
      } else if (ua.indexOf("Edge") > -1) {
        browser = "Edge";
        const match = ua.match(/Edge\/(\d+)/);
        version = match ? match[1] : "Unknown";
        if (parseInt(version) < 12) {
          issues.push("Edge版本过低，建议升级到12+");
        }
      }

      // 检测ES6+特性支持
      const features = {
        Promise: typeof Promise !== "undefined",
        fetch: typeof fetch !== "undefined",
        "Array.from": typeof Array.from !== "undefined",
        "Object.assign": typeof Object.assign !== "undefined",
        "String.includes": typeof String.prototype.includes !== "undefined",
        "Array.includes": typeof Array.prototype.includes !== "undefined",
      };

      Object.entries(features).forEach(([feature, supported]) => {
        if (!supported) {
          issues.push(`${feature} 特性不支持`);
        }
      });

      setCompatibility({
        isCompatible: issues.length === 0,
        browser,
        version,
        issues,
      });
    };

    checkCompatibility();
  }, []);

  if (compatibility.isCompatible) {
    return null; // 兼容时不需要显示
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
        padding: "10px",
        zIndex: 9999,
        textAlign: "center",
        fontSize: "14px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
        浏览器兼容性警告
      </div>
      <div style={{ marginBottom: "5px" }}>
        当前浏览器: {compatibility.browser} {compatibility.version}
      </div>
      <div style={{ color: "#856404" }}>
        {compatibility.issues.map((issue, index) => (
          <div key={index}>{issue}</div>
        ))}
      </div>
      <div style={{ marginTop: "10px", fontSize: "12px" }}>
        建议使用 Chrome 50+、Firefox 50+、Safari 10+ 或 Edge 12+
      </div>
    </div>
  );
};

export default CompatibilityCheck;
