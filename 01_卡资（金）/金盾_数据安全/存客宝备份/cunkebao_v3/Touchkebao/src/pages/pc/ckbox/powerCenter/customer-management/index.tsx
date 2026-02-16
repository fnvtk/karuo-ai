import React, { useState, useEffect } from "react";
import PowerNavigation from "@/components/PowerNavtion";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";
import styles from "./index.module.scss";
import { Button, Input, Table, message } from "antd";
import { getContactList } from "@/pages/pc/ckbox/weChat/api";
import { ContractData } from "@/pages/pc/ckbox/data";
import Layout from "@/components/Layout/LayoutFiexd";
// 头像组件
const Avatar: React.FC<{ name: string; avatar?: string; size?: number }> = ({
  name,
  avatar,
  size = 40,
}) => {
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "#1890ff",
      "#52c41a",
      "#faad14",
      "#f5222d",
      "#722ed1",
      "#13c2c2",
      "#eb2f96",
      "#fa8c16",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={styles.avatar}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={styles.avatarPlaceholder}
      style={{
        width: size,
        height: size,
        backgroundColor: getAvatarColor(name),
        fontSize: size * 0.4,
      }}
    >
      {getInitials(name)}
    </div>
  );
};

const CustomerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [contacts, setContacts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0,
  });

  // 获取各分类的总数
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    customer: 0,
    potential: 0,
    partner: 0,
    friend: 0,
  });

  const tabs = [
    { key: "all", label: "全部", count: tabCounts.all },
    { key: "customer", label: "客户", count: tabCounts.customer },
    { key: "potential", label: "潜在客户", count: tabCounts.potential },
    { key: "partner", label: "合作伙伴", count: tabCounts.partner },
    { key: "friend", label: "朋友", count: tabCounts.friend },
  ];

  // 加载联系人数据
  const loadContacts = async (page: number = 1, pageSize: number = 12) => {
    try {
      setLoading(true);

      // 构建请求参数
      const params: any = {
        page,
        limit: pageSize,
      };

      // 添加搜索条件
      if (searchValue.trim()) {
        params.keyword = searchValue;
      }

      // 添加分类筛选
      if (activeTab === "customer") {
        params.isPassed = true;
      } else if (activeTab === "potential") {
        params.isPassed = false;
      }
      // "全部"、"partner" 和 "friend" 不添加额外筛选条件

      const response = await getContactList(params);

      // 假设接口返回格式为 { data: Contact[], total: number, page: number, limit: number }
      setContacts(response.data || response.list || []);
      setPagination(prev => ({
        ...prev,
        current: response.page || page,
        pageSize: response.limit || pageSize,
        total: response.total || 0,
      }));

      // 更新分类统计
      if (page === 1) {
        // 只在第一页时更新统计，避免重复请求
        const allResponse = await getContactList({ page: 1, limit: 1 });
        const customerResponse = await getContactList({
          page: 1,
          limit: 1,
          isPassed: true,
        });
        const potentialResponse = await getContactList({
          page: 1,
          limit: 1,
          isPassed: false,
        });

        setTabCounts({
          all: allResponse.total || 0,
          customer: customerResponse.total || 0,
          potential: potentialResponse.total || 0,
          partner: 0, // 可以根据业务逻辑调整
          friend: 0, // 可以根据业务逻辑调整
        });
      }
    } catch (error) {
      console.error("加载联系人数据失败:", error);
      message.error("加载联系人数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 当分类或搜索条件改变时重新加载数据
  useEffect(() => {
    loadContacts(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchValue, pagination.pageSize]);

  const filteredContacts = contacts;

  return (
    <Layout
      header={
        <>
          <div style={{ padding: "20px" }}>
            <PowerNavigation
              title="客户好友管理"
              subtitle="管理客户关系,维护好友信息"
              showBackButton={true}
              backButtonText="返回功能中心"
              rightContent={<Button>添加好友</Button>}
            />
            {/* 搜索和筛选 */}
            <div className={styles.searchBar}>
              <Input
                placeholder="搜索好友姓名、公司或标签..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
              <Button
                onClick={() => loadContacts(1, pagination.pageSize)}
                size="large"
                className={styles["refresh-btn"]}
                loading={loading}
              >
                <FilterOutlined />
                刷新
              </Button>
            </div>
            {/* 标签按钮组 */}
            <div className={styles.tabs}>
              {tabs.map(tab => (
                <Button
                  key={tab.key}
                  type={activeTab === tab.key ? "primary" : "default"}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span style={{ marginLeft: 6, opacity: 0.85 }}>
                    {tab.count}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </>
      }
      footer={null}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          {/* 联系人表格 */}
          <Table
            rowKey={(record: any) => record.id || record.serverId}
            loading={loading}
            dataSource={filteredContacts as any}
            columns={[
              {
                title: "客户姓名",
                key: "name",
                render: (_: any, record: any) => {
                  const displayName =
                    record.conRemark ||
                    record.nickname ||
                    record.alias ||
                    "未知用户";
                  return (
                    <div className={styles.contactInfo}>
                      <Avatar
                        name={displayName}
                        avatar={record.avatar}
                        size={40}
                      />
                      <div className={styles.nameSection}>
                        <h3 className={styles.contactName}>{displayName}</h3>
                        <p className={styles.roleCompany}>
                          客户 · {record.desc || "未设置公司"}
                        </p>
                      </div>
                    </div>
                  );
                },
              },
              {
                title: "RFM评分",
                dataIndex: "rfmScore",
                key: "rfmScore",
                width: 100,
                render: (val: any) => val ?? "-",
              },
              {
                title: "电话",
                dataIndex: "phone",
                key: "phone",
                width: 180,
                render: (val: string) => val || "未设置电话",
              },
              {
                title: "微信号",
                dataIndex: "wechatId",
                key: "wechatId",
                width: 200,
              },
              {
                title: "地址",
                key: "address",
                ellipsis: true,
                render: (_: any, record: any) =>
                  record.region || record.city || "未设置地区",
              },
              {
                title: "标签",
                key: "labels",
                render: (_: any, record: any) => (
                  <div className={styles.tags}>
                    {(record?.labels || []).map(
                      (tag: string, index: number) => (
                        <span key={index} className={styles.tag}>
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                ),
              },
              {
                title: "操作",
                key: "action",
                width: 120,
                render: () => (
                  <Button type="primary" size="small">
                    聊天
                  </Button>
                ),
              },
            ]}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number, range: [number, number]) =>
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              pageSizeOptions: ["6", "12", "24", "48"],
            }}
            onChange={(pager: any) => {
              const nextCurrent = pager.current || 1;
              const nextSize = pager.pageSize || pagination.pageSize;
              loadContacts(nextCurrent, nextSize);
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerManagement;
