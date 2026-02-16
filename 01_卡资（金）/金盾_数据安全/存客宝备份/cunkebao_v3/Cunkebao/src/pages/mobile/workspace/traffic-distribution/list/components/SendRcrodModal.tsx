import React, { useEffect, useState } from "react";
import { Popup, Avatar, SpinLoading, Input } from "antd-mobile";
import { Button, message, Pagination } from "antd";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import style from "../index.module.scss";
import { fetchTransferFriends } from "../api";

interface SendRecordItem {
  id: string | number;
  nickname?: string;
  wechatId?: string;
  avatar?: string;
  status?: string;
  isRecycle?: number;
  sendTime?: string;
  sendCount?: number;
  account?: string;
  username?: string;
  createTime?: string;
  recycleTime?: string;
}

interface SendRcrodModalProps {
  visible: boolean;
  onClose: () => void;
  ruleId?: number;
  ruleName?: string;
}

const SendRcrodModal: React.FC<SendRcrodModalProps> = ({
  visible,
  onClose,
  ruleId,
  ruleName,
}) => {
  const [sendRecords, setSendRecords] = useState<SendRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [recycleFilter, setRecycleFilter] = useState<number | undefined>(undefined); // undefined=全部, 0=未回收, 1=已回收
  const pageSize = 20;

  // 获取分发记录数据
  const fetchSendRecords = async (page = 1, keyword = "", isRecycle?: number) => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const detailRes = await fetchTransferFriends({
        workbenchId: ruleId,
        page,
        limit: pageSize,
        keyword,
        isRecycle,
      });
      console.log(detailRes);

      const recordData = detailRes.list || [];
      setSendRecords(recordData);
      setTotal(detailRes.total || 0);
    } catch (error) {
      console.error("获取分发记录失败:", error);
      message.error("获取分发记录失败");
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开且有ruleId时，获取数据
  useEffect(() => {
    if (visible && ruleId) {
      setCurrentPage(1);
      setSearchQuery("");
      setSearchKeyword("");
      setRecycleFilter(undefined);
      fetchSendRecords(1, "", undefined);
    }
  }, [visible, ruleId]);

  // 搜索关键词变化时触发搜索
  useEffect(() => {
    if (!visible || !ruleId) return;
    setCurrentPage(1);
    fetchSendRecords(1, searchKeyword, recycleFilter);
  }, [searchKeyword]);

  // 筛选条件变化时触发搜索
  useEffect(() => {
    if (!visible || !ruleId) return;
    setCurrentPage(1);
    fetchSendRecords(1, searchKeyword, recycleFilter);
  }, [recycleFilter]);

  // 页码变化
  useEffect(() => {
    if (!visible || !ruleId) return;
    fetchSendRecords(currentPage, searchKeyword, recycleFilter);
  }, [currentPage]);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理搜索回车
  const handleSearchEnter = () => {
    setSearchKeyword(searchQuery);
  };

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const title = ruleName ? `${ruleName} - 分发统计` : "分发统计";
  const getRecycleColor = (isRecycle?: number) => {
    switch (isRecycle) {
      case 0:
        return "#52c41a"; // 绿色 - 未回收
      case 1:
        return "#ff4d4f"; // 红色 - 已回收
      default:
        return "#d9d9d9"; // 灰色 - 未知状态
    }
  };

  const getRecycleText = (isRecycle?: number) => {
    switch (isRecycle) {
      case 0:
        return "未回收";
      case 1:
        return "已回收";
      default:
        return "未知";
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: "100vh",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div className={style.accountModal}>
        {/* 头部 */}
        <div className={style.accountModalHeader}>
          <h3 className={style.accountModalTitle}>{title}</h3>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={style.accountModalClose}
          />
        </div>

        {/* 搜索栏 */}
        <div className={style.searchBar}>
          <div className={style.searchInputWrapper}>
            <SearchOutlined className={style.searchIcon} />
            <Input
              placeholder="搜索分发记录（回车搜索）"
              value={searchQuery}
              onChange={handleSearchChange}
              onEnterPress={handleSearchEnter}
              clearable
            />
          </div>
        </div>

        {/* 回收状态筛选 */}
        <div className={style.filterBar}>
          <div className={style.filterLabel}>回收状态：</div>
          <div className={style.filterOptions}>
            <div
              className={`${style.filterOption} ${
                recycleFilter === undefined ? style.active : ""
              }`}
              onClick={() => setRecycleFilter(undefined)}
            >
              全部
            </div>
            <div
              className={`${style.filterOption} ${
                recycleFilter === 0 ? style.active : ""
              }`}
              onClick={() => setRecycleFilter(0)}
            >
              未回收
            </div>
            <div
              className={`${style.filterOption} ${
                recycleFilter === 1 ? style.active : ""
              }`}
              onClick={() => setRecycleFilter(1)}
            >
              已回收
            </div>
          </div>
        </div>

        {/* 分发记录列表 */}
        <div className={style.accountList}>
          {loading ? (
            <div className={style.accountLoading}>
              <SpinLoading color="primary" />
              <div className={style.accountLoadingText}>
                正在加载分发记录...
              </div>
            </div>
          ) : sendRecords.length > 0 ? (
            sendRecords.map((record, index) => (
              <div key={record.id || index} className={style.accountItem}>
                <div className={style.accountAvatar}>
                  <Avatar
                    src={record.avatar}
                    style={{ "--size": "48px" }}
                    fallback={(record.nickname || record.wechatId || "账号")[0]}
                  />
                </div>
                <div className={style.accountInfo}>
                  <div className={style.accountName}>
                    {record.nickname || record.wechatId || `账号${record.id}`}
                  </div>
                  <div className={style.accountWechatId}>
                    {record.wechatId || "未绑定微信号"}
                  </div>
                  {record.account && (
                    <div className={style.accountAccount}>
                      所属账号：{record.account}
                      {record.username && `（${record.username}）`}
                    </div>
                  )}
                </div>
                <div className={style.accountStatus}>
                  <span
                    className={style.statusDot}
                    style={{
                      backgroundColor: getRecycleColor(record.isRecycle),
                    }}
                  />
                  <span className={style.statusText}>
                    {getRecycleText(record.isRecycle)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={style.accountEmpty}>
              <div className={style.accountEmptyText}>暂无分发记录</div>
            </div>
          )}
        </div>

        {/* 底部统计和分页 */}
        <div className={style.accountModalFooter}>
          <div className={style.accountStats}>
            <span>共 {total} 条分发记录</span>
          </div>
          <div className={style.paginationContainer}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper={false}
              size="small"
            />
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default SendRcrodModal;
