import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Toast,
  SpinLoading,
  Dialog,
  Card,
  Avatar,
  Tag,
} from "antd-mobile";
import { Input } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import { getContentLibraryList, deleteContentLibrary } from "./api";
import { ContentLibrary } from "./data";
import style from "./index.module.scss";
import { Tabs } from "antd-mobile";

// 卡片菜单组件
interface CardMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewMaterials: () => void;
}

const CardMenu: React.FC<CardMenuProps> = ({
  onView,
  onEdit,
  onDelete,
  onViewMaterials,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} className={style["menu-btn"]}>
        <MoreOutlined />
      </button>
      {open && (
        <div ref={menuRef} className={style["menu-dropdown"]}>
          <div
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className={style["menu-item"]}
          >
            <EditOutlined />
            编辑
          </div>
          <div
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className={`${style["menu-item"]} ${style["danger"]}`}
          >
            <DeleteOutlined />
            删除
          </div>
          <div
            onClick={() => {
              onViewMaterials();
              setOpen(false);
            }}
            className={style["menu-item"]}
          >
            <EyeOutlined />
            查看素材
          </div>
        </div>
      )}
    </div>
  );
};

const ContentLibraryList: React.FC = () => {
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState<ContentLibrary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  // 获取内容库列表
  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getContentLibraryList({
        page: 1,
        limit: 100,
        keyword: searchQuery,
        sourceType:
          activeTab !== "all" ? (activeTab === "friends" ? 1 : 2) : undefined,
      });

      setLibraries(response.list || []);
    } catch (error: any) {
      console.error("获取内容库列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  const handleCreateNew = () => {
    navigate("/mine/content/new");
  };

  const handleEdit = (id: string) => {
    navigate(`/mine/content/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    const result = await Dialog.confirm({
      content: "确定要删除这个内容库吗？",
      confirmText: "删除",
      cancelText: "取消",
    });

    if (result) {
      try {
        const response = await deleteContentLibrary(id);
        if (response.code === 200) {
          Toast.show({
            content: "删除成功",
            position: "top",
          });
          fetchLibraries();
        } else {
          Toast.show({
            content: response.msg || "删除失败",
            position: "top",
          });
        }
      } catch (error: any) {
        console.error("删除内容库失败:", error);
        Toast.show({
          content: error?.message || "请检查网络连接",
          position: "top",
        });
      }
    }
  };

  const handleViewMaterials = (id: string) => {
    navigate(`/mine/content/materials/${id}`);
  };

  const handleRefresh = () => {
    fetchLibraries();
  };

  const filteredLibraries = libraries.filter(
    library =>
      library.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      library.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Layout
      header={
        <>
          <NavCommon
            title="内容库"
            backFn={() => navigate("/mine")}
            right={
              <Button size="small" color="primary" onClick={handleCreateNew}>
                <PlusOutlined /> 新建内容库
              </Button>
            }
          />

          {/* 搜索栏 */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Input
                placeholder="搜索内容库"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
              />
            </div>
            <Button
              size="small"
              onClick={handleRefresh}
              loading={loading}
              className="refresh-btn"
            >
              <ReloadOutlined />
            </Button>
          </div>

          {/* 标签页 */}
          <div className={style["tabs"]}>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.Tab title="全部" key="all" />
              <Tabs.Tab title="微信好友" key="friends" />
              <Tabs.Tab title="聊天群" key="groups" />
            </Tabs>
          </div>
        </>
      }
    >
      <div className={style["content-library-page"]}>
        {/* 内容库列表 */}
        <div className={style["library-list"]}>
          {loading ? (
            <div className={style["loading"]}>
              <SpinLoading color="primary" style={{ fontSize: 32 }} />
            </div>
          ) : filteredLibraries.length === 0 ? (
            <div className={style["empty-state"]}>
              <div className={style["empty-icon"]}>📚</div>
              <div className={style["empty-text"]}>
                暂无内容库，快去新建一个吧！
              </div>
              <Button
                color="primary"
                size="small"
                onClick={handleCreateNew}
                className={style["empty-btn"]}
              >
                新建内容库
              </Button>
            </div>
          ) : (
            filteredLibraries.map(library => (
              <Card key={library.id} className={style["library-card"]}>
                <div className={style["card-header"]}>
                  <div className={style["library-info"]}>
                    <h3 className={style["library-name"]}>{library.name}</h3>
                    <Tag
                      color={library.status === 1 ? "success" : "default"}
                      className={style["status-tag"]}
                    >
                      {library.status === 1 ? "已启用" : "未启用"}
                    </Tag>
                  </div>
                  <CardMenu
                    onView={() => navigate(`/content/${library.id}`)}
                    onEdit={() => handleEdit(library.id)}
                    onDelete={() => handleDelete(library.id)}
                    onViewMaterials={() => handleViewMaterials(library.id)}
                  />
                </div>
                <div className={style["card-content"]}>
                  <div className={style["info-row"]}>
                    <span className={style["label"]}>来源：</span>
                    <span className={style["value"]}>
                      {library.sourceType === 1 ? "微信好友" : "聊天群"}
                    </span>
                  </div>
                  <div className={style["info-row"]}>
                    <span className={style["label"]}>创建人：</span>
                    <span className={style["value"]}>
                      {library.creatorName || "系统"}
                    </span>
                  </div>
                  <div className={style["info-row"]}>
                    <span className={style["label"]}>内容数量：</span>
                    <span className={style["value"]}>
                      {library.itemCount || 0}
                    </span>
                  </div>
                  <div className={style["info-row"]}>
                    <span className={style["label"]}>更新时间：</span>
                    <span className={style["value"]}>
                      {new Date(library.updateTime).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ContentLibraryList;
