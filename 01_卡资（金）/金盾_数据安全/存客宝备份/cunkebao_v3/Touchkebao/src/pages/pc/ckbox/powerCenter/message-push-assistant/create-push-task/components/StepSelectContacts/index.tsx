"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Empty,
  Input,
  Pagination,
  Spin,
  message,
  Modal,
  Select,
} from "antd";
import {
  CloseOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { getContactList, getGroupList } from "@/pages/pc/ckbox/weChat/api";

import styles from "../../index.module.scss";
import { ContactItem, PushType } from "../../types";
import PoolSelection from "@/components/PoolSelection";
import type { PoolSelectionItem } from "@/components/PoolSelection/data";

interface ContactFilterValues {
  includeTags: string[];
  excludeTags: string[];
  includeCities: string[];
  excludeCities: string[];
  nicknameRemark: string;
  groupIds: string[];
}

const createDefaultFilterValues = (): ContactFilterValues => ({
  includeTags: [],
  excludeTags: [],
  includeCities: [],
  excludeCities: [],
  nicknameRemark: "",
  groupIds: [],
});

const cloneFilterValues = (
  values: ContactFilterValues,
): ContactFilterValues => ({
  includeTags: [...values.includeTags],
  excludeTags: [...values.excludeTags],
  includeCities: [...values.includeCities],
  excludeCities: [...values.excludeCities],
  nicknameRemark: values.nicknameRemark,
  groupIds: [...values.groupIds],
});

const DISABLED_TAG_LABELS = new Set(["请选择标签"]);

interface StepSelectContactsProps {
  pushType: PushType;
  selectedAccounts: any[];
  selectedContacts: ContactItem[];
  onChange: (contacts: ContactItem[]) => void;
  selectedTrafficPools: PoolSelectionItem[];
  onTrafficPoolsChange: (pools: PoolSelectionItem[]) => void;
}

const StepSelectContacts: React.FC<StepSelectContactsProps> = ({
  pushType,
  selectedAccounts,
  selectedContacts,
  onChange,
  selectedTrafficPools,
  onTrafficPoolsChange,
}) => {
  const [contactsData, setContactsData] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [total, setTotal] = useState(0);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<ContactFilterValues>(
    createDefaultFilterValues,
  );
  const [draftFilterValues, setDraftFilterValues] =
    useState<ContactFilterValues>(createDefaultFilterValues);

  const pageSize = 20;

  const stepTitle = useMemo(() => {
    switch (pushType) {
      case "friend-message":
        return "好友";
      case "group-message":
      case "group-announcement":
        return "群";
      default:
        return "选择";
    }
  }, [pushType]);

  const loadContacts = useCallback(async () => {
    if (selectedAccounts.length === 0) {
      setContactsData([]);
      setTotal(0);
      return;
    }

    setLoadingContacts(true);
    try {
      const accountIds = selectedAccounts.map(a => a.id);
      const allData: ContactItem[] = [];
      let totalCount = 0;

      for (const accountId of accountIds) {
        const params: any = {
          page,
          limit: pageSize,
          wechatAccountId: accountId,
        };

        if (searchValue.trim()) {
          params.keyword = searchValue.trim();
        }

        const response =
          pushType === "friend-message"
            ? await getContactList(params)
            : await getGroupList(params);

        const data =
          response.data?.list || response.data || response.list || [];
        const totalValue = response.data?.total || response.total || 0;

        const filteredData = data.filter((item: any) => {
          const itemAccountId = item.wechatAccountId || item.accountId;
          return itemAccountId === accountId;
        });

        filteredData.forEach((item: ContactItem) => {
          if (!allData.some(d => d.id === item.id)) {
            allData.push(item);
          }
        });

        totalCount += totalValue;
      }

      setContactsData(allData);
      setTotal(totalCount > 0 ? totalCount : allData.length);
    } catch (error) {
      console.error("加载数据失败:", error);
      message.error("加载数据失败");
      setContactsData([]);
      setTotal(0);
    } finally {
      setLoadingContacts(false);
    }
  }, [page, pushType, searchValue, selectedAccounts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (!searchValue.trim()) {
      return;
    }
    setPage(1);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
    if (selectedAccounts.length === 0 && selectedContacts.length > 0) {
      onChange([]);
    }
  }, [onChange, selectedAccounts, selectedContacts.length]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (!value.trim()) {
      setPage(1);
    }
  };

  const tagOptions = useMemo(() => {
    const tagSet = new Set<string>();
    contactsData.forEach(contact => {
      (contact.labels || []).forEach(tag => {
        const normalizedTag = (tag || "").trim();
        if (normalizedTag && !DISABLED_TAG_LABELS.has(normalizedTag)) {
          tagSet.add(normalizedTag);
        }
      });
    });
    return Array.from(tagSet).map(tag => ({ label: tag, value: tag }));
  }, [contactsData]);

  const cityOptions = useMemo(() => {
    const citySet = new Set<string>();
    contactsData.forEach(contact => {
      const city = (contact.city || contact.region || "").trim();
      if (city) {
        citySet.add(city);
      }
    });
    return Array.from(citySet).map(city => ({ label: city, value: city }));
  }, [contactsData]);

  const groupOptions = useMemo(() => {
    const groupMap = new Map<string, string>();
    contactsData.forEach(contact => {
      const key =
        contact.groupName ||
        contact.groupLabel ||
        (contact.groupId !== undefined ? contact.groupId.toString() : "");
      if (key) {
        const display =
          contact.groupName || contact.groupLabel || `分组 ${key}`;
        groupMap.set(key, display);
      }
    });
    return Array.from(groupMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [contactsData]);

  const hasActiveFilter = useMemo(() => {
    const {
      includeTags,
      excludeTags,
      includeCities,
      excludeCities,
      nicknameRemark,
      groupIds,
    } = filterValues;

    if (
      includeTags.length ||
      excludeTags.length ||
      includeCities.length ||
      excludeCities.length ||
      groupIds.length ||
      nicknameRemark.trim()
    ) {
      return true;
    }
    return false;
  }, [filterValues]);

  const filteredContacts = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    const nicknameKeyword = filterValues.nicknameRemark.trim().toLowerCase();

    return contactsData.filter(contact => {
      const labels = contact.labels || [];
      const city = (contact.city || contact.region || "").toLowerCase();
      const groupValue =
        contact.groupName ||
        contact.groupLabel ||
        (contact.groupId !== undefined ? contact.groupId.toString() : "");

      if (keyword) {
        const combined = `${contact.nickname || ""} ${
          contact.conRemark || ""
        }`.toLowerCase();
        if (!combined.includes(keyword)) {
          return false;
        }
      }

      if (filterValues.includeTags.length > 0) {
        const hasAllIncludes = filterValues.includeTags.every(tag =>
          labels.includes(tag),
        );
        if (!hasAllIncludes) {
          return false;
        }
      }

      if (filterValues.excludeTags.length > 0) {
        const hasExcluded = filterValues.excludeTags.some(tag =>
          labels.includes(tag),
        );
        if (hasExcluded) {
          return false;
        }
      }

      if (filterValues.includeCities.length > 0) {
        const matchCity = filterValues.includeCities.some(value =>
          city.includes(value.toLowerCase()),
        );
        if (!matchCity) {
          return false;
        }
      }

      if (filterValues.excludeCities.length > 0) {
        const matchExcludedCity = filterValues.excludeCities.some(value =>
          city.includes(value.toLowerCase()),
        );
        if (matchExcludedCity) {
          return false;
        }
      }

      if (nicknameKeyword) {
        const combined = `${contact.nickname || ""} ${
          contact.conRemark || ""
        }`.toLowerCase();
        if (!combined.includes(nicknameKeyword)) {
          return false;
        }
      }

      if (filterValues.groupIds.length > 0) {
        if (!groupValue) {
          return false;
        }
        if (
          !filterValues.groupIds.some(value => value === groupValue.toString())
        ) {
          return false;
        }
      }

      return true;
    });
  }, [contactsData, filterValues, searchValue]);

  const displayTotal = useMemo(() => {
    if (hasActiveFilter) {
      return filteredContacts.length;
    }
    return total;
  }, [filteredContacts, hasActiveFilter, total]);

  const handleContactToggle = (contact: ContactItem) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      onChange(selectedContacts.filter(c => c.id !== contact.id));
      return;
    }
    onChange([...selectedContacts, contact]);
  };

  const handleRemoveContact = (contactId: number) => {
    onChange(selectedContacts.filter(c => c.id !== contactId));
  };

  const handleSelectAllContacts = () => {
    if (filteredContacts.length === 0) return;
    const allSelected = filteredContacts.every(contact =>
      selectedContacts.some(c => c.id === contact.id),
    );
    if (allSelected) {
      const currentIds = filteredContacts.map(c => c.id);
      onChange(selectedContacts.filter(c => !currentIds.includes(c.id)));
      return;
    }
    const toAdd = filteredContacts.filter(
      contact => !selectedContacts.some(c => c.id === contact.id),
    );
    onChange([...selectedContacts, ...toAdd]);
  };

  const openFilterModal = () => {
    setDraftFilterValues(cloneFilterValues(filterValues));
    setFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setFilterModalVisible(false);
  };

  const handleFilterConfirm = () => {
    setFilterValues(cloneFilterValues(draftFilterValues));
    setPage(1);
    setFilterModalVisible(false);
  };

  const handleFilterReset = () => {
    const nextValues = createDefaultFilterValues();
    setDraftFilterValues(nextValues);
    setFilterValues(nextValues);
    setPage(1);
    setFilterModalVisible(false);
  };

  const updateDraftFilter = <K extends keyof ContactFilterValues>(
    key: K,
    value: ContactFilterValues[K],
  ) => {
    setDraftFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.step2Content}>
        <div className={styles.stepHeader}>
          <h3>选择{stepTitle}</h3>
          <p>从{stepTitle}列表中选择推送对象</p>
        </div>
        <div className={styles.searchContainer}>
          <Input
            placeholder={`筛选${stepTitle}`}
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={e => handleSearchChange(e.target.value)}
            allowClear
          />
        </div>
        <PoolSelection
          selectedOptions={selectedTrafficPools}
          onSelect={onTrafficPoolsChange}
          placeholder="选择流量池包"
          showSelectedList
          selectedListMaxHeight={200}
        />
        <div className={styles.contentBody}>
          <div className={styles.contactList}>
            <div className={styles.listHeader}>
              <span>
                {stepTitle}列表(共{displayTotal}个)
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={handleSelectAllContacts}>全选</Button>
                <Button
                  type={hasActiveFilter ? "primary" : "default"}
                  onClick={openFilterModal}
                >
                  筛选
                </Button>
              </div>
            </div>
            <div className={styles.listContent}>
              {loadingContacts ? (
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                  <span>加载中...</span>
                </div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map(contact => {
                  const isSelected = selectedContacts.some(
                    c => c.id === contact.id,
                  );
                  return (
                    <div
                      key={contact.id}
                      className={`${styles.contactItem} ${isSelected ? styles.selected : ""}`}
                      onClick={() => handleContactToggle(contact)}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar
                        src={contact.avatar}
                        size={40}
                        icon={
                          contact.type === "group" ? (
                            <TeamOutlined />
                          ) : (
                            <UserOutlined />
                          )
                        }
                      />
                      <div className={styles.contactInfo}>
                        <div className={styles.contactName}>
                          {contact.nickname}
                        </div>
                        {contact.conRemark && (
                          <div className={styles.conRemark}>
                            {contact.conRemark}
                          </div>
                        )}
                      </div>
                      {contact.type === "group" && (
                        <TeamOutlined className={styles.groupIcon} />
                      )}
                    </div>
                  );
                })
              ) : (
                <Empty
                  description={
                    searchValue
                      ? `未找到匹配的${stepTitle}`
                      : `暂无${stepTitle}`
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
            {displayTotal > 0 && (
              <div className={styles.paginationContainer}>
                <Pagination
                  size="small"
                  current={page}
                  pageSize={pageSize}
                  total={displayTotal}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>

          <div className={styles.selectedList}>
            <div className={styles.listHeader}>
              <span>
                已选{stepTitle}列表(共{selectedContacts.length}个)
              </span>
              {selectedContacts.length > 0 && (
                <Button type="link" size="small" onClick={() => onChange([])}>
                  全取消
                </Button>
              )}
            </div>
            <div className={styles.listContent}>
              {selectedContacts.length > 0 ? (
                selectedContacts.map(contact => (
                  <div key={contact.id} className={styles.selectedItem}>
                    <div className={styles.contactInfo}>
                      <Avatar
                        src={contact.avatar}
                        size={40}
                        icon={
                          contact.type === "group" ? (
                            <TeamOutlined />
                          ) : (
                            <UserOutlined />
                          )
                        }
                      />
                      <div className={styles.contactName}>
                        <div>{contact.nickname}</div>
                        {contact.conRemark && (
                          <div className={styles.conRemark}>
                            {contact.conRemark}
                          </div>
                        )}
                      </div>
                      {contact.type === "group" && (
                        <TeamOutlined className={styles.groupIcon} />
                      )}
                    </div>
                    <CloseOutlined
                      className={styles.removeIcon}
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveContact(contact.id);
                      }}
                    />
                  </div>
                ))
              ) : (
                <Empty
                  description={`请选择${stepTitle}`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={`筛选${stepTitle}`}
        open={filterModalVisible}
        onCancel={closeFilterModal}
        width={720}
        className={styles.filterModal}
        footer={[
          <Button key="reset" onClick={handleFilterReset}>
            重置
          </Button>,
          <Button key="cancel" onClick={closeFilterModal}>
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={handleFilterConfirm}>
            确定
          </Button>,
        ]}
      >
        <div className={styles.filterRow}>
          <div className={styles.filterLabel}>标签</div>
          <div className={styles.filterControls}>
            <div className={styles.filterControl}>
              <Button type="primary">包含</Button>
              <Select
                allowClear
                mode="multiple"
                placeholder="请选择"
                options={tagOptions}
                value={draftFilterValues.includeTags}
                onChange={(value: string[]) =>
                  updateDraftFilter("includeTags", value)
                }
              />
            </div>
            <div className={styles.filterControl}>
              <Button className={styles.excludeButton}>不包含</Button>
              <Select
                allowClear
                mode="multiple"
                placeholder="请选择"
                options={tagOptions}
                value={draftFilterValues.excludeTags}
                onChange={(value: string[]) =>
                  updateDraftFilter("excludeTags", value)
                }
              />
            </div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterLabel}>城市</div>
          <div className={styles.filterControls}>
            <div className={styles.filterControl}>
              <Button type="primary">包含</Button>
              <Select
                allowClear
                mode="multiple"
                placeholder="请选择"
                options={cityOptions}
                value={draftFilterValues.includeCities}
                onChange={(value: string[]) =>
                  updateDraftFilter("includeCities", value)
                }
              />
            </div>
            <div className={styles.filterControl}>
              <Button className={styles.excludeButton}>不包含</Button>
              <Select
                allowClear
                mode="multiple"
                placeholder="请选择"
                options={cityOptions}
                value={draftFilterValues.excludeCities}
                onChange={(value: string[]) =>
                  updateDraftFilter("excludeCities", value)
                }
              />
            </div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterLabel}>昵称/备注</div>
          <div className={styles.filterSingleControl}>
            <Input
              placeholder="请输入内容"
              value={draftFilterValues.nicknameRemark}
              onChange={e =>
                updateDraftFilter("nicknameRemark", e.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterLabel}>分组</div>
          <div className={styles.filterSingleControl}>
            <Select
              allowClear
              mode="multiple"
              placeholder="请选择"
              options={groupOptions}
              value={draftFilterValues.groupIds}
              onChange={(value: string[]) =>
                updateDraftFilter("groupIds", value)
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StepSelectContacts;
