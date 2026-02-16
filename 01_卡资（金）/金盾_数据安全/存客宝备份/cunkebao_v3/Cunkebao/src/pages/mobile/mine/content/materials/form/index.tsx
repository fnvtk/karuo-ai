import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Toast, SpinLoading, Card } from "antd-mobile";
import { Input, Select } from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PictureOutlined,
  LinkOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import UploadComponent from "@/components/Upload/ImageUpload/ImageUpload";
import VideoUpload from "@/components/Upload/VideoUpload";
import {
  getContentItemDetail,
  createContentItem,
  updateContentItem,
} from "./api";
import style from "./index.module.scss";

const { Option } = Select;
const { TextArea } = Input;

// 内容类型选项
const contentTypeOptions = [
  { value: 1, label: "图片", icon: <PictureOutlined /> },
  { value: 2, label: "链接", icon: <LinkOutlined /> },
  { value: 3, label: "视频", icon: <VideoCameraOutlined /> },
  { value: 4, label: "文本", icon: <FileTextOutlined /> },
  { value: 5, label: "小程序", icon: <AppstoreOutlined /> },
];

const MaterialForm: React.FC = () => {
  const navigate = useNavigate();
  const { id: libraryId, materialId } = useParams<{
    id: string;
    materialId: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单状态
  const [contentType, setContentType] = useState<number>(4);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [sendTime, setSendTime] = useState("");
  const [resUrls, setResUrls] = useState<string[]>([]);

  // 链接相关状态
  const [linkDesc, setLinkDesc] = useState("");
  const [linkImage, setLinkImage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // 小程序相关状态
  const [appTitle, setAppTitle] = useState("");
  const [appId, setAppId] = useState("");

  const isEdit = !!materialId;

  // 获取素材详情
  const fetchMaterialDetail = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const response = await getContentItemDetail(materialId);
      // 填充表单数据
      setTitle(response.title || "");
      setContent(response.content || "");
      setContentType(response.contentType || 4);
      setComment(response.comment || "");

      // 处理时间格式 - sendTime是字符串格式，需要转换为datetime-local格式
      if (response.sendTime) {
        // 将 "2025-07-28 16:11:00" 转换为 "2025-07-28T16:11"
        const dateTime = new Date(response.sendTime);
        setSendTime(dateTime.toISOString().slice(0, 16));
      } else {
        setSendTime("");
      }

      setResUrls(response.resUrls || []);

      // 设置链接相关数据
      if (response.urls && response.urls.length > 0) {
        const firstUrl = response.urls[0];
        if (typeof firstUrl === "object" && firstUrl !== null) {
          setLinkDesc(firstUrl.desc || "");
          setLinkImage(firstUrl.image || "");
          setLinkUrl(firstUrl.url || "");
        }
      }
    } catch (error: unknown) {
      console.error("获取素材详情失败:", error);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (isEdit && materialId) {
      fetchMaterialDetail();
    }
  }, [isEdit, materialId, fetchMaterialDetail]);

  const handleSubmit = async () => {
    if (!libraryId) return;

    if (!content.trim()) {
      Toast.show({
        content: "请输入素材内容",
        position: "top",
      });
      return;
    }

    setSaving(true);
    try {
      // 构建urls数据
      let finalUrls: { desc: string; image: string; url: string }[] = [];
      if (contentType === 2 && linkUrl) {
        finalUrls = [
          {
            desc: linkDesc,
            image: linkImage,
            url: linkUrl,
          },
        ];
      }

      const params = {
        libraryId,
        title,
        content,
        contentType,
        comment,
        sendTime: sendTime || "",
        resUrls,
        urls: finalUrls,
        type: contentType,
      };

      if (isEdit) {
        await updateContentItem({
          id: materialId!,
          ...params,
        });
      } else {
        await createContentItem(params);
      }

      // 直接使用返回数据，无需判断code
      Toast.show({
        content: isEdit ? "更新成功" : "创建成功",
        position: "top",
      });
      navigate(`/mine/content/materials/${libraryId}`);
    } catch (error: unknown) {
      console.error("保存素材失败:", error);
      Toast.show({
        content: error instanceof Error ? error.message : "请检查网络连接",
        position: "top",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/mine/content/materials/${libraryId}`);
  };

  if (loading) {
    return (
      <Layout header={<NavCommon title={isEdit ? "编辑素材" : "新建素材"} />}>
        <div className={style["loading"]}>
          <SpinLoading color="primary" style={{ fontSize: 32 }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={<NavCommon title={isEdit ? "编辑素材" : "新建素材"} />}
      footer={
        <div className={style["form-actions"]}>
          <Button
            fill="outline"
            onClick={handleBack}
            className={style["back-btn"]}
          >
            <ArrowLeftOutlined />
            返回
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            loading={saving}
            className={style["submit-btn"]}
          >
            <SaveOutlined />
            {isEdit ? " 保存修改" : " 保存素材"}
          </Button>
        </div>
      }
    >
      <div className={style["form-page"]}>
        <div className={style["form"]}>
          {/* 基础信息 */}
          <Card className={style["form-card"]}>
            <div className={style["card-title"]}>基础信息</div>

            <div className={style["form-item"]}>
              <label className={style["form-label"]}>发布时间</label>
              <Input
                type="datetime-local"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                placeholder="请选择发布时间"
                className={style["form-input"]}
              />
            </div>

            <div className={style["form-item"]}>
              <label className={style["form-label"]}>
                <span className={style["required"]}>*</span>类型
              </label>
              <Select
                value={contentType}
                onChange={value => setContentType(value)}
                placeholder="请选择类型"
                className={style["form-select"]}
              >
                {contentTypeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div className={style["select-option"]}>
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </Card>

          {/* 内容信息 */}
          <Card className={style["form-card"]}>
            <div className={style["card-title"]}>内容信息</div>

            <div className={style["form-item"]}>
              <label className={style["form-label"]}>
                <span className={style["required"]}>*</span>内容
              </label>
              <TextArea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="请输入内容"
                rows={6}
                className={style["form-textarea"]}
              />
            </div>

            {/* 链接类型特有字段 */}
            {contentType === 2 && (
              <>
                <div className={style["form-item"]}>
                  <label className={style["form-label"]}>
                    <span className={style["required"]}>*</span>描述
                  </label>
                  <Input
                    value={linkDesc}
                    onChange={e => setLinkDesc(e.target.value)}
                    placeholder="请输入描述"
                    className={style["form-input"]}
                  />
                </div>

                <div className={style["form-item"]}>
                  <label className={style["form-label"]}>封面图</label>
                  <UploadComponent
                    value={linkImage ? [linkImage] : []}
                    onChange={urls => setLinkImage(urls[0] || "")}
                    count={1}
                  />
                </div>

                <div className={style["form-item"]}>
                  <label className={style["form-label"]}>
                    <span className={style["required"]}>*</span>链接地址
                  </label>
                  <Input
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="请输入链接地址"
                    className={style["form-input"]}
                  />
                </div>
              </>
            )}

            {/* 视频类型特有字段 */}
            {contentType === 3 && (
              <div className={style["form-item"]}>
                <label className={style["form-label"]}>视频上传</label>
                <VideoUpload
                  value={resUrls[0] || ""}
                  onChange={url => setResUrls([url])}
                />
              </div>
            )}
          </Card>

          {/* 素材上传（仅图片类型和小程序类型） */}
          {[1, 5].includes(contentType) && (
            <Card className={style["form-card"]}>
              <div className={style["card-title"]}>
                素材上传 (当前类型: {contentType})
              </div>

              {contentType === 1 && (
                <div className={style["form-item"]}>
                  <label className={style["form-label"]}>图片上传</label>
                  <div>
                    <UploadComponent
                      value={resUrls}
                      onChange={setResUrls}
                      count={9}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    当前内容类型: {contentType}, 图片数量: {resUrls.length}
                  </div>
                </div>
              )}

              {contentType === 5 && (
                <>
                  <div className={style["form-item"]}>
                    <label className={style["form-label"]}>小程序名称</label>
                    <Input
                      value={appTitle}
                      onChange={e => setAppTitle(e.target.value)}
                      placeholder="请输入小程序名称"
                      className={style["form-input"]}
                    />
                  </div>

                  <div className={style["form-item"]}>
                    <label className={style["form-label"]}>AppID</label>
                    <Input
                      value={appId}
                      onChange={e => setAppId(e.target.value)}
                      placeholder="请输入AppID"
                      className={style["form-input"]}
                    />
                  </div>

                  <div className={style["form-item"]}>
                    <label className={style["form-label"]}>小程序封面图</label>
                    <UploadComponent
                      value={resUrls}
                      onChange={setResUrls}
                      count={9}
                    />
                  </div>
                </>
              )}
            </Card>
          )}

          {/* 评论/备注 */}
          <Card className={style["form-card"]}>
            <div className={style["card-title"]}>评论/备注</div>

            <div className={style["form-item"]}>
              <label className={style["form-label"]}>备注</label>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="请输入评论或备注"
                rows={4}
                className={style["form-textarea"]}
              />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MaterialForm;
