import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Input, Button, Pagination, Dropdown, message } from "antd";
import styles from "./index.module.scss";
import { Empty } from "antd-mobile";
import { useNavigate } from "react-router-dom";
import NavCommon from "@/components/NavCommon";
import { getPackage, deletePackage } from "./api";
import type { Package, PackageList } from "./api";

// 分组图标映射
const getGroupIcon = (type: number, name?: string) => {
  if (type === 0 && name) {
    // type=0时使用分组名称首个字符
    return name.charAt(0).toUpperCase();
  }

  const icons = {
    1: "👥", // 高价值客户池
    2: "📈", // 潜在客户池
    3: "💬", // 高互动客户池
    4: "⭐", // 自定义分组
  };
  return icons[type] || "👥";
};

// 分组颜色映射
const getGroupColor = (type: number) => {
  const colors = {
    0: "#f0f0f0", // 灰色 - 自定义分组（使用名称首字符）
    1: "#ff4d4f", // 红色
    2: "#1890ff", // 蓝色
    3: "#52c41a", // 绿色
    4: "#722ed1", // 紫色
  };
  return colors[type] || "#1890ff";
};

const TrafficPoolList: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Package[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    // 触发数据重新获取
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          page: 1,
          pageSize,
          keyword: search,
        };

        const res: PackageList = await getPackage(params);
        setList(res?.list || []);
        setTotal(res?.total || 0);
      } catch (error) {
        console.error("获取列表失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      // eslint-disable-next-line no-alert
      if (!confirm(`确认删除数据包“${name}”吗？`)) return;
      await deletePackage(id);
      message.success("已删除");
      handleRefresh();
    } catch (e) {
      console.error(e);
      message.error("删除失败");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          pageSize,
          keyword: search,
        };

        const res: PackageList = await getPackage(params);
        setList(res?.list || []);
        setTotal(res?.total || 0);
      } catch (error) {
        console.error("获取列表失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, search]);

  return (
    <Layout
      loading={loading}
      header={
        <>
          <NavCommon
            title="流量池"
            right={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  navigate("/mine/traffic-pool/create");
                }}
              >
                新建分组
              </Button>
            }
          />

          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索分组"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              onClick={handleRefresh}
              loading={loading}
              size="large"
              icon={<ReloadOutlined />}
            />
          </div>
        </>
      }
      footer={
        <div className="pagination-container">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      }
    >
      <div className={styles.listWrap}>
        {list.length === 0 && !loading ? (
          <Empty description="暂无分组数据" />
        ) : (
          <div>
            {list.map(item => (
              <div key={item.id} className={styles.cardCompact}>
                <div className={styles.cardBody}>
                  <div
                    className={styles.menuButton}
                    onClick={e => e.stopPropagation()}
                  >
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "preview",
                            label: "预览用户",
                            onClick: () =>
                              navigate(
                                `/mine/traffic-pool/userList/${item.id}`,
                              ),
                          },
                          {
                            key: "delete",
                            danger: true,
                            label: "删除数据包",
                            onClick: () => handleDelete(item.id, item.name),
                          },
                        ],
                      }}
                      trigger={["click"]}
                    >
                      <MoreOutlined />
                    </Dropdown>
                  </div>

                  <div
                    style={{ display: "flex", gap: 10, flex: 1 }}
                    onClick={() =>
                      navigate(`/mine/traffic-pool/userList/${item.id}`)
                    }
                  >
                    {/* 左侧图片区域（优先展示 pic，缺省时使用假头像） */}
                    <div
                      className={styles.imageBox}
                      style={{ background: getGroupColor(item.type) }}
                    >
                      {item.pic ? (
                        <img
                          src={item.pic}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 24,
                            fontWeight: "bold",
                            color: "#333",
                          }}
                        >
                          {getGroupIcon(item.type, item.name)}
                        </span>
                      )}
                    </div>

                    {/* 右侧仅展示选中字段 */}
                    <div className={styles.contentArea}>
                      {/* 标题与人数 */}
                      <div className={styles.titleRow}>
                        <div className={styles.title}>{item.name}</div>
                        <div className={styles.timeTag}>共{item.num}人</div>
                      </div>

                      {/* RFM 汇总 */}
                      <div className={styles.ratingRow}>
                        <span className={styles.rating}>RFM：{item.RFM}</span>
                        <span className={styles.sales}>
                          R：{item.R} F：{item.F} M：{item.M}
                        </span>
                      </div>

                      {/* 类型与创建时间 */}
                      <div className={styles.deliveryInfo}>
                        <span>
                          类型: {item.type === 0 ? "自定义" : "系统分组"}
                        </span>
                        <span>创建:{item.createTime || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
//EEws
export default TrafficPoolList;
