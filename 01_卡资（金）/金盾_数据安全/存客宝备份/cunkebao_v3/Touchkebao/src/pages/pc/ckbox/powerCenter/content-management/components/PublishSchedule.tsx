import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Card,
  Badge,
  Button,
  message,
  Popconfirm,
  Empty,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  LinkOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { getMomentList, deleteMoment, listData } from "./api";
import EditMomentModal from "./EditMomentModal";
import PreviewMomentModal from "./PreviewMomentModal";
import styles from "./PublishSchedule.module.scss";

// 定义组件暴露的方法接口
export interface PublishScheduleRef {
  refresh: () => void;
}

const PublishSchedule = forwardRef<PublishScheduleRef>((props, ref) => {
  const [scheduledPosts, setScheduledPosts] = useState<listData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<listData | undefined>();

  // 获取内容类型图标和标签
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
      case 5:
        return { icon: <AppstoreOutlined />, label: "小程序", color: "cyan" };
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

  // 获取发布计划列表
  const fetchScheduledMoments = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const response = await getMomentList({ page, limit: pagination.limit });
        setScheduledPosts(response.list);
        setPagination(prev => ({ ...prev, page, total: response.total }));
      } catch (error) {
        console.error("获取发布计划失败:", error);
        message.error("获取发布计划失败");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit],
  );

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchScheduledMoments(pagination.page);
    },
  }));

  // 组件挂载时获取数据
  useEffect(() => {
    fetchScheduledMoments();
  }, [fetchScheduledMoments]);

  const handleDeletePost = async (postId: number) => {
    try {
      const success = await deleteMoment({ id: postId });
      if (success) {
        setScheduledPosts(prev => prev.filter(post => post.id !== postId));
        message.success("删除成功");
        // 如果当前页没有数据了，回到上一页
        if (scheduledPosts.length === 1 && pagination.page > 1) {
          fetchScheduledMoments(pagination.page - 1);
        }
      } else {
        message.error("删除失败，请重试");
      }
    } catch (error) {
      console.error("删除发布计划失败:", error);
      message.error("删除失败，请重试");
    }
  };

  const handleEditPost = (post: listData) => {
    setSelectedMoment(post);
    setEditModalVisible(true);
  };

  const handleViewPost = (post: listData) => {
    setSelectedMoment(post);
    setPreviewModalVisible(true);
  };

  const handleEditSuccess = () => {
    // 编辑成功后刷新列表
    fetchScheduledMoments(pagination.page);
  };

  const getStatusBadge = (isSend: number) => {
    switch (isSend) {
      case 0:
        return <Badge status="processing" text="待发布" />;
      case 1:
        return <Badge status="success" text="已发布" />;
      case 2:
        return <Badge status="error" text="发布失败" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };

  const handleRefresh = () => {
    fetchScheduledMoments(pagination.page);
  };

  return (
    <div className={styles.publishSchedule}>
      <div className={styles.header}>
        <h3 className={styles.title}>发布计划</h3>
        <div className={styles.headerActions}>
          <Button
            type="text"
            icon={<ClockCircleOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

      <div className={styles.scheduleList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
            <div className={styles.loadingText}>加载中...</div>
          </div>
        ) : scheduledPosts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div className={styles.emptyText}>暂无发布计划</div>
                <div className={styles.emptySubText}>
                  创建朋友圈内容后可以设置定时发布
                </div>
              </div>
            }
          />
        ) : (
          scheduledPosts.map(post => {
            const contentTypeInfo = getContentTypeInfo(post.momentContentType);
            return (
              <Card key={post.id} className={styles.scheduleCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.headerLeft}>
                    <div className={styles.statusBadge}>
                      {getStatusBadge(post.isSend)}
                    </div>
                    <Tag
                      color={contentTypeInfo.color}
                      icon={contentTypeInfo.icon}
                      className={styles.typeTag}
                    >
                      {contentTypeInfo.label}
                    </Tag>
                  </div>
                  <div className={styles.headerActions}>
                    <Tooltip title="预览">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewPost(post)}
                        size="small"
                        className={styles.actionButton}
                      />
                    </Tooltip>
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditPost(post)}
                        size="small"
                        className={styles.actionButton}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定要删除这条发布计划吗？"
                      onConfirm={() => handleDeletePost(post.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          className={styles.deleteButton}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.postContent}>
                    {post.content || "无文本内容"}
                  </div>

                  {/* 图片展示 */}
                  {post.picUrlList && post.picUrlList.length > 0 && (
                    <div className={styles.postImages}>
                      {post.picUrlList.slice(0, 3).map((image, index) => (
                        <div key={index} className={styles.imagePlaceholder}>
                          <img
                            src={image}
                            alt={`图片${index + 1}`}
                            className={styles.imagePreview}
                            onError={e => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              (
                                e.target as HTMLImageElement
                              ).nextElementSibling?.classList.add(styles.show);
                            }}
                          />
                          <div className={styles.imageIcon}>
                            <PictureOutlined />
                          </div>
                        </div>
                      ))}
                      {post.picUrlList.length > 3 && (
                        <div className={styles.moreImages}>
                          +{post.picUrlList.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 视频展示 */}
                  {post.videoUrl && (
                    <div className={styles.videoPreview}>
                      <div className={styles.videoIcon}>
                        <VideoCameraOutlined />
                      </div>
                      <span className={styles.videoText}>视频内容</span>
                    </div>
                  )}

                  {/* 链接展示 */}
                  {post.link && post.link.length > 0 && (
                    <div className={styles.linkPreview}>
                      <LinkOutlined className={styles.linkIcon} />
                      <span className={styles.linkText}>
                        {post.link.length} 个链接
                      </span>
                    </div>
                  )}

                  <div className={styles.postDetails}>
                    <div className={styles.detailItem}>
                      <ClockCircleOutlined className={styles.detailIcon} />
                      <span className={styles.detailLabel}>发布时间:</span>
                      <span className={styles.detailValue}>
                        {formatTime(post.sendTime)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <UserOutlined className={styles.detailIcon} />
                      <span className={styles.detailLabel}>账号数量:</span>
                      <span className={styles.detailValue}>
                        {post.accountCount} 个账号
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>创建时间:</span>
                      <span className={styles.detailValue}>
                        {formatTime(post.createTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 分页信息 */}
      {scheduledPosts.length > 0 && (
        <div className={styles.paginationInfo}>
          <span className={styles.paginationText}>
            共 {pagination.total} 条记录，当前第 {pagination.page} 页
          </span>
        </div>
      )}

      {/* 编辑弹窗 */}
      <EditMomentModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
        momentData={selectedMoment}
      />

      {/* 预览弹窗 */}
      <PreviewMomentModal
        visible={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        momentData={selectedMoment}
      />
    </div>
  );
});

PublishSchedule.displayName = "PublishSchedule";

export default PublishSchedule;
