import React, { useState, useEffect } from "react";
import { Button, SpinLoading, Toast } from "antd-mobile";
import { Pagination, Input, Tooltip } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import { getWechatAccounts } from "./api";
import NavCommon from "@/components/NavCommon";

interface WechatAccount {
  id: number;
  nickname: string;
  avatar: string;
  wechatId: string;
  deviceId: number;
  times: number; // 今日可添加
  addedCount: number; // 今日新增
  wechatStatus: number; // 1正常 0异常
  totalFriend: number;
  deviceMemo: string; // 设备名
  activeTime: string; // 最后活跃
}

const PAGE_SIZE = 10;

const WechatAccounts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  // 获取路由参数 wechatStatus
  const wechatStatus = searchParams.get("wechatStatus");

  const fetchAccounts = async (page = 1, keyword = "", status?: "all" | "online" | "offline") => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        page_size: PAGE_SIZE,
        keyword,
      };

      // 优先使用传入的status参数，否则使用路由参数，最后使用状态中的筛选
      const filterStatus = status || wechatStatus || statusFilter;

      if (filterStatus && filterStatus !== "all") {
        params.wechatStatus = filterStatus === "online" ? "1" : "0";
      } else if (wechatStatus) {
        params.wechatStatus = wechatStatus;
      }

      const res = await getWechatAccounts(params);
      if (res && res.list) {
        setAccounts(res.list);
        setTotalAccounts(res.total || 0);
      } else {
        setAccounts([]);
        setTotalAccounts(0);
      }
    } catch (e) {

      setAccounts([]);
      setTotalAccounts(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(currentPage, searchTerm, statusFilter);
    // eslint-disable-next-line
  }, [currentPage, statusFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAccounts(1, searchTerm, statusFilter);
  };

  const handleStatusFilterChange = (status: "all" | "online" | "offline") => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchAccounts(1, searchTerm, status);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAccounts(currentPage, searchTerm, statusFilter);
    setIsRefreshing(false);
    Toast.show({ content: "刷新成功", position: "top" });
  };

  const handleAccountClick = (account: WechatAccount) => {
    navigate(`/wechat-accounts/detail/${account.wechatId}`);
  };

  const handleTransferFriends = (account: WechatAccount) => {
    // TODO: 实现好友转移弹窗或跳转
    Toast.show({ content: `好友转移：${account.nickname}` });
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title={wechatStatus === "1" ? "在线微信号" : "微信号管理"}
          />
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索微信号/昵称"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
                onPressEnter={handleSearch}
              />
            </div>
            <Button
              size="small"
              onClick={handleRefresh}
              loading={isRefreshing}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
          </div>
          <div className={style["filter-bar"]}>
            <div className={style["filter-buttons"]}>
              <Button
                size="small"
                className={`${style["filter-button"]} ${statusFilter === "all" ? style["filter-button-active"] : ""}`}
                onClick={() => handleStatusFilterChange("all")}
              >
                全部
              </Button>
              <Button
                size="small"
                className={`${style["filter-button"]} ${statusFilter === "online" ? style["filter-button-active"] : ""}`}
                onClick={() => handleStatusFilterChange("online")}
              >
                在线
              </Button>
              <Button
                size="small"
                className={`${style["filter-button"]} ${statusFilter === "offline" ? style["filter-button-active"] : ""}`}
                onClick={() => handleStatusFilterChange("offline")}
              >
                离线
              </Button>
            </div>
          </div>
        </>
      }
    >
      <div className={style["wechat-accounts-page"]}>
        {isLoading ? (
          <div className={style["loading"]}>
            <SpinLoading color="primary" style={{ fontSize: 32 }} />
          </div>
        ) : accounts.length === 0 ? (
          <div className={style["empty"]}>暂无微信账号数据</div>
        ) : (
          <div className={style["card-list"]}>
            {accounts.map(account => {
              const percent =
                account.times > 0
                  ? Math.min((account.addedCount / account.times) * 100, 100)
                  : 0;
              return (
                <div
                  key={account.id}
                  className={style["account-card"]}
                  onClick={() => handleAccountClick(account)}
                >
                  <div className={style["card-header"]}>
                    <div className={style["avatar-wrapper"]}>
                      <img
                        src={account.avatar}
                        alt={account.nickname}
                        className={style["avatar"]}
                      />
                      <span
                        className={
                          account.wechatStatus === 1
                            ? style["status-dot-normal"]
                            : style["status-dot-abnormal"]
                        }
                      />
                    </div>
                    <div className={style["header-info"]}>
                      <div className={style["nickname-row"]}>
                        <span className={style["nickname"]}>
                          {account.nickname}
                        </span>
                        <span
                          className={
                            account.wechatStatus === 1
                              ? style["status-label-normal"]
                              : style["status-label-abnormal"]
                          }
                        >
                          {account.wechatStatus === 1 ? "正常" : "异常"}
                        </span>
                      </div>
                      <div className={style["wechat-id"]}>
                        微信号：{account.wechatId}
                      </div>
                    </div>
                  </div>
                  <div className={style["card-body"]}>
                    <div className={style["row-group"]}>
                      <div className={style["row-item"]}>
                        <span>好友数量：</span>
                        <span className={style["strong"]}>
                          {account.totalFriend}
                        </span>
                      </div>
                      <div className={style["row-item"]}>
                        <span>今日新增：</span>
                        <span className={style["strong-green"]}>
                          +{account.addedCount}
                        </span>
                      </div>
                    </div>
                    <div className={style["row-group"]}>
                      <div className={style["row-item"]}>
                        <span>今日可添加：</span>
                        <span>{account.times}</span>
                      </div>
                      <div className={style["row-item"]}>
                        <Tooltip title={`每日最多添加 ${account.times} 个好友`}>
                          <span>进度：</span>
                          <span>
                            {account.addedCount}/{account.times}
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                    <div className={style["progress-bar"]}>
                      <div className={style["progress-bg"]}>
                        <div
                          className={style["progress-fill"]}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className={style["row-group"]}>
                      <div className={style["row-item"]}>
                        <span>所属设备：</span>
                        <span>{account.deviceMemo || "-"}</span>
                      </div>
                      <div className={style["row-item"]}>
                        <span>最后活跃：</span>
                        <span>{account.activeTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className={style["pagination"]}>
          {totalAccounts > PAGE_SIZE && (
            <Pagination
              total={Math.ceil(totalAccounts / PAGE_SIZE)}
              current={currentPage}
              onChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default WechatAccounts;
