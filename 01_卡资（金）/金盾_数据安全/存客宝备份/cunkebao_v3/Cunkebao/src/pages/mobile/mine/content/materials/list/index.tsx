import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toast, SpinLoading, Dialog, Card, Popup, TextArea } from "antd-mobile";
import { Input, Pagination, Button, Spin } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BarChartOutlined,
  PictureOutlined,
  LinkOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getContentItemList, deleteContentItem, aiRewriteContent, replaceContent, importMaterialsFromExcel } from "./api";
import FileUpload from "@/components/Upload/FileUpload";
import { ContentItem } from "./data";
import style from "./index.module.scss";

// 内容类型配置
const contentTypeConfig = {
  1: { label: "图片", icon: PictureOutlined, color: "#52c41a" },
  2: { label: "链接", icon: LinkOutlined, color: "#1890ff" },
  3: { label: "视频", icon: VideoCameraOutlined, color: "#722ed1" },
  4: { label: "文本", icon: FileTextOutlined, color: "#fa8c16" },
  5: { label: "小程序", icon: AppstoreOutlined, color: "#eb2f96" },
  6: { label: "图文", icon: PictureOutlined, color: "#13c2c2" },
};

const MaterialsList: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [materials, setMaterials] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // AI改写相关状态
  const [showAIRewritePopup, setShowAIRewritePopup] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<ContentItem | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [replaceLoading, setReplaceLoading] = useState(false);

  // 导入相关状态
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importFileUrl, setImportFileUrl] = useState<string>("");
  const [importLoading, setImportLoading] = useState(false);

  // 获取素材列表
  const fetchMaterials = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getContentItemList({
        libraryId: id,
        page: currentPage,
        limit: pageSize,
        keyword: searchQuery,
      });

      setMaterials(response.list || []);
      setTotal(response.total || 0);
    } catch (error: unknown) {
      console.error("获取素材列表失败:", error);
      Toast.show({
        content: error instanceof Error ? error.message : "请检查网络连接",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [id, currentPage, searchQuery]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleCreateNew = () => {
    navigate(`/mine/content/materials/new/${id}`);
  };

  const handleEdit = (materialId: number) => {
    navigate(`/mine/content/materials/edit/${id}/${materialId}`);
  };

  const handleDelete = async (materialId: number) => {
    const result = await Dialog.confirm({
      content: "确定要删除这个素材吗？",
      confirmText: "删除",
      cancelText: "取消",
    });

    if (result) {
      try {
        await deleteContentItem(materialId.toString());
        Toast.show({
          content: "删除成功",
          position: "top",
        });
        fetchMaterials();
      } catch (error: unknown) {
        console.error("删除素材失败:", error);
        Toast.show({
          content: error instanceof Error ? error.message : "请检查网络连接",
          position: "top",
        });
      }
    }
  };

  const handleAIRewrite = (material: ContentItem) => {
    setCurrentMaterial(material);
    setAiPrompt("重写这条朋友圈 要求：  1、原本的字数和意思不要修改超过10%  2、出现品牌名或个人名字就去除  3、适当的换行及加些表情点缀");
    setAiResult("");
    setShowAIRewritePopup(true);
  };

  const handleSubmitAIRewrite = async () => {
    if (!currentMaterial) return;

    try {
      setAiLoading(true);
      const response = await aiRewriteContent({
        id: currentMaterial.id.toString(),
        aiPrompt: aiPrompt
      });

      setAiResult(response.contentAfter || "暂无改写结果");

      // 可以在这里显示原内容和改写后内容的对比
      console.log("原内容:", response.contentFront);
      console.log("改写后内容:", response.contentAfter);
    } catch (error) {
      console.error("AI改写失败:", error);
      Toast.show({
        content: "AI改写失败，请重试",
        position: "top",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleReplaceContent = async () => {
    if (!currentMaterial || !aiResult) return;

    try {
      setReplaceLoading(true);
      await replaceContent({
        id: currentMaterial.id.toString(),
        content: aiResult
      });

      Toast.show({
        content: "内容已成功替换",
        position: "top",
      });

      // 刷新素材列表
      fetchMaterials();

      // 关闭弹窗
      closeAIRewritePopup();
    } catch (error) {
      console.error("替换内容失败:", error);
      Toast.show({
        content: "替换内容失败，请重试",
        position: "top",
      });
    } finally {
      setReplaceLoading(false);
    }
  };

  const closeAIRewritePopup = () => {
    setShowAIRewritePopup(false);
    setCurrentMaterial(null);
    setAiPrompt("");
    setAiResult("");
  };

  const handleRefresh = () => {
    fetchMaterials();
  };

  // 处理导入文件上传
  const handleImportFileChange = (fileInfo: { fileName: string; fileUrl: string }) => {
    setImportFileUrl(fileInfo.fileUrl);
  };

  // 执行导入
  const handleImport = async () => {
    if (!id) {
      Toast.show({
        content: "内容库ID不存在",
        position: "top",
      });
      return;
    }

    if (!importFileUrl) {
      Toast.show({
        content: "请先上传Excel文件",
        position: "top",
      });
      return;
    }

    try {
      setImportLoading(true);
      await importMaterialsFromExcel({
        id: id,
        fileUrl: importFileUrl,
      });

      Toast.show({
        content: "导入成功",
        position: "top",
      });

      // 关闭弹窗并重置状态
      setShowImportPopup(false);
      setImportFileUrl("");

      // 刷新素材列表
      fetchMaterials();
    } catch (error: unknown) {
      console.error("导入失败:", error);
      Toast.show({
        content: error instanceof Error ? error.message : "导入失败，请重试",
        position: "top",
      });
    } finally {
      setImportLoading(false);
    }
  };

  // 关闭导入弹窗
  const closeImportPopup = () => {
    setShowImportPopup(false);
    setImportFileUrl("");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 渲染内容类型标签
  const renderContentTypeTag = (contentType: number) => {
    const config =
      contentTypeConfig[contentType as keyof typeof contentTypeConfig];
    if (!config) return null;

    const IconComponent = config.icon;
    return (
      <div
        className={style["content-type-tag"]}
        style={{ backgroundColor: config.color + "20", color: config.color }}
      >
        <IconComponent style={{ fontSize: 12, marginRight: 4 }} />
        {config.label}
      </div>
    );
  };

  // 渲染素材内容预览
  const renderContentPreview = (material: ContentItem) => {
    const { contentType, content, resUrls, urls, coverImage } = material;

    switch (contentType) {
      case 1: // 图片
        return (
          <div className={style["material-image-preview"]}>
            {resUrls && resUrls.length > 0 ? (
              <div
                className={`${style["image-grid"]} ${
                  resUrls.length === 1
                    ? style.single
                    : resUrls.length === 2
                      ? style.double
                      : resUrls.length === 3
                        ? style.triple
                        : resUrls.length === 4
                          ? style.quad
                          : style.grid
                }`}
              >
                {resUrls.slice(0, 9).map((url, index) => (
                  <img key={index} src={url} alt={`图片${index + 1}`} />
                ))}
                {resUrls.length > 9 && (
                  <div className={style["image-more"]}>
                    +{resUrls.length - 9}
                  </div>
                )}
              </div>
            ) : coverImage ? (
              <div className={`${style["image-grid"]} ${style.single}`}>
                <img src={coverImage} alt="封面图" />
              </div>
            ) : (
              <div className={style["no-image"]}>暂无图片</div>
            )}
          </div>
        );

      case 2: // 链接
        return (
          <div className={style["material-link-preview"]}>
            {urls && urls.length > 0 && (
              <div
                className={style["link-card"]}
                onClick={() => {
                  window.open(urls[0].url, "_blank");
                }}
              >
                {urls[0].image && (
                  <div className={style["link-image"]}>
                    <img src={urls[0].image} alt="链接预览" />
                  </div>
                )}
                <div className={style["link-content"]}>
                  <div className={style["link-title"]}>
                    {urls[0].desc || "链接"}
                  </div>
                  <div className={style["link-url"]}>{urls[0].url}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 3: // 视频
        return (
          <div className={style["material-video-preview"]}>
            {resUrls && resUrls.length > 0 ? (
              <div className={style["video-thumbnail"]}>
                <video src={resUrls[0]} controls />
              </div>
            ) : (
              <div className={style["no-video"]}>暂无视频</div>
            )}
          </div>
        );

      case 4: // 文本
        return (
          <div className={style["material-text-preview"]}>
            <div className={style["text-content"]}>
              {content.length > 100
                ? `${content.substring(0, 100)}...`
                : content}
            </div>
          </div>
        );

      case 5: // 小程序
        return (
          <div className={style["material-miniprogram-preview"]}>
            {resUrls && resUrls.length > 0 && (
              <div className={style["miniprogram-card"]}>
                <img src={resUrls[0]} alt="小程序封面" />
                <div className={style["miniprogram-info"]}>
                  <div className={style["miniprogram-title"]}>
                    {material.title || "小程序"}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6: // 图文
        return (
          <div className={style["material-article-preview"]}>
            {coverImage && (
              <div className={style["article-image"]}>
                <img src={coverImage} alt="文章封面" />
              </div>
            )}
            <div className={style["article-content"]}>
              <div className={style["article-title"]}>
                {material.title || "图文内容"}
              </div>
              <div className={style["article-text"]}>
                {content.length > 80
                  ? `${content.substring(0, 80)}...`
                  : content}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={style["material-default-preview"]}>
            <div className={style["default-content"]}>{content}</div>
          </div>
        );
    }
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="素材管理"
            backFn={() => navigate("/mine/content")}
            right={
              <>
                <Button
                  type="default"
                  onClick={() => setShowImportPopup(true)}
                  style={{ marginRight: 8 }}
                >
                  <UploadOutlined /> 导入
                </Button>
                <Button type="primary" onClick={handleCreateNew}>
                  <PlusOutlined /> 新建素材
                </Button>
              </>
            }
          />
          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索素材内容"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              onClick={handleRefresh}
              loading={loading}
              icon={<ReloadOutlined />}
              size="large"
            ></Button>
          </div>
        </>
      }
      footer={
        <div className={style["pagination-wrapper"]}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      }
      loading={loading}
    >
      <div className={style["materials-page"]}>
        {/* 素材列表 */}
        <div className={style["materials-list"]}>
          {loading ? (
            <div className={style["loading"]}>
              <SpinLoading color="primary" style={{ fontSize: 32 }} />
            </div>
          ) : materials.length === 0 ? (
            <div className={style["empty-state"]}>
              <div className={style["empty-icon"]}>📄</div>
              <div className={style["empty-text"]}>
                暂无素材，快去新建一个吧！
              </div>
              <Button
                color="primary"
                onClick={handleCreateNew}
                className={style["empty-btn"]}
              >
                新建素材
              </Button>
            </div>
          ) : (
            <>
              {materials.map(material => (
                <Card key={material.id} className={style["material-card"]}>
                  {/* 顶部信息 */}
                  <div className={style["card-header"]}>
                    <div className={style["avatar-section"]}>
                      <div className={style["avatar"]}>
                        {material.senderAvatar ? (
                          <img
                            src={material.senderAvatar}
                            alt="头像"
                            className={style["avatar-img"]}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextSibling as HTMLElement;
                              if (nextElement) {
                                nextElement.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className={style["avatar-icon-wrapper"]} style={{display: material.senderAvatar ? 'none' : 'flex'}}>
                          <UserOutlined className={style["avatar-icon"]}/>
                        </div>
                      </div>
                      <div className={style["header-info"]}>
                        <span className={style["creator-name"]}>
                          {material.senderNickname || "系统创建"}
                        </span>
                        <span className={style["material-id"]}>
                          ID: {material.id}
                        </span>
                      </div>
                    </div>
                    {renderContentTypeTag(material.contentType)}
                  </div>
                  {/* 标题 */}
                  {material.contentType != 4 && (
                    <div className={style["card-title"]}>
                      {material.content}
                    </div>
                  )}
                  {/* 内容预览 */}
                  {renderContentPreview(material)}

                  {/* 操作按钮区 */}
                  <div className={style["action-buttons"]}>
                    <div className={style["action-btn-group"]}>
                      <Button
                        onClick={() => handleEdit(material.id)}
                        className={style["action-btn"]}
                      >
                        <EditOutlined />
                        编辑
                      </Button>
                      <Button
                        onClick={() => handleAIRewrite(material)}
                        className={style["action-btn"]}
                      >
                        <BarChartOutlined />
                        AI改写
                      </Button>
                    </div>
                    <Button
                      color="danger"
                      onClick={() => handleDelete(material.id)}
                      className={style["delete-btn"]}
                    >
                      <DeleteOutlined />
                    </Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
      {/* AI改写弹框 */}
      <Popup
        visible={showAIRewritePopup}
        onMaskClick={closeAIRewritePopup}
        bodyStyle={{
          borderRadius: "16px 16px 0 0",
          maxHeight: "90vh",
          boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div className={style["ai-popup-content"]}>
          <div className={style["ai-popup-header"]}>
            <h3>AI内容改写</h3>
            <Button
              size="small"
              onClick={closeAIRewritePopup}
            >
              关闭
            </Button>
          </div>

          <div className={style["ai-form"]}>
            {/* 提示词输入区 */}
            <div className={style["ai-form-item"]}>
              <div className={style["ai-form-label"]}>提示词</div>
              <div className={style["ai-form-control"]}>
                <TextArea
                  placeholder="请输入提示词指导AI如何改写内容"
                  value={aiPrompt}
                  onChange={val => setAiPrompt(val)}
                  rows={4}
                  showCount
                  maxLength={500}
                  style={{
                    border: "1px solid #d9e8ff",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "14px"
                  }}
                />
              </div>
            </div>

            <div className={style["ai-submit"]}>
              <Button
                block
                color="primary"
                onClick={handleSubmitAIRewrite}
                loading={aiLoading}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                {aiLoading ? "生成中..." : "生成内容"}
              </Button>
            </div>

            {/* 改写结果区 */}
            <div className={style["ai-form-item"]}>
              <div className={style["ai-form-label"]}>改写结果</div>
              <div className={style["ai-result-description"]}>AI生成的内容将显示在下方区域</div>
              <div className={style["ai-result-box"]}>
                {aiLoading ? (
                  <div className={style["ai-loading"]}>
                    <Spin tip="AI正在思考中..." />
                  </div>
                ) : aiResult ? (
                  <div className={style["ai-result-content"]}>
                    {aiResult}
                  </div>
                ) : (
                  <div className={style["ai-result-placeholder"]}>
                    <div className={style["placeholder-icon"]}>✨</div>
                    <div className={style["placeholder-text"]}>点击"生成内容"按钮获取AI改写结果</div>
                  </div>
                )}
              </div>

              {/* 替换按钮 */}
              {aiResult && (
                <div className={style["ai-replace-action"]}>
                  <Button
                    block
                    color="primary"
                    onClick={handleReplaceContent}
                    loading={replaceLoading}
                    disabled={replaceLoading || !aiResult}
                  >
                    {replaceLoading ? "替换中..." : "替换原内容"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Popup>

      {/* 导入弹窗 */}
      <Popup
        visible={showImportPopup}
        onMaskClick={closeImportPopup}
        bodyStyle={{
          borderRadius: "16px 16px 0 0",
          maxHeight: "90vh",
        }}
      >
        <div className={style["import-popup-content"]}>
          <div className={style["import-popup-header"]}>
            <h3>导入素材</h3>
            <Button
              size="small"
              onClick={closeImportPopup}
            >
              关闭
            </Button>
          </div>

          <div className={style["import-form"]}>
            <div className={style["import-form-item"]}>
              <div className={style["import-form-label"]}>选择Excel文件</div>
              <div className={style["import-form-control"]}>
                <FileUpload
                  value={importFileUrl}
                  onChange={(url) => {
                    const fileUrl = Array.isArray(url) ? url[0] : url;
                    setImportFileUrl(fileUrl || "");
                  }}
                  acceptTypes={["excel"]}
                  maxSize={50}
                  maxCount={1}
                  showPreview={false}
                />
                <div className={style["import-tip"]}>
                  请上传Excel格式的文件，文件大小不超过50MB
                </div>
              </div>
            </div>

            <div className={style["import-actions"]}>
              <Button
                block
                color="primary"
                onClick={handleImport}
                loading={importLoading}
                disabled={importLoading || !importFileUrl}
              >
                {importLoading ? "导入中..." : "确认导入"}
              </Button>
              <Button
                block
                color="danger"
                fill="outline"
                onClick={closeImportPopup}
                style={{ marginTop: 12 }}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      </Popup>
    </Layout>
  );
};

export default MaterialsList;
