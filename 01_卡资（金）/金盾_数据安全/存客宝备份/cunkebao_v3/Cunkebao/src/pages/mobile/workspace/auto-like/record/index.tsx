import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Button,
  Input,
  Card,
  Badge,
  Avatar,
  Skeleton,
  message,
  Spin,
  Divider,
  Pagination,
} from "antd";
import {
  LikeOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import styles from "./record.module.scss";
import NavCommon from "@/components/NavCommon";
import { fetchLikeRecords } from "./api";
import Layout from "@/components/Layout/Layout";

// 格式化日期
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return dateString;
  }
};

export default function AutoLikeRecord() {
  const { id } = useParams<{ id: string }>();
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (!id) return;
    setRecordsLoading(true);
    fetchLikeRecords(id, 1, pageSize)
      .then((response: any) => {
        setRecords(response.list || []);
        setTotal(response.total || 0);
        setCurrentPage(1);
      })
      .catch(() => {
        message.error("获取点赞记录失败，请稍后重试");
      })
      .finally(() => setRecordsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLikeRecords(id!, 1, pageSize, searchTerm)
      .then((response: any) => {
        setRecords(response.list || []);
        setTotal(response.total || 0);
        setCurrentPage(1);
      })
      .catch(() => {
        message.error("获取点赞记录失败，请稍后重试");
      });
  };

  const handleRefresh = () => {
    fetchLikeRecords(id!, currentPage, pageSize, searchTerm)
      .then((response: any) => {
        setRecords(response.list || []);
        setTotal(response.total || 0);
      })
      .catch(() => {
        message.error("获取点赞记录失败，请稍后重试");
      });
  };

  const handlePageChange = (newPage: number) => {
    fetchLikeRecords(id!, newPage, pageSize, searchTerm)
      .then((response: any) => {
        setRecords(response.list || []);
        setTotal(response.total || 0);
        setCurrentPage(newPage);
      })
      .catch(() => {
        message.error("获取点赞记录失败，请稍后重试");
      });
  };

  return (
    <Layout
      header={
        <>
          <NavCommon title="点赞记录" />
          <div className={styles.headerSearchBar}>
            <div className={styles.headerSearchInputWrap}>
              <Input
                prefix={<SearchOutlined className={styles.headerSearchIcon} />}
                placeholder="搜索好友昵称或内容"
                className={styles.headerSearchInput}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </div>
            <Button
              icon={<ReloadOutlined spin={recordsLoading} />}
              onClick={handleRefresh}
              loading={recordsLoading}
              type="default"
              shape="circle"
            />
          </div>
        </>
      }
      footer={
        <>
          <div className={styles.footerPagination}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper
              size="default"
              className={styles.pagination}
            />
          </div>
        </>
      }
    >
      <div className={styles.bgWrap}>
        <div className={styles.contentWrap}>
          {recordsLoading ? (
            <div className={styles.skeletonWrap}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                  <div className={styles.skeletonCardHeader}>
                    <Skeleton.Avatar
                      active
                      size={40}
                      className={styles.skeletonAvatar}
                    />
                    <div className={styles.skeletonNameWrap}>
                      <Skeleton.Input
                        active
                        size="small"
                        className={styles.skeletonName}
                        style={{ width: 96 }}
                      />
                      <Skeleton.Input
                        active
                        size="small"
                        className={styles.skeletonSub}
                        style={{ width: 64 }}
                      />
                    </div>
                  </div>
                  <Divider className={styles.skeletonSep} />
                  <div className={styles.skeletonContentWrap}>
                    <Skeleton.Input
                      active
                      size="small"
                      className={styles.skeletonContent1}
                      style={{ width: "100%" }}
                    />
                    <Skeleton.Input
                      active
                      size="small"
                      className={styles.skeletonContent2}
                      style={{ width: "75%" }}
                    />
                    <div className={styles.skeletonImgWrap}>
                      <Skeleton.Image
                        active
                        className={styles.skeletonImg}
                        style={{ width: 80, height: 80 }}
                      />
                      <Skeleton.Image
                        active
                        className={styles.skeletonImg}
                        style={{ width: 80, height: 80 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className={styles.emptyWrap}>
              <LikeOutlined className={styles.emptyIcon} />
              <p className={styles.emptyText}>暂无点赞记录</p>
            </div>
          ) : (
            <>
              {records.map(record => (
                <div key={record.id} className={styles.recordCard}>
                  <div className={styles.recordCardHeader}>
                    <div className={styles.recordCardHeaderLeft}>
                      <Avatar
                        src={record.friendAvatar || undefined}
                        icon={<UserOutlined />}
                        size={40}
                        className={styles.avatarImg}
                      />
                      <div className={styles.friendInfo}>
                        <div
                          className={styles.friendName}
                          title={record.friendName}
                        >
                          {record.friendName}
                        </div>
                        <div className={styles.friendSub}>内容发布者</div>
                      </div>
                    </div>
                    <Badge
                      className={styles.timeBadge}
                      count={formatDate(record.likeTime || record.momentTime)}
                      style={{
                        background: "#e8f0fe",
                        color: "#333",
                        fontWeight: 400,
                      }}
                    />
                  </div>
                  <Divider className={styles.cardSep} />
                  <div className={styles.cardContent}>
                    {record.content && (
                      <p className={styles.contentText}>{record.content}</p>
                    )}
                    {Array.isArray(record.resUrls) &&
                      record.resUrls.length > 0 && (
                        <div
                          className={
                            `${styles.imgGrid} ` +
                            (record.resUrls.length === 1
                              ? styles.grid1
                              : record.resUrls.length === 2
                                ? styles.grid2
                                : record.resUrls.length <= 3
                                  ? styles.grid3
                                  : record.resUrls.length <= 6
                                    ? styles.grid6
                                    : styles.grid9)
                          }
                        >
                          {record.resUrls
                            .slice(0, 9)
                            .map((image: string, idx: number) => (
                              <div key={idx} className={styles.imgItem}>
                                <img
                                  src={image}
                                  alt={`内容图片 ${idx + 1}`}
                                  className={styles.img}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                  </div>
                  <div className={styles.operatorWrap}>
                    <Avatar
                      src={record.operatorAvatar || undefined}
                      icon={<UserOutlined />}
                      size={32}
                      className={styles.operatorAvatar}
                    />
                    <div className={styles.operatorInfo}>
                      <span
                        className={styles.operatorName}
                        title={record.operatorName}
                      >
                        {record.operatorName}
                      </span>
                      <span className={styles.operatorAction}>
                        <LikeOutlined
                          style={{ color: "red", marginRight: 4 }}
                        />
                        已赞
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
