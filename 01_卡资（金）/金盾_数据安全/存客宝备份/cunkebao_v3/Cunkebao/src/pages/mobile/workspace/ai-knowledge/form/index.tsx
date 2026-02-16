import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { message, Spin, Switch, Input } from "antd";

const { TextArea } = Input;
import {
  BookOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import style from "./index.module.scss";
import {
  createKnowledgeBase,
  updateKnowledgeBase,
  getKnowledgeBaseDetail,
} from "./api";
import type { KnowledgeBaseFormData } from "./data";

const AIKnowledgeForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [useIndependentPrompt, setUseIndependentPrompt] = useState(false);
  const [independentPrompt, setIndependentPrompt] = useState("");

  useEffect(() => {
    if (isEdit && id) {
      fetchDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const fetchDetail = async () => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const detail = await getKnowledgeBaseDetail(Number(id));

      // 检查是否为系统预设（type === 0），系统预设不允许编辑
      if (detail.type === 0) {
        message.warning("系统预设知识库不可编辑");
        navigate(-1);
        return;
      }

      setName(detail.name || "");
      setDescription(detail.description || "");
      setTags(detail.tags || []);
      setTagInput(detail.tags?.join(", ") || "");
      setUseIndependentPrompt(detail.useIndependentPrompt || false);
      setIndependentPrompt(detail.independentPrompt || "");
    } catch (error) {
      message.error("获取详情失败");
      navigate(-1);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    // 实时解析标签
    const parsedTags = value
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(Boolean);
    setTags(parsedTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setTagInput(newTags.join(", "));
  };

  const handleSubmit = async () => {
    // 表单验证
    if (!name.trim()) {
      message.error("请输入内容库名称");
      return;
    }

    if (name.length > 50) {
      message.error("名称不能超过50个字符");
      return;
    }

    if (description.length > 200) {
      message.error("描述不能超过200个字符");
      return;
    }

    if (useIndependentPrompt && !independentPrompt.trim()) {
      message.error("启用独立提示词时，请输入提示词内容");
      return;
    }

    if (independentPrompt.length > 1000) {
      message.error("提示词不能超过1000个字符");
      return;
    }

    setSubmitting(true);
    try {
      const formData: KnowledgeBaseFormData = {
        name: name.trim(),
        description: description.trim(),
        tags: tags,
        useIndependentPrompt,
        independentPrompt: useIndependentPrompt ? independentPrompt.trim() : "",
      };

      if (isEdit && id) {
        formData.id = Number(id);
        await updateKnowledgeBase(formData);
        message.success("更新成功");
      } else {
        await createKnowledgeBase(formData);
        message.success("创建成功");
      }

      navigate(-1);
    } catch (error) {
      message.error(isEdit ? "更新失败" : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (detailLoading) {
    return (
      <Layout
        header={<NavCommon title={isEdit ? "编辑内容库" : "新建内容库"} />}
      >
        <div className={style.loading}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={<NavCommon title={isEdit ? "编辑内容库" : "新建内容库"} />}
      footer={
        <div className={style.formFooter}>
          <button
            className={`${style.footerButton} ${style.cancelButton}`}
            onClick={handleCancel}
            disabled={submitting}
          >
            取消
          </button>
          <button
            className={`${style.footerButton} ${style.submitButton}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "提交中..." : isEdit ? "更新" : "创建"}
          </button>
        </div>
      }
    >
      <div className={style.formPage}>
        <div className={style.formContainer}>
          {/* 信息提示 */}
          <div className={style.infoCard}>
            <InfoCircleOutlined className={style.infoCardIcon} />
            <div className={style.infoCardContent}>
              创建一个新的内容库来组织和管理您的素材，支持配置独立提示词和AI调用设置
            </div>
          </div>

          {/* 基本信息 */}
          <div className={style.sectionTitle}>
            <BookOutlined className={style.sectionIcon} />
            基本信息
          </div>

          <div className={style.formItem}>
            <div className={style.formLabel}>
              <span className={style.required}>*</span>
              内容库名称
            </div>
            <Input
              placeholder="如：产品介绍库"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              size="large"
              count={{
                show: true,
                max: 50,
              }}
            />
          </div>

          <div className={style.formItem}>
            <div className={style.formLabel}>描述</div>
            <TextArea
              placeholder="描述这个内容库的用途..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
              rows={4}
              showCount
            />
          </div>

          <div className={style.formItem}>
            <div className={style.formLabel}>标签</div>
            <div className={style.tagInput}>
              <Input
                placeholder="多个标签用逗号分隔，如：产品,营销,介绍"
                value={tagInput}
                onChange={e => handleTagInputChange(e.target.value)}
                size="large"
              />
              {tags.length > 0 && (
                <div className={style.tagList}>
                  {tags.map((tag, index) => (
                    <span key={index} className={style.tagItem}>
                      {tag}
                      <CloseOutlined
                        className={style.tagRemove}
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className={style.formHint}>
              标签用于分类和快速查找，建议使用3-5个关键标签
            </div>
          </div>

          {/* 独立提示词 */}
          <div className={style.sectionTitle}>
            <BulbOutlined className={style.sectionIcon} />
            独立提示词配置
          </div>

          <div className={style.promptSection}>
            <div className={style.promptHeader}>
              <div className={style.promptLabel}>
                <BulbOutlined className={style.promptIcon} />
                使用独立提示词
              </div>
              <Switch
                checked={useIndependentPrompt}
                onChange={setUseIndependentPrompt}
              />
            </div>

            {useIndependentPrompt && (
              <>
                <div className={style.promptDescription}>
                  设置此知识库的专业指导，将与统一提示词合并使用，为该知识库提供更精准的回答规则
                </div>

                <TextArea
                  placeholder="请输入独立提示词内容，例如：
- 回答风格：专业、友好、简洁
- 特殊要求：强调产品优势、突出技术细节
- 回答格式：分点列举、数据支撑..."
                  value={independentPrompt}
                  onChange={e => setIndependentPrompt(e.target.value)}
                  maxLength={1000}
                  rows={8}
                  showCount
                  disabled={!useIndependentPrompt}
                />
              </>
            )}

            <div className={style.promptHint}>
              <InfoCircleOutlined className={style.hintIcon} />
              <div>
                <strong>生效逻辑：</strong>
                统一提示词（全局规则） + 独立提示词（专业指导） = 最终AI回复内容
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIKnowledgeForm;
