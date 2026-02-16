import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "antd";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import styles from "./Person.module.scss";
import ProfileModules from "./components/ProfileModules";
import QuickWords from "./components/QuickWords";
import FriendsCircle from "./components/FriendsCicle";
import LayoutFiexd from "@/components/Layout/LayoutFiexd";

const { Sider } = Layout;

const noop = () => {};

interface PersonProps {
  contract: ContractData | weChatGroup;
}

const Person: React.FC<PersonProps> = ({ contract }) => {
  const [activeKey, setActiveKey] = useState("quickwords");
  const isGroup = "chatroomId" in contract;
  // 使用state保存当前contract的副本，确保在切换tab时不会丢失修改
  const [currentContract, setCurrentContract] = useState<
    ContractData | weChatGroup
  >(contract);

  // 当外部contract变化时，更新内部状态
  useEffect(() => {
    setCurrentContract(contract);
  }, [contract]);

  const tabItems = useMemo(() => {
    const baseItems = [
      {
        key: "quickwords",
        label: "快捷语录",
        children: <QuickWords onInsert={noop} />,
      },
      {
        key: "profile",
        label: isGroup ? "群资料" : "个人资料",
        children: <ProfileModules contract={currentContract} />,
      },
    ];
    if (!isGroup) {
      baseItems.push({
        key: "moments",
        label: "朋友圈",
        children: <FriendsCircle wechatFriendId={currentContract.id} />,
      });
    }
    return baseItems;
  }, [currentContract, isGroup]);

  useEffect(() => {
    setActiveKey("quickwords");
    setRenderedKeys(["quickwords"]);
  }, [contract]);

  const tabHeaderItems = useMemo(
    () => tabItems.map(({ key, label }) => ({ key, label })),
    [tabItems],
  );

  const availableKeys = useMemo(
    () => tabItems.map(item => item.key),
    [tabItems],
  );

  const [renderedKeys, setRenderedKeys] = useState<string[]>(() => ["profile"]);

  useEffect(() => {
    if (!availableKeys.includes(activeKey) && availableKeys.length > 0) {
      setActiveKey(availableKeys[0]);
    }
  }, [activeKey, availableKeys]);

  useEffect(() => {
    setRenderedKeys(keys => {
      const filtered = keys.filter(key => availableKeys.includes(key));
      if (!filtered.includes(activeKey)) {
        filtered.push(activeKey);
      }
      const isSameLength = filtered.length === keys.length;
      const isSameOrder =
        isSameLength && filtered.every((key, index) => key === keys[index]);
      return isSameOrder ? keys : filtered;
    });
  }, [activeKey, availableKeys]);

  return (
    <Sider width={330} className={styles.profileSider}>
      <LayoutFiexd
        header={
          <div className={styles.tabHeader}>
            {tabHeaderItems.map(({ key, label }) => {
              const isActive = key === activeKey;
              return (
                <div
                  key={key}
                  className={`${styles.tabItem}${
                    isActive ? ` ${styles.tabItemActive}` : ""
                  }`}
                  onClick={() => {
                    setActiveKey(key);
                  }}
                >
                  <span>{label}</span>
                  <div className={styles.tabUnderline} />
                </div>
              );
            })}
          </div>
        }
      >
        {renderedKeys.map(key => {
          const item = tabItems.find(tab => tab.key === key);
          if (!item) return null;
          const isActive = key === activeKey;
          return (
            <div
              key={key}
              style={{ display: isActive ? "block" : "none", height: "100%" }}
            >
              {item.children}
            </div>
          );
        })}
      </LayoutFiexd>
    </Sider>
  );
};

export default Person;
