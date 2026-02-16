import React, { useState, useMemo } from "react";
import { Popup, Button, Toast, SpinLoading } from "antd-mobile";
import { Modal, Input, Tabs, Card, Tag, Space } from "antd";
import {
  CopyOutlined,
  CodeOutlined,
  BookOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  LinkOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import style from "./planApi.module.scss";
import { buildApiUrl } from "@/utils/apiUrl";

/**
 * 计划接口配置弹窗组件
 *
 * 使用示例:
 * ```tsx
 * const [showApiDialog, setShowApiDialog] = useState(false);
 * const [apiSettings, setApiSettings] = useState({
 *   apiKey: "your-api-key",
 *   webhookUrl: "https://api.example.com/webhook",
 *   taskId: "task-123"
 * });
 *
 * <PlanApi
 *   visible={showApiDialog}
 *   onClose={() => setShowApiDialog(false)}
 *   apiKey={apiSettings.apiKey}
 *   webhookUrl={apiSettings.webhookUrl}
 *   taskId={apiSettings.taskId}
 * />
 * ```
 *
 * 特性:
 * - 移动端使用 Popup，PC端使用 Modal
 * - 支持四个标签页：接口配置、快速测试、开发文档、代码示例
 * - 支持多种编程语言的代码示例
 * - 响应式设计，自适应不同屏幕尺寸
 * - 支持暗色主题
 * - 自动拼接API地址前缀
 */

interface PlanApiProps {
  visible: boolean;
  onClose: () => void;
  apiKey: string;
  webhookUrl: string;
  taskId: string;
}

interface ApiSettings {
  apiKey: string;
  webhookUrl: string;
  taskId: string;
}

const PlanApi: React.FC<PlanApiProps> = ({
  visible,
  onClose,
  apiKey,
  webhookUrl,
  taskId,
}) => {
  const [activeTab, setActiveTab] = useState("config");
  const [activeLanguage, setActiveLanguage] = useState("javascript");

  // 处理webhook URL，确保包含完整的API地址
  const fullWebhookUrl = useMemo(() => {
    return buildApiUrl('');
  }, [webhookUrl]);

  // 快速测试使用的 GET 地址（携带示例查询参数，方便在浏览器中直接访问）
  const testUrl = useMemo(() => {
    return buildApiUrl(webhookUrl);
  }, [webhookUrl]);

  // 检测是否为移动端
  const isMobile = window.innerWidth <= 768;

  const handleCopy = (text: string, type: string) => {
    // 先尝试使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          Toast.show({
            content: `${type}已复制到剪贴板`,
            position: "top",
          });
        })
        .catch(() => {
          // 回退到传统的 textarea 复制方式
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
            Toast.show({
              content: `${type}已复制到剪贴板`,
              position: "top",
            });
          } catch {
            Toast.show({
              content: `${type}复制失败，请手动复制`,
              position: "top",
            });
          }
          document.body.removeChild(textarea);
        });
    } else {
      // 不支持 Clipboard API 时直接使用回退方案
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        Toast.show({
          content: `${type}已复制到剪贴板`,
          position: "top",
        });
      } catch {
        Toast.show({
          content: `${type}复制失败，请手动复制`,
          position: "top",
        });
      }
      document.body.removeChild(textarea);
    }
  };

  const handleTestInBrowser = () => {
    window.open(testUrl, "_blank");
  };

  const renderConfigTab = () => (
    <div className={style["config-content"]}>
      {/* 鉴权参数配置 */}
      <div className={style["config-section"]}>
        <div className={style["section-header"]}>
          <div className={style["section-title"]}>
            <CheckCircleOutlined className={style["section-icon"]} />
            API密钥
          </div>
          <Tag color="green">安全认证</Tag>
        </div>
        <div className={style["input-group"]}>
          <Input value={apiKey} disabled className={style["api-input"]} />
          <Button
            size="small"
            onClick={() => handleCopy(apiKey, "API密钥")}
            className={style["copy-btn"]}
          >
            <CopyOutlined />
            复制
          </Button>
        </div>
        <div className={style["security-tip"]}>
          <strong>安全提示：</strong>
          请妥善保管API密钥，不要在客户端代码中暴露。建议在服务器端使用该密钥。
        </div>
      </div>

      {/* 接口地址与参数说明 */}
      <div className={style["config-section"]}>
        <div className={style["section-header"]}>
          <div className={style["section-title"]}>
            <LinkOutlined className={style["section-icon"]} />
            接口地址
          </div>
          <Tag color="blue">POST请求</Tag>
        </div>
        <div className={style["input-group"]}>
          <Input
            value={fullWebhookUrl}
            disabled
            className={style["api-input"]}
          />
          <Button
            size="small"
            onClick={() => handleCopy(fullWebhookUrl, "接口地址")}
            className={style["copy-btn"]}
          >
            <CopyOutlined />
            复制
          </Button>
        </div>

        {/* 参数说明 */}
        <div className={style["params-grid"]}>
          <div className={style["param-section"]}>
            <h4>鉴权参数（必填）</h4>
            <div className={style["param-list"]}>
              <div>
                <code>apiKey</code> - 分配给第三方的接口密钥（每个任务唯一）
              </div>
              <div>
                <code>sign</code> - 签名值，按文档的签名规则生成
              </div>
              <div>
                <code>timestamp</code> - 秒级时间戳（与服务器时间差不超过 5 分钟）
              </div>
            </div>
          </div>
          <div className={style["param-section"]}>
            <h4>业务参数</h4>
            <div className={style["param-list"]}>
              <div>
                <code>wechatId</code> - 微信号，存在时优先作为主标识
              </div>
              <div>
                <code>phone</code> - 手机号，当 <code>wechatId</code> 为空时用作主标识
              </div>
              <div>
                <code>name</code> - 客户姓名
              </div>
              <div>
                <code>source</code> - 线索来源描述，如“百度推广”、“抖音直播间”
              </div>
              <div>
                <code>remark</code> - 备注信息
              </div>
              <div>
                <code>tags</code> - 微信标签，逗号分隔，如 <code>"高意向,电商,女装"</code>
              </div>
              <div>
                <code>siteTags</code> - 站内标签，逗号分隔，用于站内进一步细分
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickTestTab = () => {
    return (
      <div className={style["test-content"]}>
        <div className={style["test-section"]}>
          <h3>快速测试 URL（GET 示例）</h3>
          <div className={style["input-group"]}>
            <Input value={testUrl} disabled className={style["test-input"]} />
          </div>
          <div className={style["test-buttons"]}>
            <Button
              onClick={() => handleCopy(testUrl, "测试URL")}
              className={style["test-btn"]}
            >
              <CopyOutlined />
              复制测试URL
            </Button>
            <Button
              color="primary"
              onClick={handleTestInBrowser}
              className={style["test-btn"]}
            >
              在浏览器中测试
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderDocsTab = () => {
    const docUrl = `${import.meta.env.VITE_API_BASE_URL}/doc/api_v1.md`;

    return (
      <div className={style["docs-content"]}>
        <div className={style["docs-grid"]}>
          <Card className={style["doc-card"]}>
            <div className={style["doc-icon"]}>
              <BookOutlined />
            </div>
            <h4>对外获客线索上报接口文档（V1）</h4>
            <p>点击下方按钮可直接在浏览器中打开最新的远程文档。</p>
            <div className={style["doc-actions"]}>
              <Button
                size="small"
                onClick={() => {
                  window.open(docUrl, "_blank");
                }}
                className={style["doc-open-btn"]}
              >
                在浏览器中打开文档
              </Button>
              <Button
                size="small"
                onClick={() => handleCopy(docUrl, "文档链接")}
                className={style["doc-copy-btn"]}
              >
                <CopyOutlined />
                复制文档链接
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderCodeTab = () => {
    const codeExamples = {
      javascript: `// 参考 api_v1 文档示例，使用 JSON 方式 POST
fetch('${fullWebhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apiKey: '${apiKey}',
    timestamp: 1710000000, // 秒级时间戳
    phone: '13800138000',
    name: '张三',
    source: '官网表单',
    remark: '通过H5表单提交',
    tags: '高意向,电商',
    siteTags: '新客,女装',
    // sign 需要根据签名规则生成
    sign: '根据签名规则生成的MD5字符串'
  })
})`,
      python: `import requests

url = '${fullWebhookUrl}'
headers = {
    'Content-Type': 'application/json'
}
data = {
    "apiKey": "${apiKey}",
    "timestamp": 1710000000,
    "phone": "13800138000",
    "name": "张三",
    "source": "官网表单",
    "remark": "通过H5表单提交",
    "tags": "高意向,电商",
    "siteTags": "新客,女装",
    # sign 需要根据签名规则生成
    "sign": "根据签名规则生成的MD5字符串"
}

response = requests.post(url, json=data, headers=headers)`,
      php: `<?php
$url = '${fullWebhookUrl}';
$data = array(
    'apiKey' => '${apiKey}',
    'timestamp' => 1710000000,
    'phone' => '13800138000',
    'name' => '张三',
    'source' => '官网表单',
    'remark' => '通过H5表单提交',
    'tags' => '高意向,电商',
    'siteTags' => '新客,女装',
    // sign 需要根据签名规则生成
    'sign' => '根据签名规则生成的MD5字符串'
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\\r\\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);`,
      java: `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();
String json = "{\\"apiKey\\":\\"${apiKey}\\",\\"timestamp\\":1710000000,\\"phone\\":\\"13800138000\\",\\"name\\":\\"张三\\",\\"source\\":\\"官网表单\\",\\"remark\\":\\"通过H5表单提交\\",\\"tags\\":\\"高意向,电商\\",\\"siteTags\\":\\"新客,女装\\",\\"sign\\":\\"根据签名规则生成的MD5字符串\\"}";

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${fullWebhookUrl}"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`,
    };

    return (
      <div className={style["code-content"]}>
        <div className={style["language-tabs"]}>
          {Object.keys(codeExamples).map(lang => (
            <button
              key={lang}
              className={`${style["lang-tab"]} ${
                activeLanguage === lang ? style["active"] : ""
              }`}
              onClick={() => setActiveLanguage(lang)}
            >
              {lang.charAt(0).toUpperCase() + lang.slice(1)}
            </button>
          ))}
        </div>
        <div className={style["code-block"]}>
          <pre className={style["code"]}>
            <code>
              {codeExamples[activeLanguage as keyof typeof codeExamples]}
            </code>
          </pre>
          <Button
            size="small"
            onClick={() =>
              handleCopy(
                codeExamples[activeLanguage as keyof typeof codeExamples],
                "代码",
              )
            }
            className={style["copy-code-btn"]}
          >
            <CopyOutlined />
            复制代码
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => (
    <div className={style["plan-api-dialog"]}>
      {/* 头部 */}
      <div className={style["dialog-header"]}>
        <div className={style["header-left"]}>
          <CodeOutlined className={style["header-icon"]} />
          <div className={style["header-content"]}>
            <h3>计划接口配置</h3>
            <p>
              通过API接口直接导入客资到该获客计划，支持多种编程语言和第三方平台集成
            </p>
          </div>
        </div>
        <Button size="small" onClick={onClose} className={style["close-btn"]}>
          ×
        </Button>
      </div>

      {/* 导航标签 */}
      <div className={style["nav-tabs"]}>
        <button
          className={`${style["nav-tab"]} ${activeTab === "config" ? style["active"] : ""}`}
          onClick={() => setActiveTab("config")}
        >
          <SettingOutlined />
          接口配置
        </button>
        <button
          className={`${style["nav-tab"]} ${activeTab === "test" ? style["active"] : ""}`}
          onClick={() => setActiveTab("test")}
        >
          <ThunderboltOutlined />
          快速测试
        </button>
        <button
          className={`${style["nav-tab"]} ${activeTab === "docs" ? style["active"] : ""}`}
          onClick={() => setActiveTab("docs")}
        >
          <BookOutlined />
          开发文档
        </button>
        <button
          className={`${style["nav-tab"]} ${activeTab === "code" ? style["active"] : ""}`}
          onClick={() => setActiveTab("code")}
        >
          <CodeOutlined />
          代码示例
        </button>
      </div>

      {/* 内容区域 */}
      <div className={style["dialog-content"]}>
        {activeTab === "config" && renderConfigTab()}
        {activeTab === "test" && renderQuickTestTab()}
        {activeTab === "docs" && renderDocsTab()}
        {activeTab === "code" && renderCodeTab()}
      </div>

      {/* 底部 */}
      <div className={style["dialog-footer"]}>
        <div className={style["security-note"]}>
          <SafetyOutlined />
          所有数据传输均采用HTTPS加密
        </div>
        <Button color="primary" onClick={onClose} className={style["complete-btn"]}>
          完成配置
        </Button>
      </div>
    </div>
  );

  // 移动端使用Popup
  if (isMobile) {
    return (
      <Popup
        visible={visible}
        onMaskClick={onClose}
        position="bottom"
        bodyStyle={{ height: "90vh" }}
      >
        {renderContent()}
      </Popup>
    );
  }

  // PC端使用Modal
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className={style["plan-api-modal"]}
    >
      {renderContent()}
    </Modal>
  );
};

export default PlanApi;
