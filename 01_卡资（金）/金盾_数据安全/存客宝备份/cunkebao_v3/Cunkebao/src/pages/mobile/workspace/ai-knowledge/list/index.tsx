import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Switch,
  Dropdown,
  message,
  Spin,
  Pagination,
  Input,
} from "antd";
import {
  MoreOutlined,
  PlusOutlined,
  BookOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import style from "./index.module.scss";
import {
  fetchKnowledgeBaseList,
  deleteKnowledgeBase,
  initAIKnowledge,
  updateTypeStatus,
} from "./api";
import type { KnowledgeBase } from "./data";
import GlobalPromptModal from "./components/GlobalPromptModal";

const PAGE_SIZE = 10;

const AIKnowledgeList: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [enabledCount, setEnabledCount] = useState(0);
  const [page, setPage] = useState(1);
  const [menuLoadingId, setMenuLoadingId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState(""); // 搜索输入内容
  const [keyword, setKeyword] = useState(""); // 实际用于搜索的关键词
  const isInitialMount = useRef(true); // 标记是否是初始挂载

  // 弹窗控制
  const [globalPromptVisible, setGlobalPromptVisible] = useState(false);

  const fetchList = useCallback(async (pageNum = 1, searchKeyword = "") => {
    setLoading(true);
    try {
      const res = await fetchKnowledgeBaseList({
        page: pageNum,
        limit: PAGE_SIZE,
        keyword: searchKeyword || undefined,
      });
      // 转换数据格式，映射接口字段到前端字段
      const transformedList = (res?.data || []).map((item: any) => ({
        ...item,
        tags: item.label || [],
        useIndependentPrompt: !!item.prompt,
        independentPrompt: item.prompt || "",
        status: item.isDel === 0 ? 1 : 0, // 未删除即为启用
        aiCallEnabled: true, // 默认启用
        materialCount: item.materialCount || 0, // 需要单独统计
      }));
      setList(transformedList);
      setTotal(Number(res?.total) || 0);
    } catch (e) {
      message.error("获取知识库列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初始化AI功能
    initAIKnowledge().catch(err => {
      console.warn("初始化AI功能失败", err);
    });
    fetchList(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索防抖处理
  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      const searchKeyword = searchValue.trim();
      setKeyword(searchKeyword);
      setPage(1);
      fetchList(1, searchKeyword);
    }, 500); // 500ms 防抖延迟

    return () => clearTimeout(timer);
  }, [searchValue, fetchList]);

  useEffect(() => {
    // 初始挂载时不触发搜索（已在初始化时调用 fetchList）
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchList(p, keyword);
  };

  const handleRefresh = () => {
    fetchList(page, keyword);
  };

  // 菜单点击事件
  const handleMenuClick = async (key: string, item: KnowledgeBase) => {
    // 系统预设不允许编辑或删除
    if (item.type === 0) {
      message.warning("系统预设知识库不可编辑或删除");
      return;
    }

    if (key === "edit") {
      navigate(`/workspace/ai-knowledge/${item.id}/edit`);
    } else if (key === "delete") {
      setMenuLoadingId(item.id);
      try {
        await deleteKnowledgeBase(item.id);
        message.success("删除成功");
        handleRefresh();
      } catch (e) {
        message.error("删除失败");
      } finally {
        setMenuLoadingId(null);
      }
    }
  };

  // Switch切换状态 - 乐观更新模式
  const handleSwitchChange = async (checked: boolean, item: KnowledgeBase) => {
    // 系统预设不允许修改状态
    if (item.type === 0) {
      message.warning("系统预设知识库不可修改状态");
      return;
    }

    // 保存旧状态用于回滚
    const oldStatus = item.status;
    const oldEnabledCount = enabledCount;

    // 立即更新本地UI（乐观更新）
    setList(prevList =>
      prevList.map(kb =>
        kb.id === item.id ? { ...kb, status: checked ? 1 : 0 } : kb,
      ),
    );
    setEnabledCount(prev => (checked ? prev + 1 : prev - 1));

    // 异步请求接口
    try {
      await updateTypeStatus({ id: item.id, status: checked ? 1 : 0 });
      // 成功后显示提示
      message.success(checked ? "已启用" : "已禁用");
    } catch (e) {
      // 失败时回滚状态
      setList(prevList =>
        prevList.map(kb =>
          kb.id === item.id ? { ...kb, status: oldStatus } : kb,
        ),
      );
      setEnabledCount(oldEnabledCount);
      message.error("操作失败，请重试");
    }
  };

  // 打开知识库详情
  const handleCardClick = (item: KnowledgeBase) => {
    navigate(`/workspace/ai-knowledge/${item.id}`);
  };

  // 渲染知识库卡片
  const renderCard = (item: KnowledgeBase) => {
    const isSystemPreset = item.type === 0; // 系统预设不可编辑

    return (
      <div key={item.id} className={style.knowledgeCard}>
        <div className={style.cardHeader}>
          <div
            className={style.cardLeft}
            onClick={() => handleCardClick(item)}
            style={{ cursor: "pointer" }}
          >
            <div className={style.cardTitle}>
              <div className={style.cardIcon}>
                <BookOutlined />
              </div>
              <div className={style.cardName}>
                {item.name}
                {isSystemPreset && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "12px",
                      color: "#999",
                      fontWeight: "normal",
                    }}
                  >
                    (系统预设)
                  </span>
                )}
              </div>
            </div>
            {item.description && (
              <div className={style.cardDescription}>{item.description}</div>
            )}
          </div>
          <div className={style.cardRight}>
            <Switch
              className={style.cardSwitch}
              checked={item.status === 1}
              size="small"
              loading={menuLoadingId === item.id}
              disabled={menuLoadingId === item.id || isSystemPreset}
              onChange={checked => handleSwitchChange(checked, item)}
            />
            {!isSystemPreset && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "edit",
                      icon: <EditOutlined />,
                      label: "编辑",
                      disabled: menuLoadingId === item.id,
                    },
                    {
                      key: "delete",
                      icon: <DeleteOutlined />,
                      label: "删除",
                      disabled: menuLoadingId === item.id,
                      danger: true,
                    },
                  ],
                  onClick: ({ key }) => handleMenuClick(key, item),
                }}
                trigger={["click"]}
                placement="bottomRight"
                disabled={menuLoadingId === item.id}
              >
                <MoreOutlined className={style.cardMenu} />
              </Dropdown>
            )}
          </div>
        </div>

        <div className={style.cardStats}>
          <div className={style.statItem}>
            <div className={style.statItemValue}>{item.materialCount}</div>
            <div className={style.statItemLabel}>素材总数</div>
          </div>
          <div className={style.statItem}>
            <div
              className={style.statItemValue}
              style={{ color: item.aiCallEnabled ? "#52c41a" : "#999" }}
            >
              {item.aiCallEnabled ? "启用" : "关闭"}
            </div>
            <div className={style.statItemLabel}>AI状态</div>
          </div>
          <div className={style.statItem}>
            <div className={style.statItemValue}>{item.tags?.length || 0}</div>
            <div className={style.statItemLabel}>标签数</div>
          </div>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className={style.cardTags}>
            {item.tags.map((tag, index) => (
              <span key={index} className={style.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="AI知识库"
            backFn={() => navigate("/workspace")}
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => setGlobalPromptVisible(true)}>
                  <GlobalOutlined /> 统一提示词
                </Button>
                <Button
                  type="primary"
                  onClick={() => navigate("/workspace/ai-knowledge/new")}
                >
                  <PlusOutlined /> 新建
                </Button>
              </div>
            }
          />
          <div
            style={{
              padding: "16px 16px 0 16px",
            }}
          >
            {/* 提示横幅 */}
            <div className={style.banner}>
              <InfoCircleOutlined className={style.bannerIcon} />
              <div className={style.bannerContent}>
                <div className={style.bannerText}>
                  已启用统一提示词规则
                  <a onClick={() => setGlobalPromptVisible(true)}>
                    点击&ldquo;统一提示词&rdquo;可查看和编辑
                  </a>
                </div>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className={style.statsContainer}>
              <div className={style.statCard}>
                <div className={style.statValue}>{total}</div>
                <div className={style.statLabel}>内容库总数</div>
              </div>
              <div className={style.statCard}>
                <div className={`${style.statValue} ${style.statValueSuccess}`}>
                  {enabledCount}
                </div>
                <div className={style.statLabel}>启用中</div>
              </div>
            </div>

            {/* 搜索和客户案例库按钮 */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Input
                placeholder="搜索知识库名称或描述"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
                onPressEnter={() => {
                  const searchKeyword = searchValue.trim();
                  setKeyword(searchKeyword);
                  setPage(1);
                  fetchList(1, searchKeyword);
                }}
              />
            </div>
          </div>
        </>
      }
      footer={
        <div
          style={{
            padding: "16px",
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={handlePageChange}
            showSizeChanger={false}
            showTotal={total => `共 ${total} 条`}
            disabled={loading}
          />
        </div>
      }
    >
      <div className={style.knowledgePage}>
        {/* 知识库列表 */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
          </div>
        ) : list.length > 0 ? (
          list.map(renderCard)
        ) : (
          <div className={style.empty}>
            <div className={style.emptyIcon}>
              <BookOutlined />
            </div>
            <div className={style.emptyText}>
              {keyword ? "未找到匹配的知识库" : "暂无知识库"}
            </div>
          </div>
        )}
      </div>

      {/* 统一提示词弹窗 */}
      <GlobalPromptModal
        visible={globalPromptVisible}
        onClose={() => setGlobalPromptVisible(false)}
      />
    </Layout>
  );
};

export default AIKnowledgeList;
