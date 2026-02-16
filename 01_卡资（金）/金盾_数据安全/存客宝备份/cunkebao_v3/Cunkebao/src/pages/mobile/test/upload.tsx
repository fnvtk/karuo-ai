import React, { useState } from "react";
import { Button, Card, Space, Divider, Toast, Switch } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import ImageUpload from "@/components/Upload/ImageUpload/ImageUpload";
import AvatarUpload from "@/components/Upload/AvatarUpload";
import VideoUpload from "@/components/Upload/VideoUpload";
import FileUpload from "@/components/Upload/FileUpload";
import MainImgUpload from "@/components/Upload/MainImgUpload";
import styles from "./upload.module.scss";

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center" }}>
          <h3>组件出现错误</h3>
          <p>错误信息: {this.state.error?.message}</p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重试
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const UploadTestPage: React.FC = () => {
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // 图片上传状态
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(9);
  const [imageDisabled, setImageDisabled] = useState(false);

  // 头像上传状态
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarSize, setAvatarSize] = useState(100);
  const [avatarDisabled, setAvatarDisabled] = useState(false);

  // 视频上传状态
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [videoCount, setVideoCount] = useState(1);

  // 文件上传状态
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileDisabled, setFileDisabled] = useState(false);
  const [fileCount, setFileCount] = useState(1);
  const [fileTypes, setFileTypes] = useState<string[]>([
    "excel",
    "word",
    "ppt",
  ]);

  // 主图上传状态
  const [mainImgUrl, setMainImgUrl] = useState<string>("");
  const [mainImgDisabled, setMainImgDisabled] = useState(false);
  const [mainImgMaxSize, setMainImgMaxSize] = useState(5);
  const [mainImgShowPreview, setMainImgShowPreview] = useState(true);

  return (
    <Layout header={<NavCommon title="上传组件功能测试" />} loading={loading}>
      <div className={styles.container}>
        {/* 图片上传测试 */}
        <ErrorBoundary>
          <Card className={styles.testSection}>
            <h3>图片上传组件测试</h3>
            <p>支持多图片上传，可设置数量限制</p>

            <ImageUpload
              value={imageUrls}
              onChange={setImageUrls}
              count={imageCount}
              accept="image/*"
              disabled={imageDisabled}
            />

            <div className={styles.result}>
              <h4>当前图片URLs:</h4>
              <div className={styles.urlList}>
                {imageUrls.length > 0 ? (
                  imageUrls.map((url, index) => (
                    <div key={index} className={styles.urlItem}>
                      <span>{index + 1}.</span>
                      <span className={styles.url}>
                        {typeof url === "string" ? url : "无效URL"}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className={styles.emptyText}>暂无图片</span>
                )}
              </div>
            </div>
          </Card>
        </ErrorBoundary>

        {/* 头像上传测试 */}
        <ErrorBoundary>
          <Card className={styles.testSection}>
            <h3>头像上传组件测试</h3>
            <p>支持单张图片上传，圆形显示</p>

            <AvatarUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              disabled={avatarDisabled}
              size={avatarSize}
            />

            <div className={styles.result}>
              <h4>当前头像URL:</h4>
              <div className={styles.urlList}>
                <div className={styles.urlItem}>
                  {avatarUrl ? (
                    <div className={styles.url}>
                      {typeof avatarUrl === "string" ? avatarUrl : "无效URL"}
                    </div>
                  ) : (
                    <span className={styles.emptyText}>暂无头像</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </ErrorBoundary>

        {/* 视频上传测试 */}
        <ErrorBoundary>
          <Card className={styles.testSection}>
            <h3>视频上传组件测试</h3>
            <p>支持视频文件上传，最大50MB，支持预览功能，可设置上传数量</p>

            {/* 视频上传控制面板 */}
            <div className={styles.controlPanel}>
              <div className={styles.controlItem}>
                <span>视频上传数量:</span>
                <Space>
                  <Button
                    size="small"
                    onClick={() => setVideoCount(Math.max(1, videoCount - 1))}
                  >
                    -
                  </Button>
                  <span>{videoCount}</span>
                  <Button
                    size="small"
                    onClick={() => setVideoCount(Math.min(10, videoCount + 1))}
                  >
                    +
                  </Button>
                </Space>
              </div>
            </div>

            <VideoUpload
              value={videoCount === 1 ? videoUrl : videoUrls}
              onChange={url => {
                if (videoCount === 1) {
                  setVideoUrl(url as string);
                } else {
                  setVideoUrls(url as string[]);
                }
              }}
              disabled={videoDisabled}
              maxSize={50}
              showPreview={true}
              maxCount={videoCount}
            />

            <div className={styles.result}>
              <h4>当前视频URL:</h4>
              <div className={styles.urlList}>
                {videoCount === 1 ? (
                  <div className={styles.urlItem}>
                    {videoUrl ? (
                      <div className={styles.url}>
                        {typeof videoUrl === "string" ? videoUrl : "无效URL"}
                      </div>
                    ) : (
                      <span className={styles.emptyText}>暂无视频</span>
                    )}
                  </div>
                ) : videoUrls.length > 0 ? (
                  videoUrls.map((url, index) => (
                    <div key={index} className={styles.urlItem}>
                      <span>{index + 1}.</span>
                      <div className={styles.url}>
                        {typeof url === "string" ? url : "无效URL"}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className={styles.emptyText}>暂无视频</span>
                )}
              </div>
            </div>
          </Card>
        </ErrorBoundary>

        {/* 文件上传测试 */}
        <ErrorBoundary>
          <Card className={styles.testSection}>
            <h3>文件上传组件测试</h3>
            <p>支持Excel、Word、PPT格式文件上传，可设置上传数量和文件类型</p>

            {/* 文件上传控制面板 */}
            <div className={styles.controlPanel}>
              <div className={styles.controlItem}>
                <span>文件上传数量:</span>
                <Space>
                  <Button
                    size="small"
                    onClick={() => setFileCount(Math.max(1, fileCount - 1))}
                  >
                    -
                  </Button>
                  <span>{fileCount}</span>
                  <Button
                    size="small"
                    onClick={() => setFileCount(Math.min(10, fileCount + 1))}
                  >
                    +
                  </Button>
                </Space>
              </div>

              <div className={styles.controlItem}>
                <span>文件类型:</span>
                <Space>
                  <Button
                    size="small"
                    color={fileTypes.includes("excel") ? "primary" : "default"}
                    onClick={() => {
                      if (fileTypes.includes("excel")) {
                        setFileTypes(fileTypes.filter(t => t !== "excel"));
                      } else {
                        setFileTypes([...fileTypes, "excel"]);
                      }
                    }}
                  >
                    Excel
                  </Button>
                  <Button
                    size="small"
                    color={fileTypes.includes("word") ? "primary" : "default"}
                    onClick={() => {
                      if (fileTypes.includes("word")) {
                        setFileTypes(fileTypes.filter(t => t !== "word"));
                      } else {
                        setFileTypes([...fileTypes, "word"]);
                      }
                    }}
                  >
                    Word
                  </Button>
                  <Button
                    size="small"
                    color={fileTypes.includes("ppt") ? "primary" : "default"}
                    onClick={() => {
                      if (fileTypes.includes("ppt")) {
                        setFileTypes(fileTypes.filter(t => t !== "ppt"));
                      } else {
                        setFileTypes([...fileTypes, "ppt"]);
                      }
                    }}
                  >
                    PPT
                  </Button>
                </Space>
              </div>
            </div>

            <FileUpload
              value={fileCount === 1 ? fileUrl : fileUrls}
              onChange={url => {
                if (fileCount === 1) {
                  setFileUrl(url as string);
                } else {
                  setFileUrls(url as string[]);
                }
              }}
              disabled={fileDisabled}
              maxSize={10}
              showPreview={true}
              maxCount={fileCount}
              acceptTypes={fileTypes}
            />

            <div className={styles.result}>
              <h4>当前文件URL:</h4>
              <div className={styles.urlList}>
                {fileCount === 1 ? (
                  <div className={styles.urlItem}>
                    {fileUrl ? (
                      <div className={styles.url}>
                        {typeof fileUrl === "string" ? fileUrl : "无效URL"}
                      </div>
                    ) : (
                      <span className={styles.emptyText}>暂无文件</span>
                    )}
                  </div>
                ) : fileUrls.length > 0 ? (
                  fileUrls.map((url, index) => (
                    <div key={index} className={styles.urlItem}>
                      <span>{index + 1}.</span>
                      <div className={styles.url}>
                        {typeof url === "string" ? url : "无效URL"}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className={styles.emptyText}>暂无文件</span>
                )}
              </div>
            </div>
          </Card>
        </ErrorBoundary>

        {/* 主图上传测试 */}
        <ErrorBoundary>
          <Card className={styles.testSection}>
            <h3>主图封面上传组件测试</h3>
            <p>支持单张图片上传作为主图封面，上传后右上角显示删除按钮</p>

            {/* 主图上传控制面板 */}
            <div className={styles.controlPanel}>
              <div className={styles.controlItem}>
                <span>最大文件大小:</span>
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      setMainImgMaxSize(Math.max(1, mainImgMaxSize - 1))
                    }
                  >
                    -
                  </Button>
                  <span>{mainImgMaxSize}MB</span>
                  <Button
                    size="small"
                    onClick={() =>
                      setMainImgMaxSize(Math.min(20, mainImgMaxSize + 1))
                    }
                  >
                    +
                  </Button>
                </Space>
              </div>

              <div className={styles.controlItem}>
                <span>显示预览按钮:</span>
                <Switch
                  checked={mainImgShowPreview}
                  onChange={setMainImgShowPreview}
                />
              </div>

              <div className={styles.controlItem}>
                <span>禁用状态:</span>
                <Switch
                  checked={mainImgDisabled}
                  onChange={setMainImgDisabled}
                />
              </div>
            </div>

            <MainImgUpload
              value={mainImgUrl}
              onChange={setMainImgUrl}
              disabled={mainImgDisabled}
              maxSize={mainImgMaxSize}
              showPreview={mainImgShowPreview}
            />

            <div className={styles.result}>
              <h4>当前主图URL:</h4>
              <div className={styles.urlList}>
                <div className={styles.urlItem}>
                  {mainImgUrl ? (
                    <div className={styles.url}>
                      {typeof mainImgUrl === "string" ? mainImgUrl : "无效URL"}
                    </div>
                  ) : (
                    <span className={styles.emptyText}>暂无主图</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </ErrorBoundary>
      </div>
    </Layout>
  );
};

export default UploadTestPage;
