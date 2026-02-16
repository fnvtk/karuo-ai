import React from "react";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { Input, Button } from "antd";
import { Tabs } from "antd-mobile";
import style from "./header.module.scss";

interface PopupHeaderProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  showRefresh?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  tabsConfig?: {
    activeKey: string;
    onChange: (key: string) => void;
    tabs: Array<{ title: string; key: string }>;
  };
}

const PopupHeader: React.FC<PopupHeaderProps> = ({
  title,
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "搜索...",
  loading = false,
  onRefresh,
  onSearch,
  showRefresh = true,
  showSearch = true,
  showTabs = false,
  tabsConfig,
}) => {
  return (
    <>
      <div className={style.popupHeader}>
        <div className={style.popupTitle}>{title}</div>
      </div>

      {showSearch && (
        <div className={style.popupSearchRow}>
          <div className={style.popupSearchInputWrap}>
            <Input.Search
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onSearch={() => onSearch && onSearch(searchQuery)}
              prefix={<SearchOutlined />}
              size="large"
            />
          </div>

          {showRefresh && onRefresh && (
            <Button
              type="text"
              onClick={onRefresh}
              disabled={loading}
              className={style.refreshBtn}
            >
              {loading ? (
                <div className={style.loadingIcon}>⟳</div>
              ) : (
                <ReloadOutlined />
              )}
            </Button>
          )}
        </div>
      )}

      {showTabs && tabsConfig && (
        <Tabs
          activeKey={tabsConfig.activeKey}
          onChange={tabsConfig.onChange}
          style={{ marginTop: 8 }}
        >
          {tabsConfig.tabs.map(tab => (
            <Tabs.Tab key={tab.key} title={tab.title} />
          ))}
        </Tabs>
      )}
    </>
  );
};

export default PopupHeader;
