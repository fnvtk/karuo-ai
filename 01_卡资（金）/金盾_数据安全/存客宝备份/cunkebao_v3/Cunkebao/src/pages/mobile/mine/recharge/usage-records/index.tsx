import React, { useEffect, useState } from "react";
import { Picker, Card, Tag, Toast } from "antd-mobile";
import { Pagination } from "antd";
import { DownOutline } from "antd-mobile-icons";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import { getTokensUseRecord } from "./api";

interface UsageRecordItem {
  id: number | string;
  title?: string;
  description?: string;
  power?: number;
  status?: string;
  createTime?: string;
  typeLabel?: string;
}

const UsageRecords: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<UsageRecordItem[]>([]);
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [typeVisible, setTypeVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const typeOptions = [
    { label: "全部类型", value: "all" },
    { label: "AI助手对话", value: "chat" },
    { label: "智能群发", value: "broadcast" },
    { label: "内容生成", value: "content" },
  ];

  const statusOptions = [
    { label: "全部状态", value: "all" },
    { label: "已完成", value: "completed" },
    { label: "进行中", value: "processing" },
  ];

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // 前端与接口枚举的简易映射：仅映射已知来源，其它为 undefined（即不过滤）
      const formMap: Record<string, number | undefined> = {
        all: undefined, // 全部
        chat: 1, // 好友/群聊天
        broadcast: 3, // 群公告/群发
        content: 4, // 商家/内容生成
      };

      const res: any = await getTokensUseRecord({
        page: String(page),
        limit: String(pageSize),
        form: formMap[type]?.toString(),
        // 接口的 type 为 0减少/1增加，与当前“状态”筛选无直接对应，暂不传
      });

      const formLabelMap: Record<number, string> = {
        0: "未知",
        1: "好友聊天",
        2: "群聊天",
        3: "群公告",
        4: "商家",
        5: "充值",
      };

      const rawList: any[] = res?.list || [];
      const list: UsageRecordItem[] = rawList.map((item: any, idx: number) => ({
        id: item.id ?? idx,
        title: item.remarks || "使用记录",
        description: "",
        power: item.tokens ?? 0,
        status: "已完成",
        createTime: item.createTime || "",
        typeLabel: formLabelMap[item.form as number] || "",
      }));
      setRecords(list);

      const possibleTotal =
        (res && (res.total || res.count || res.totalCount)) || 0;
      setTotal(
        typeof possibleTotal === "number" && possibleTotal > 0
          ? possibleTotal
          : page * pageSize + (rawList.length === pageSize ? 1 : 0),
      );
    } catch (e) {
      console.error(e);
      Toast.show({ content: "获取使用记录失败", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () =>
    typeOptions.find(o => o.value === type)?.label || "全部类型";
  const getStatusLabel = () =>
    statusOptions.find(o => o.value === status)?.label || "全部状态";

  return (
    <Layout
      header={
        <>
          <NavCommon title="使用记录" />
          <div className={style.filters}>
            <Picker
              columns={[typeOptions]}
              visible={typeVisible}
              onClose={() => setTypeVisible(false)}
              value={[type]}
              onConfirm={val => {
                setType(val[0] as string);
                setTypeVisible(false);
              }}
            >
              {() => (
                <div
                  className={style.filterButton}
                  onClick={() => setTypeVisible(true)}
                >
                  <span className={style.filterIcon}>
                    <DownOutline />
                  </span>
                  {getTypeLabel()}
                </div>
              )}
            </Picker>

            <Picker
              columns={[statusOptions]}
              visible={statusVisible}
              onClose={() => setStatusVisible(false)}
              value={[status]}
              onConfirm={val => {
                setStatus(val[0] as string);
                setStatusVisible(false);
              }}
            >
              {() => (
                <div
                  className={style.filterButton}
                  onClick={() => setStatusVisible(true)}
                >
                  <span className={style.filterIcon}>
                    <DownOutline />
                  </span>
                  {getStatusLabel()}
                </div>
              )}
            </Picker>
          </div>

          <div className={style.summary}>
            <div className={style.summaryItem}>
              <div className={style.summaryNumber}>{records.length}</div>
              <div className={style.summaryLabel}>记录总数</div>
            </div>
            <div className={style.summaryItem}>
              <div className={style.summaryNumber}>
                {records.reduce(
                  (acc, cur) => acc + (Number(cur.power) || 0),
                  0,
                )}
              </div>
              <div className={style.summaryLabel}>总消耗算力</div>
            </div>
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
            }}
          />
        </div>
      }
    >
      <div className={style.page}>
        <div className={style.list}>
          {loading && records.length === 0 ? (
            <div className={style.loading}>加载中...</div>
          ) : records.length === 0 ? (
            <div className={style.empty}>暂无使用记录</div>
          ) : (
            records.map(item => (
              <Card key={item.id} className={style.item}>
                <div className={style.itemHeader}>
                  <div className={style.itemTitle}>
                    {item.title || item.typeLabel || "使用任务"}
                  </div>
                  <Tag color={item.status === "已完成" ? "success" : "primary"}>
                    {item.status}
                  </Tag>
                </div>
                {item.description ? (
                  <div className={style.itemDesc}>{item.description}</div>
                ) : null}
                <div className={style.itemFooter}>
                  <div className={style.power}>消耗 {item.power ?? 0} 算力</div>
                  <div className={style.time}>{item.createTime}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UsageRecords;
