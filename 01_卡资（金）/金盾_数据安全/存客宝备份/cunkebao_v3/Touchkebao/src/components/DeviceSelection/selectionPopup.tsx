import React, { useState, useEffect, useCallback } from "react";
import { Checkbox, Popup } from "antd-mobile";
import { getDeviceList } from "./api";
import style from "./index.module.scss";
import Layout from "@/components/Layout/Layout";
import PopupHeader from "@/components/PopuLayout/header";
import PopupFooter from "@/components/PopuLayout/footer";
import { DeviceSelectionItem } from "./data";

interface SelectionPopupProps {
  visible: boolean;
  onClose: () => void;
  selectedOptions: DeviceSelectionItem[];
  onSelect: (devices: DeviceSelectionItem[]) => void;
}

const PAGE_SIZE = 20;

const SelectionPopup: React.FC<SelectionPopupProps> = ({
  visible,
  onClose,
  selectedOptions,
  onSelect,
}) => {
  // 设备数据
  const [devices, setDevices] = useState<DeviceSelectionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<
    DeviceSelectionItem[]
  >([]);

  // 获取设备列表，支持keyword和分页
  const fetchDevices = useCallback(
    async (keyword: string = "", page: number = 1) => {
      setLoading(true);
      try {
        const res = await getDeviceList({
          page,
          limit: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
        });
        if (res && Array.isArray(res.list)) {
          setDevices(
            res.list.map((d: any) => ({
              id: d.id?.toString() || "",
              memo: d.memo || d.imei || "",
              imei: d.imei || "",
              wechatId: d.wechatId || "",
              status: d.alive === 1 ? "online" : "offline",
              wxid: d.wechatId || "",
              nickname: d.nickname || "",
              usedInPlans: d.usedInPlans || 0,
              avatar: d.avatar || "",
              totalFriend: d.totalFriend || 0,
            })),
          );
          setTotal(res.total || 0);
        }
      } catch (error) {
        console.error("获取设备列表失败:", error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 打开弹窗时获取第一页
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setCurrentPage(1);
      // 复制一份selectedOptions到临时变量
      setTempSelectedOptions([...selectedOptions]);
      fetchDevices("", 1);
    }
  }, [visible, fetchDevices, selectedOptions]);

  // 搜索防抖
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchDevices(searchQuery, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, visible, fetchDevices]);

  // 翻页时重新请求
  useEffect(() => {
    if (!visible) return;
    fetchDevices(searchQuery, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // 过滤设备（只保留状态过滤）
  const filteredDevices = devices.filter(device => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && device.status === "online") ||
      (statusFilter === "offline" && device.status === "offline");
    return matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 处理设备选择
  const handleDeviceToggle = (device: DeviceSelectionItem) => {
    if (tempSelectedOptions.some(v => v.id === device.id)) {
      setTempSelectedOptions(
        tempSelectedOptions.filter(v => v.id !== device.id),
      );
    } else {
      const newSelectedOptions = [...tempSelectedOptions, device];
      setTempSelectedOptions(newSelectedOptions);
    }
  };

  // 全选当前页
  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      // 全选：添加当前页面所有未选中的设备
      const currentPageDevices = filteredDevices.filter(
        device => !tempSelectedOptions.some(d => d.id === device.id),
      );
      setTempSelectedOptions(prev => [...prev, ...currentPageDevices]);
    } else {
      // 取消全选：移除当前页面的所有设备
      const currentPageDeviceIds = filteredDevices.map(d => d.id);
      setTempSelectedOptions(prev =>
        prev.filter(d => !currentPageDeviceIds.includes(d.id)),
      );
    }
  };

  // 检查当前页是否全选
  const isCurrentPageAllSelected =
    filteredDevices.length > 0 &&
    filteredDevices.every(device =>
      tempSelectedOptions.some(d => d.id === device.id),
    );

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{ height: "100vh" }}
      closeOnMaskClick={false}
    >
      <Layout
        header={
          <PopupHeader
            title="选择设备"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="搜索设备IMEI/备注/微信号"
            loading={loading}
            onRefresh={() => fetchDevices(searchQuery, currentPage)}
            showTabs={true}
            tabsConfig={{
              activeKey: statusFilter,
              onChange: setStatusFilter,
              tabs: [
                { title: "全部", key: "all" },
                { title: "在线", key: "online" },
                { title: "离线", key: "offline" },
              ],
            }}
          />
        }
        footer={
          <PopupFooter
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loading}
            selectedCount={tempSelectedOptions.length}
            onPageChange={setCurrentPage}
            onCancel={onClose}
            onConfirm={() => {
              // 用户点击确认时，才更新实际的selectedOptions
              onSelect(tempSelectedOptions);
              onClose();
            }}
            isAllSelected={isCurrentPageAllSelected}
            onSelectAll={handleSelectAllCurrentPage}
          />
        }
      >
        <div className={style.deviceList}>
          {loading ? (
            <div className={style.loadingBox}>
              <div className={style.loadingText}>加载中...</div>
            </div>
          ) : (
            <div className={style.deviceListInner}>
              {filteredDevices.map(device => (
                <div key={device.id} className={style.deviceItem}>
                  {/* 顶部行：选择框和IMEI */}
                  <div className={style.headerRow}>
                    <div className={style.checkboxContainer}>
                      <Checkbox
                        checked={tempSelectedOptions.some(
                          v => v.id === device.id,
                        )}
                        onChange={() => handleDeviceToggle(device)}
                        className={style.deviceCheckbox}
                      />
                    </div>
                    <span className={style.imeiText}>
                      IMEI: {device.imei?.toUpperCase()}
                    </span>
                  </div>

                  {/* 主要内容区域：头像和详细信息 */}
                  <div className={style.mainContent}>
                    {/* 头像 */}
                    <div className={style.deviceAvatar}>
                      {device.avatar ? (
                        <img src={device.avatar} alt="头像" />
                      ) : (
                        <span className={style.avatarText}>
                          {(device.memo || device.wechatId || "设")[0]}
                        </span>
                      )}
                    </div>

                    {/* 设备信息 */}
                    <div className={style.deviceContent}>
                      <div className={style.deviceInfoRow}>
                        <span className={style.deviceName}>{device.memo}</span>
                        <div
                          className={
                            device.status === "online"
                              ? style.statusOnline
                              : style.statusOffline
                          }
                        >
                          {device.status === "online" ? "在线" : "离线"}
                        </div>
                      </div>
                      <div className={style.deviceInfoDetail}>
                        <div className={style.infoItem}>
                          <span className={style.infoLabel}>微信号:</span>
                          <span className={style.infoValue}>
                            {device.wechatId}
                          </span>
                        </div>
                        <div className={style.infoItem}>
                          <span className={style.infoLabel}>好友数:</span>
                          <span
                            className={`${style.infoValue} ${style.friendCount}`}
                          >
                            {device.totalFriend ?? "-"}
                          </span>
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
    </Popup>
  );
};

export default SelectionPopup;
