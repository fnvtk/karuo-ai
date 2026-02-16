import React, { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, message, Badge, Avatar } from "antd";
import { useCustomerStore, updateCustomerList } from "@weChatStore/customer";
import { getCustomerList } from "@apiModule/wechat";
import { addMoment } from "./api";
import styles from "./MomentPublish.module.scss";
import { KfUserListData } from "@/pages/pc/ckbox/data";
import UploadComponent from "@/components/Upload/ImageUpload/ImageUpload";
import VideoUpload from "@/components/Upload/VideoUpload";

interface MomentPublishProps {
  onPublishSuccess?: () => void;
}

const MomentPublish: React.FC<MomentPublishProps> = ({ onPublishSuccess }) => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [content, setContent] = useState<string>("");
  // 发布类型：1文本 2图文 3视频 4链接
  const [contentType, setContentType] = useState<number>(1);
  const [timingTime, setTimingTime] = useState<string>("");
  const [resUrls, setResUrls] = useState<string[]>([]); // 图片/视频等资源
  // 链接
  const [linkDesc, setLinkDesc] = useState<string>("");
  const [linkImage, setLinkImage] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [accounts, setAccounts] = useState<KfUserListData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [customerListLoading, setCustomerListLoading] =
    useState<boolean>(false);

  // 从store获取客服列表
  const customerList = useCustomerStore(state => state.customerList);

  // 初始化获取客服列表
  useEffect(() => {
    const fetchCustomerList = async () => {
      setCustomerListLoading(true);
      try {
        const res = await getCustomerList();
        updateCustomerList(res);
      } catch (error) {
        console.error("获取客服列表失败:", error);
        message.error("获取客服列表失败");
      } finally {
        setCustomerListLoading(false);
      }
    };

    // 如果客服列表为空，则获取
    if (customerList.length === 0) {
      fetchCustomerList();
    }
  }, []);

  // 获取账号使用情况
  const fetchAccountUsage = useCallback(async () => {
    if (customerList.length === 0) return;

    // 直接使用客服列表数据，不需要额外的API调用
    const accountData = customerList.map((customer, index) => ({
      ...customer,
      name: customer.nickname || `客服${index + 1}`,
      isSelected: selectedAccounts.includes(customer.id.toString()),
      isDisabled: customer.momentsNum >= customer.momentsMax,
    }));

    setAccounts(accountData);
  }, [customerList, selectedAccounts]);

  // 移除自动选择逻辑，允许用户手动选择或取消选择

  // 当客服列表变化时，重新获取使用情况
  useEffect(() => {
    fetchAccountUsage();
  }, [customerList, selectedAccounts, fetchAccountUsage]);

  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find(acc => acc.id.toString() === accountId);
    if (!account || account.isDisabled) return;

    // 允许取消选择：如果已选中则取消，未选中则选中
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId],
    );
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      message.warning("请输入朋友圈内容");
      return;
    }

    if (selectedAccounts.length === 0) {
      message.warning("请选择发布账号");
      return;
    }

    setLoading(true);
    try {
      // 根据API要求构造数据
      const publishData: any = {
        content: content.trim(),
        type: contentType.toString(),
        wechatIds: selectedAccounts,
      };

      // 根据内容类型添加相应字段
      switch (contentType) {
        case 1: // 文本
          // 文本类型只需要content
          break;
        case 2: // 图文
          if (resUrls.length > 0) {
            publishData.picUrlList = resUrls;
          }
          break;
        case 3: // 视频
          if (resUrls[0]) {
            publishData.videoUrl = resUrls[0];
          }
          break;
        case 4: // 链接
          if (linkUrl) {
            publishData["link[url]"] = [linkUrl];
            if (linkDesc) {
              publishData["link[desc]"] = [linkDesc];
            }
            if (linkImage) {
              publishData["link[image]"] = [linkImage];
            }
          }
          break;
      }

      // 添加定时发布时间
      if (timingTime) {
        // 将 datetime-local 格式转换为 "2025年10月20日17:06:34" 格式
        const date = new Date(timingTime);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");

        publishData.timingTime = `${year}年${month}月${day}日${hours}:${minutes}:${seconds}`;
      }
      console.log(publishData);

      await addMoment(publishData);

      message.success("发布成功！");
      // 重置表单
      setContent("");
      setResUrls([]);
      setLinkDesc("");
      setLinkImage("");
      setLinkUrl("");
      setTimingTime("");
      // 重新获取客服列表以更新使用情况
      try {
        const res = await getCustomerList();
        updateCustomerList(res);
      } catch (error) {
        console.error("刷新客服列表失败:", error);
      }
      // 触发父组件的刷新回调
      onPublishSuccess?.();
    } catch (error) {
      console.error("发布失败:", error);
      message.error("发布失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.momentPublish}>
      <h3 className={styles.title}>发布朋友圈</h3>

      {/* 选择发布账号 */}
      <div className={styles.accountSection}>
        <h4 className={styles.sectionTitle}>选择发布账号</h4>
        <div className={styles.accountList}>
          {accounts.map(account => (
            <div
              key={account.id}
              className={`${styles.accountCard} ${
                selectedAccounts.includes(account.id.toString())
                  ? styles.selected
                  : ""
              } ${account.isDisabled ? styles.disabled : ""}`}
              onClick={() => handleAccountSelect(account.id.toString())}
            >
              <div className={styles.accountInfo}>
                <div className={styles.avatarWrapper}>
                  <Avatar
                    src={account.avatar}
                    size={56}
                    className={styles.accountAvatar}
                    style={{
                      backgroundColor: !account.avatar ? "#1890ff" : undefined,
                    }}
                  >
                    {!account.avatar && account.name?.charAt(0)}
                  </Avatar>
                  {selectedAccounts.includes(account.id.toString()) && (
                    <div className={styles.selectedIndicator}>
                      <span className={styles.checkIcon}>✓</span>
                    </div>
                  )}
                </div>
                <div className={styles.accountName}>{account.name}</div>
                <Badge
                  count={`${account.momentsNum}/${account.momentsMax}`}
                  className={styles.usageBadge}
                  color={
                    account.momentsNum >= account.momentsMax ? "red" : "blue"
                  }
                />
                {account.isDisabled && (
                  <div className={styles.limitText}>今日已达上限</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 朋友圈内容 */}
      <div className={styles.contentSection}>
        {/* 发布时间 */}
        <div className={styles.formItem}>
          <label className={styles.formLabel}>发布时间</label>
          <Input
            type="datetime-local"
            value={timingTime}
            onChange={e => setTimingTime((e.target as HTMLInputElement).value)}
            placeholder="请选择发布时间"
            className={styles.contentInput}
          />
        </div>

        {/* 类型选择 */}
        <div className={styles.formItem}>
          <label className={styles.formLabel}>类型</label>
          <div>
            <Select
              value={contentType}
              onChange={value => setContentType(value)}
              className={styles.formSelect}
            >
              <Select.Option value={1}>文本</Select.Option>
              <Select.Option value={2}>图文</Select.Option>
              <Select.Option value={3}>视频</Select.Option>
              <Select.Option value={4}>链接</Select.Option>
            </Select>
          </div>
        </div>

        {/* 文本内容 */}
        <div className={styles.formItem}>
          <label className={styles.formLabel}>内容</label>
          <Input.TextArea
            value={content}
            onChange={handleContentChange}
            placeholder="请输入内容"
            className={styles.contentInput}
            rows={6}
            showCount
            maxLength={500}
          />
        </div>

        {/* 链接类型 */}
        {contentType === 4 && (
          <>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>描述</label>
              <Input
                value={linkDesc}
                onChange={e =>
                  setLinkDesc((e.target as HTMLInputElement).value)
                }
                placeholder="请输入描述"
                className={styles.contentInput}
              />
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>封面图</label>
              <UploadComponent
                value={linkImage ? [linkImage] : []}
                onChange={urls => setLinkImage(urls[0] || "")}
                count={1}
              />
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>链接地址</label>
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl((e.target as HTMLInputElement).value)}
                placeholder="请输入链接地址"
                className={styles.contentInput}
              />
            </div>
          </>
        )}

        {/* 视频类型 */}
        {contentType === 3 && (
          <div className={styles.formItem}>
            <label className={styles.formLabel}>视频上传</label>
            <div style={{ width: "40%" }}>
              <VideoUpload
                value={resUrls[0] || ""}
                onChange={url => setResUrls([url as string])}
              />
            </div>
          </div>
        )}

        {/* 图片/小程序 素材上传 */}
        {contentType === 2 && (
          <div className={styles.formItem}>
            <label className={styles.formLabel}>图片上传 (最多9张)</label>
            <UploadComponent value={resUrls} onChange={setResUrls} count={9} />
          </div>
        )}

        {/* 备注已移除 */}
      </div>

      {/* 发布按钮 */}
      <div className={styles.publishSection}>
        <Button
          type="primary"
          size="large"
          onClick={handlePublish}
          loading={loading}
          disabled={selectedAccounts.length === 0 || !content.trim()}
          className={styles.publishButton}
        >
          {loading ? "发布中..." : "发布朋友圈"}
        </Button>
      </div>
    </div>
  );
};

export default MomentPublish;
