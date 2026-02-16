import React, { useState } from "react";
import { Button, Input, DatePicker, message } from "antd";
import dayjs from "dayjs";
import { CloseOutlined } from "@ant-design/icons";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import styles from "./index.module.scss";
const { RangePicker } = DatePicker;

const ChatRecordSearch: React.FC = () => {
  const [searchContent, setSearchContent] = useState<string>("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const SearchMessage = useWeChatStore(state => state.SearchMessage);
  const updateShowChatRecordModel = useWeChatStore(
    state => state.updateShowChatRecordModel,
  );
  // 执行查找
  const handleSearch = async () => {
    if (!dateRange) {
      message.warning("请选择时间范围");
      return;
    }

    // 移除重复请求拦截，允许并发请求

    try {
      setLoading(true);
      const [From, To] = dateRange;
      const searchData = {
        From: From.unix() * 1000,
        To: To.unix() * 1000,
        keyword: searchContent.trim(),
      };
      await SearchMessage(searchData);
      message.success("查找完成");
    } catch (error) {
      console.error("查找失败:", error);
      message.error("查找失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSearchContent("");
    setDateRange(null);
    setLoading(false);
    // 关闭搜索窗口，不触发搜索
    updateShowChatRecordModel(false);
  };

  return (
    <div className={styles.chatRecordSearch}>
      <div className={styles.searchContentContainer}>
        {/* 时间范围选择 */}
        <div className={styles.timeRange}>
          <div className={styles.timeRangeTitle}>时间范围</div>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: "100%" }}
            disabled={loading}
            placeholder={["开始日期", "结束日期"]}
          />
        </div>

        {/* 查找内容输入 */}
        <div className={styles.searchContent}>
          <div className={styles.searchContentTitle}>查找内容</div>
          <Input
            placeholder="请输入要查找的关键词或内容"
            value={searchContent}
            onChange={e => setSearchContent(e.target.value)}
            disabled={loading}
          />
          <Button type="primary" loading={loading} onClick={handleSearch}>
            查找
          </Button>
        </div>
      </div>
      <CloseOutlined style={{ fontSize: 20 }} onClick={handleCancel} />
    </div>
  );
};

export default ChatRecordSearch;
