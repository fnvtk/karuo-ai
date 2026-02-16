import React from "react";
import { Modal, Card, Tag, Badge } from "antd";
import {
  PictureOutlined,
  VideoCameraOutlined,
  LinkOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { listData } from "./api";

interface PreviewMomentModalProps {
  visible: boolean;
  onCancel: () => void;
  momentData?: listData;
}

const PreviewMomentModal: React.FC<PreviewMomentModalProps> = ({
  visible,
  onCancel,
  momentData,
}) => {
  if (!momentData) return null;

  // 获取内容类型信息
  const getContentTypeInfo = (type: number) => {
    switch (type) {
      case 1:
        return { icon: <FileTextOutlined />, label: "文本", color: "blue" };
      case 2:
        return { icon: <PictureOutlined />, label: "图文", color: "green" };
      case 3:
        return {
          icon: <VideoCameraOutlined />,
          label: "视频",
          color: "purple",
        };
      case 4:
        return { icon: <LinkOutlined />, label: "链接", color: "orange" };
      default:
        return { icon: <FileTextOutlined />, label: "未知", color: "default" };
    }
  };

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "未设置";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取状态信息
  const getStatusInfo = (isSend: number) => {
    switch (isSend) {
      case 0:
        return { status: "processing" as const, text: "待发布" };
      case 1:
        return { status: "success" as const, text: "已发布" };
      case 2:
        return { status: "error" as const, text: "发布失败" };
      default:
        return { status: "default" as const, text: "未知" };
    }
  };

  const contentTypeInfo = getContentTypeInfo(momentData.momentContentType);
  const statusInfo = getStatusInfo(momentData.isSend);

  return (
    <Modal
      title="朋友圈预览"
      open={visible}
      onCancel={onCancel}
      width={500}
      footer={null}
    >
      <Card className="preview-card">
        <div className="preview-header">
          <div className="preview-status">
            <Badge status={statusInfo.status} text={statusInfo.text} />
            <Tag
              color={contentTypeInfo.color}
              icon={contentTypeInfo.icon}
              style={{ marginLeft: 8 }}
            >
              {contentTypeInfo.label}
            </Tag>
          </div>
        </div>

        <div className="preview-content">
          <div className="preview-text">{momentData.text || "无文本内容"}</div>

          {/* 图片预览 */}
          {momentData.picUrlList && momentData.picUrlList.length > 0 && (
            <div className="preview-images">
              {momentData.picUrlList.map((image, index) => (
                <div key={index} className="preview-image-item">
                  <img
                    src={image}
                    alt={`图片${index + 1}`}
                    className="preview-image"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 视频预览 */}
          {momentData.videoUrl && (
            <div className="preview-video">
              <div className="preview-video-icon">
                <VideoCameraOutlined />
              </div>
              <span className="preview-video-text">视频内容</span>
            </div>
          )}

          {/* 链接预览 */}
          {momentData.link && momentData.link.length > 0 && (
            <div className="preview-link">
              <LinkOutlined className="preview-link-icon" />
              <span className="preview-link-text">
                {momentData.link.length} 个链接
              </span>
            </div>
          )}
        </div>

        <div className="preview-details">
          <div className="preview-detail-item">
            <span className="preview-detail-label">发布时间:</span>
            <span className="preview-detail-value">
              {formatTime(momentData.sendTime)}
            </span>
          </div>
          <div className="preview-detail-item">
            <span className="preview-detail-label">账号数量:</span>
            <span className="preview-detail-value">
              {momentData.accountCount} 个账号
            </span>
          </div>
          <div className="preview-detail-item">
            <span className="preview-detail-label">创建时间:</span>
            <span className="preview-detail-value">
              {formatTime(momentData.createTime)}
            </span>
          </div>
        </div>
      </Card>

      <style jsx>{`
        .preview-card {
          border: 1px solid #f0f0f0;
          border-radius: 8px;
        }

        .preview-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .preview-status {
          display: flex;
          align-items: center;
        }

        .preview-content {
          margin-bottom: 16px;
        }

        .preview-text {
          font-size: 14px;
          line-height: 1.6;
          color: #262626;
          margin-bottom: 12px;
          word-break: break-word;
        }

        .preview-images {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .preview-image-item {
          width: 80px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #e8e8e8;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-video {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f0f8ff;
          border: 1px solid #d6e4ff;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .preview-video-icon {
          color: #1890ff;
          font-size: 16px;
        }

        .preview-video-text {
          color: #1890ff;
          font-size: 14px;
        }

        .preview-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #fff7e6;
          border: 1px solid #ffd591;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .preview-link-icon {
          color: #fa8c16;
          font-size: 16px;
        }

        .preview-link-text {
          color: #fa8c16;
          font-size: 14px;
        }

        .preview-details {
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          border-left: 3px solid #1890ff;
        }

        .preview-detail-item {
          display: flex;
          align-items: center;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .preview-detail-item:last-child {
          margin-bottom: 0;
        }

        .preview-detail-label {
          color: #8c8c8c;
          min-width: 80px;
          margin-right: 8px;
        }

        .preview-detail-value {
          color: #595959;
          font-weight: 500;
        }
      `}</style>
    </Modal>
  );
};

export default PreviewMomentModal;
