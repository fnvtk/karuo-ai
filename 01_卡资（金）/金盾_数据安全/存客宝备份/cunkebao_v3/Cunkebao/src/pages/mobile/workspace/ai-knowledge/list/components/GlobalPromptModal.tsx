import React, { useState, useEffect } from "react";
import { Popup, Toast } from "antd-mobile";
import { Input, Button } from "antd";
const { TextArea } = Input;
import {
  InfoCircleOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";
import { initGlobalPrompt, saveGlobalPrompt } from "../api";
import style from "../index.module.scss";
import { config } from "antd-mobile/es/components/toast/methods";

interface GlobalPromptModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_PROMPT = `你是存客宝AI知识库助手。请遵循以下基本原则:

1. 专业性: 使用专业但易懂的语言回答问题
2. 准确性: 基于知识库内容提供准确的信息
3. 友好性: 保持友好、耐心的服务态度
4. 简洁性: 回答简明扼要，重点突出
5. 引用性: 回答时注明信息来源`;

const GlobalPromptModal: React.FC<GlobalPromptModalProps> = ({
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(DEFAULT_PROMPT);

  useEffect(() => {
    if (visible) {
      fetchGlobalPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fetchGlobalPrompt = async () => {
    setLoading(true);
    try {
      const res = await initGlobalPrompt();
      // 假定返回的数据结构包含 promptInfo 字段
      setContent(res?.config?.prompt_info || DEFAULT_PROMPT);
    } catch (error) {
      Toast.show({ content: "获取配置失败", position: "bottom" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Toast.show({
        content: "请输入提示词内容",
        position: "bottom",
      });
      return;
    }
    setSaving(true);
    try {
      await saveGlobalPrompt({
        promptInfo: content.trim(),
      });
      Toast.show({ content: "保存成功", position: "bottom" });
      onClose();
    } catch (error) {
      Toast.show({ content: "保存失败", position: "bottom" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{ borderRadius: "16px 16px 0 0", minHeight: 300, padding: 0 }}
      position="bottom"
      closeOnMaskClick
      className={style.promptModal}
    >
      <div
        className={style.promptMobileHead}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px 0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <InfoCircleOutlined
            style={{
              color: "#1677ff",
              fontSize: 20,
              marginRight: 8,
              verticalAlign: "middle",
            }}
          />
          <span>统一提示词配置</span>
        </div>

        <CloseOutlined onClick={onClose} />
      </div>
      <div className={style.promptContent}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
          设置所有知识库的通用回复规范
        </div>
        <TextArea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="请输入统一提示词..."
          maxLength={2000}
          disabled={loading}
          style={{ height: "200px", marginBottom: 15 }}
        />
        <div className={style.promptSection}>
          <div className={style.sectionTitle}>
            <InfoCircleFilled
              className={style.sectionIcon}
              style={{ fontSize: 16 }}
            />
            统一提示词作用
          </div>
          <div className={style.sectionContent}>
            <ul>
              <li>定义AI回复的基本风格和规范</li>
              <li>确保所有知识库回复的一致性和专业度</li>
              <li>与各知识库的回复基本合用</li>
            </ul>
          </div>
        </div>
        <div className={style.warningBox}>
          <div className={style.warningTitle}>
            <ExclamationCircleFilled
              style={{
                marginRight: 3,
                fontSize: 16,
                verticalAlign: "middle",
                color: "#FC772B",
              }}
            />
            提示词生效逻辑:
          </div>
          <div className={style.warningText}>
            统一提示词（全局规则） + 知识库独立提示词（专业指导） =
            该终AI回复内容
          </div>
        </div>
        <div className={style.modalFooter}>
          <Button onClick={onClose} size="large">
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="large"
            type="primary"
          >
            {saving ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default GlobalPromptModal;
