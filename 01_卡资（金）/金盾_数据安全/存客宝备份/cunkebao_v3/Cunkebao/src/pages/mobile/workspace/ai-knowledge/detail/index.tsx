import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Switch, message, Spin, Dropdown, Modal } from "antd";
import { Dialog, Toast } from "antd-mobile";
import {
  BookOutlined,
  UserOutlined,
  FileOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import style from "./index.module.scss";
import {
  getKnowledgeBaseDetail,
  getMaterialList,
  deleteMaterial,
  updateKnowledgeBaseConfig,
  uploadMaterial,
} from "./api";
import { deleteKnowledgeBase } from "../list/api";
import type { KnowledgeBase, Material, Caller } from "./data";
import FileUpload from "@/components/Upload/FileUploadButton";
import GlobalPromptModal from "../list/components/GlobalPromptModal";

const AIKnowledgeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(
    null,
  );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [callers, setCallers] = useState<Caller[]>([]);
  const [promptEditVisible, setPromptEditVisible] = useState(false);
  const [independentPrompt, setIndependentPrompt] = useState("");
  const [globalPromptVisible, setGlobalPromptVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await getKnowledgeBaseDetail(Number(id));
      setKnowledgeBase(detail);
      setCallers(detail.callers || []);
      setIndependentPrompt(detail.independentPrompt || "");

      // 获取素材列表
      const materialRes = await getMaterialList({
        knowledgeBaseId: Number(id),
        page: 1,
        limit: 100,
      });

      // 转换素材数据格式
      const transformedMaterials = (materialRes.list || []).map(
        (item: any) => ({
          ...item,
          fileName: item.name,
          tags: item.label || [],
          filePath: item.fileUrl,
          uploadTime: item.createTime
            ? new Date(item.createTime * 1000).toLocaleDateString("zh-CN")
            : "-",
          uploaderId: item.userId,
          fileType: item.name?.split(".").pop() || "file",
          fileSize: 0, // 接口未返回，需要前端计算或后端补充
        }),
      );

      setMaterials(transformedMaterials);

      // 更新知识库的素材数量
      if (detail) {
        setKnowledgeBase({
          ...detail,
          materialCount: transformedMaterials.length,
        });
      }
    } catch (error) {
      message.error("获取详情失败");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // 更新素材列表
  const fetchMaterialList = async () => {
    if (!id) return;
    try {
      const materialRes = await getMaterialList({
        knowledgeBaseId: Number(id),
        page: 1,
        limit: 100,
      });

      // 转换素材数据格式
      const transformedMaterials = (materialRes.list || []).map(
        (item: any) => ({
          ...item,
          fileName: item.name,
          tags: item.label || [],
          filePath: item.fileUrl,
          uploadTime: item.createTime
            ? new Date(item.createTime * 1000).toLocaleDateString("zh-CN")
            : "-",
          uploaderId: item.userId,
          fileType: item.name?.split(".").pop() || "file",
          fileSize: 0, // 接口未返回，需要前端计算或后端补充
        }),
      );

      setMaterials(transformedMaterials);

      // 更新知识库的素材数量
      if (knowledgeBase) {
        setKnowledgeBase({
          ...knowledgeBase,
          materialCount: transformedMaterials.length,
        });
      }
    } catch (error) {
      console.error("获取素材列表失败", error);
    }
  };

  const handleAICallToggle = async (checked: boolean) => {
    if (!id || !knowledgeBase) return;

    // 系统预设不允许修改
    if (knowledgeBase.type === 0) {
      message.warning("系统预设知识库不可修改");
      return;
    }

    try {
      await updateKnowledgeBaseConfig({
        id: Number(id),
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        label: knowledgeBase.tags || knowledgeBase.label || [],
        aiCallEnabled: checked,
        useIndependentPrompt: knowledgeBase.useIndependentPrompt,
        independentPrompt: knowledgeBase.independentPrompt || "",
      });
      message.success(checked ? "已启用AI调用" : "已关闭AI调用");
      setKnowledgeBase(prev =>
        prev ? { ...prev, aiCallEnabled: checked } : null,
      );
    } catch (error) {
      message.error("操作失败");
    }
  };

  const handlePromptSave = async () => {
    if (!id || !knowledgeBase) return;
    if (!independentPrompt.trim()) {
      message.error("请输入提示词内容");
      return;
    }

    try {
      await updateKnowledgeBaseConfig({
        id: Number(id),
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        label: knowledgeBase.tags || knowledgeBase.label || [],
        useIndependentPrompt: true,
        independentPrompt: independentPrompt.trim(),
      });
      message.success("保存成功");
      setKnowledgeBase(prev =>
        prev
          ? {
              ...prev,
              useIndependentPrompt: true,
              independentPrompt: independentPrompt.trim(),
              prompt: independentPrompt.trim(),
            }
          : null,
      );
      setPromptEditVisible(false);
    } catch (error) {
      message.error("保存失败");
    }
  };

  const handleDeleteKnowledge = async () => {
    if (!id || !knowledgeBase) return;

    // 系统预设不允许删除
    if (knowledgeBase.type === 0) {
      message.warning("系统预设知识库不可删除");
      return;
    }

    const result = await Dialog.confirm({
      content: "删除后数据无法恢复，确定要删除该知识库吗？",
      confirmText: "确定",
      cancelText: "取消",
    });

    if (result) {
      try {
        await deleteKnowledgeBase(Number(id));
        Toast.show({
          content: "删除成功",
          icon: "success",
        });
        // 删除成功后返回上一页
        navigate(-1);
      } catch (error) {
        Toast.show({
          content: "删除失败",
          icon: "fail",
        });
      }
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    const result = await Dialog.confirm({
      content: "确定要删除该素材吗？",
      confirmText: "确定",
      cancelText: "取消",
    });

    if (result) {
      try {
        await deleteMaterial(materialId);
        Toast.show({
          content: "删除成功",
          icon: "success",
        });
        // 刷新库内素材列表
        await fetchMaterialList();
      } catch (error) {
        Toast.show({
          content: "删除失败",
          icon: "fail",
        });
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!id) return;

    try {
      // 注意：这里需要先上传文件获取 fileUrl
      // 实际项目中应该有单独的文件上传接口
      // 这里暂时使用占位实现
      message.loading("正在上传文件...", 0);

      // TODO: 调用文件上传接口获取 fileUrl
      // const fileUrl = await uploadFile(file);

      // 临时方案：直接使用文件名作为占位
      const fileUrl = `temp://${file.name}`;

      await uploadMaterial({
        typeId: Number(id),
        name: file.name,
        label: [], // 可以后续添加标签编辑功能
        fileUrl: fileUrl,
      });

      message.destroy();
      message.success("上传成功");
      fetchDetail();
    } catch (error) {
      message.destroy();
      message.error("上传失败");
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (["mp4", "avi", "mov", "wmv"].includes(type)) {
      return (
        <div className={`${style.materialIcon} ${style.videoIcon}`}>
          <VideoCameraOutlined />
        </div>
      );
    } else if (["doc", "docx", "pdf", "txt"].includes(type)) {
      return (
        <div className={`${style.materialIcon} ${style.docIcon}`}>
          <FileTextOutlined />
        </div>
      );
    } else {
      return (
        <div className={`${style.materialIcon} ${style.fileIcon}`}>
          <FileOutlined />
        </div>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderContent = () => {
    if (!knowledgeBase) return null;

    const isSystemPreset = knowledgeBase.type === 0;

    return (
      <div className={style.detailContent}>
        {/* 提示横幅 */}
        <div className={style.banner}>
          <InfoCircleOutlined className={style.bannerIcon} />
          <div className={style.bannerContent}>
            <div className={style.bannerText}>
              已启用统一提示词规范 ·{" "}
              <a onClick={() => setGlobalPromptVisible(true)}>
                点击&#34;统一提示词&#34;可查看和编辑
              </a>
            </div>
          </div>
        </div>

        {/* 知识库信息卡片 */}
        <div className={style.infoCard}>
          <div className={style.infoHeader}>
            <div className={style.infoIcon}>
              <BookOutlined />
            </div>
            <div className={style.infoContent}>
              <div className={style.infoName}>
                {knowledgeBase.name}
                {isSystemPreset && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "12px",
                      color: "#999",
                      fontWeight: "normal",
                    }}
                  >
                    (系统预设)
                  </span>
                )}
              </div>
              {knowledgeBase.description && (
                <div className={style.infoDescription}>
                  {knowledgeBase.description}
                </div>
              )}
            </div>
          </div>

          <div className={style.infoStats}>
            <div className={style.statItem}>
              <div className={style.statValue}>
                {knowledgeBase.materialCount || 0}
              </div>
              <div className={style.statLabel}>素材总数</div>
            </div>
            <div className={style.statItem}>
              <div
                className={`${style.statValue} ${knowledgeBase.aiCallEnabled ? style.statValueSuccess : ""}`}
              >
                {knowledgeBase.aiCallEnabled ? "启用" : "关闭"}
              </div>
              <div className={style.statLabel}>AI状态</div>
            </div>
            <div className={style.statItem}>
              <div className={style.statValue}>
                {knowledgeBase.tags?.length || 0}
              </div>
              <div className={style.statLabel}>标签数</div>
            </div>
          </div>

          {/* 内容标签 */}
          {knowledgeBase.tags && knowledgeBase.tags.length > 0 && (
            <div className={style.infoTags}>
              <div className={style.tagTitle}>内容标签</div>
              <div className={style.tags}>
                {knowledgeBase.tags.map((tag, index) => (
                  <span key={index} className={style.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={style.configSection}>
            <div className={style.configItem}>
              <div>
                <div className={style.configLabel}>
                  <ApiOutlined className={style.configIcon} />
                  AI调用配置
                </div>
              </div>
              <Switch
                checked={knowledgeBase.aiCallEnabled}
                onChange={handleAICallToggle}
                disabled={isSystemPreset}
              />
            </div>

            <div className={style.configItem}>
              <div>
                <div className={style.configLabel}>
                  <CheckCircleOutlined className={style.configIcon} />
                  AI助手可以使用此内容库的素材
                </div>
              </div>
            </div>
            <div className={style.configItem}>
              <div>
                <div className={style.configLabel}>
                  <CheckCircleOutlined className={style.configIcon} />
                  支持智能应答和推荐
                </div>
              </div>
            </div>

            <div className={style.configItem}>
              <div>
                <div className={style.configLabel}>
                  <CheckCircleOutlined className={style.configIcon} />
                  实时响应用户查询
                </div>
              </div>
            </div>
          </div>

          {/* 提示词生效规则 */}
          <div className={style.promptRulesSection}>
            <div className={style.sectionHeader}>
              <div className={style.sectionTitle}>
                <InfoCircleOutlined className={style.sectionIcon} />
                提示词生效规则
              </div>
            </div>
            <ol className={style.rulesList}>
              <li>1、先应用统一提示词 (全局规范)</li>
              <li>2、再结合知识库独立提示词 (专业指导)</li>
              <li>3、最终形成针对性的回复风格</li>
            </ol>
          </div>

          {/* 知识库独立提示词 */}
          <div className={style.independentPromptSection}>
            <div className={style.sectionHeader}>
              <div className={style.sectionTitle}>
                <MessageOutlined className={style.sectionIcon} />
                知识库独立提示词
              </div>
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
              ></Button>
            </div>
            <div className={style.promptDisplay}>
              {knowledgeBase.independentPrompt || independentPrompt ? (
                <div className={style.promptText}>
                  {knowledgeBase.independentPrompt || independentPrompt}
                </div>
              ) : (
                <div className={style.promptEmpty}>
                  暂无独立提示词，点击编辑按钮添加
                </div>
              )}
            </div>
            <Button
              type="primary"
              ghost
              block={true}
              onClick={() => setPromptEditVisible(true)}
              disabled={isSystemPreset}
              style={{ marginTop: 8 }}
            >
              编辑独立提示词
            </Button>
          </div>

          {/* 调用客服名单 */}
          {callers.length > 0 && (
            <div className={style.callerSection}>
              <div className={style.sectionHeader}>
                <div className={style.sectionTitle}>
                  <UserOutlined className={style.sectionIcon} />
                  调用客服名单
                  <span className={style.sectionCount}>{callers.length}</span>
                </div>
              </div>
              <div className={style.callerList}>
                {callers.slice(0, 3).map(caller => (
                  <div key={caller.id} className={style.callerItem}>
                    <div className={style.callerAvatar}>
                      {caller.avatar ? (
                        <img src={caller.avatar} alt={caller.name} />
                      ) : (
                        <UserOutlined />
                      )}
                    </div>
                    <div className={style.callerInfo}>
                      <div className={style.callerName}>{caller.name}</div>
                      <div className={style.callerRole}>{caller.role}</div>
                    </div>
                    <div className={style.callerTime}>
                      调用{caller.callCount}次 · {caller.lastCallTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 上传素材按钮 */}
        {!isSystemPreset && (
          <div className={style.uploadSection}>
            <FileUpload
              buttonText="上传素材到此库"
              acceptTypes={["pdf", "txt", "doc", "docx", "md"]}
              block={true}
              size="large"
              onChange={async result => {
                if (result && result.fileUrl && result.fileName && id) {
                  try {
                    await uploadMaterial({
                      typeId: Number(id),
                      name: result.fileName,
                      label: [],
                      fileUrl: result.fileUrl,
                    });
                    message.success("上传成功");
                    // 更新素材列表
                    await fetchMaterialList();
                  } catch (e) {
                    message.error("上传失败");
                  }
                }
              }}
            />
          </div>
        )}

        {/* 库内素材 */}
        <div className={style.materialsSection}>
          <div className={style.sectionHeader}>
            <div className={style.sectionTitle}>
              库内素材
              <span className={style.sectionCount}>{materials.length}</span>
            </div>
          </div>
          <div className={style.materialList}>
            {materials.length > 0 ? (
              materials.map(material => (
                <div key={material.id} className={style.materialItem}>
                  {getFileIcon(material.fileType)}
                  <div className={style.materialContent}>
                    <div className={style.materialHeader}>
                      <div className={style.materialName}>
                        {material.fileName}
                      </div>
                      {!isSystemPreset && (
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: "delete",
                                icon: <DeleteOutlined />,
                                label: "删除",
                                danger: true,
                              },
                            ],
                            onClick: () => handleDeleteMaterial(material.id),
                          }}
                          trigger={["click"]}
                          placement="bottomRight"
                        >
                          <MoreOutlined className={style.materialMenu} />
                        </Dropdown>
                      )}
                    </div>
                    <div className={style.materialMeta}>
                      <div className={style.materialSize}>
                        {formatFileSize(material?.size || 0)}
                      </div>
                      <div className={style.materialDate}>
                        {material.uploadTime}
                      </div>
                    </div>
                    {material.tags && material.tags.length > 0 && (
                      <div className={style.materialTags}>
                        {material.tags.map((tag, index) => (
                          <span key={index} className={style.materialTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={style.empty}>
                <div className={style.emptyIcon}>
                  <FileOutlined />
                </div>
                <div className={style.emptyText}>暂无素材</div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作按钮 */}
        {!isSystemPreset && (
          <div className={style.bottomActions}>
            <Button
              className={style.editButton}
              onClick={() => navigate(`/workspace/ai-knowledge/${id}/edit`)}
            >
              <EditOutlined /> 编辑库
            </Button>
            <Button
              danger
              className={style.deleteButton}
              onClick={handleDeleteKnowledge}
            >
              <DeleteOutlined /> 删除库
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="AI知识库"
            backFn={() => navigate("/workspace/ai-knowledge")}
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => setGlobalPromptVisible(true)}>
                  <GlobalOutlined /> 统一提示词
                </Button>
                <Button
                  type="primary"
                  onClick={() => navigate("/workspace/ai-knowledge/new")}
                >
                  <PlusOutlined /> 新建
                </Button>
              </div>
            }
          />
        </>
      }
    >
      <div className={style.detailPage}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* 编辑独立提示词弹窗 */}
      <Modal
        title="编辑独立提示词"
        open={promptEditVisible}
        onCancel={() => setPromptEditVisible(false)}
        onOk={handlePromptSave}
        okText="保存"
        cancelText="取消"
        className={style.promptEditModal}
      >
        <textarea
          className={style.promptTextarea}
          value={independentPrompt}
          onChange={e => setIndependentPrompt(e.target.value)}
          placeholder="请输入独立提示词..."
          maxLength={1000}
        />
        <div className={style.promptHint}>
          💡 独立提示词将与统一提示词合并使用，为该知识库提供专业指导
        </div>
      </Modal>

      {/* 统一提示词弹窗 */}
      <GlobalPromptModal
        visible={globalPromptVisible}
        onClose={() => setGlobalPromptVisible(false)}
      />
    </Layout>
  );
};

export default AIKnowledgeDetail;
