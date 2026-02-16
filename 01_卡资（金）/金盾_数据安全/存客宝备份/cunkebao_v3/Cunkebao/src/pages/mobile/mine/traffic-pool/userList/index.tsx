import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { Input, Button, Pagination } from "antd";
import styles from "./index.module.scss";
import { Empty, Avatar } from "antd-mobile";
import NavCommon from "@/components/NavCommon";
import { fetchTrafficPoolList } from "./api";
import type { TrafficPoolUser } from "./data";

const defaultAvatar =
  "https://cdn.jsdelivr.net/gh/maokaka/static/avatar-default.png";

const TrafficPoolUserList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 基础状态
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<TrafficPoolUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  // 获取列表
  const getList = async (customParams?: any) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        keyword: search,
        packageId: id, // 根据流量包ID筛选用户
        ...customParams, // 允许传入自定义参数覆盖
      };

      const res = await fetchTrafficPoolList(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (error) {
      // 忽略请求过于频繁的错误，避免页面崩溃
      if (error !== "请求过于频繁，请稍后再试") {
        console.error("获取列表失败:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // 搜索防抖处理
  const [searchInput, setSearchInput] = useState(search);

  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      // 搜索时重置到第一页并请求列表
      setPage(1);
      getList({ keyword: searchInput, page: 1 });
    }, 500); // 500ms 防抖延迟

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handSearch = (value: string) => {
    setSearchInput(value);
    debouncedSearch();
  };

  // 初始加载和参数变化时重新获取数据
  useEffect(() => {
    getList();
  }, [page, pageSize, search, id]);

  return (
    <Layout
      loading={loading}
      header={
        <>
          <NavCommon title="用户列表" />
          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索用户"
                value={searchInput}
                onChange={e => handSearch(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              onClick={() => getList()}
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
            onChange={newPage => {
              setPage(newPage);
              getList({ page: newPage });
            }}
          />
        </div>
      }
    >
      <div className={styles.listWrap}>
        {list.length === 0 && !loading ? (
          <Empty description="暂无用户数据" />
        ) : (
          <div>
            {list.map(item => (
              <div key={item.id} className={styles.cardWrap}>
                <div
                  className={styles.card}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(
                      `/mine/traffic-pool/detail/${item.wechatId}/${item.id}`,
                    )
                  }
                >
                  <div className={styles.cardContent}>
                    <Avatar
                      src={item.avatar || defaultAvatar}
                      style={{ "--size": "60px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className={styles.title}>
                        {item.nickname || item.identifier}
                      </div>
                      <div className={styles.desc}>
                        微信号：{item.wechatId || "-"}
                      </div>
                      <div className={styles.desc}>
                        来源：{item.fromd || "-"}
                      </div>
                      <div className={styles.desc}>
                        分组：
                        {item.packages && item.packages.length
                          ? item.packages.join("，")
                          : "-"}
                      </div>
                      <div className={styles.desc}>
                        创建时间：{item.createTime}
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

export default TrafficPoolUserList;
