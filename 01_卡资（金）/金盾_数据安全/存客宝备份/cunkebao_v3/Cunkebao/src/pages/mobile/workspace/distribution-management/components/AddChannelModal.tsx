import React, { useState, useEffect, useRef } from "react";
import { Button, TextArea, SpinLoading } from "antd-mobile";
import { Modal, Input, message } from "antd";
import { CloseOutlined, UserOutlined, QrcodeOutlined } from "@ant-design/icons";
import { generateQRCode } from "../api";
import styles from "./AddChannelModal.module.scss";

interface AddChannelModalProps {
  visible: boolean;
  onClose: () => void;
  editData?: {
    id: string;
    name: string;
    phone?: string;
    wechatId?: string;
    remarks?: string;
  };
  onSubmit?: (data: {
    id?: string;
    name: string;
    phone?: string;
    wechatId?: string;
    remarks?: string;
  }) => void;
}

type CreateMethod = "manual" | "scan";

const AddChannelModal: React.FC<AddChannelModalProps> = ({
  visible,
  onClose,
  editData,
  onSubmit,
}) => {
  const isEdit = !!editData;
  const [createMethod, setCreateMethod] = useState<CreateMethod>("manual");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    wechatId: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [qrCodeType, setQrCodeType] = useState<"h5" | "miniprogram">("h5");
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode: string;
    url: string;
    type: "h5" | "miniprogram";
  } | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const generatingRef = useRef(false); // 用于防止重复请求

  // 当编辑数据变化时，更新表单数据
  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || "",
        phone: editData.phone || "",
        wechatId: editData.wechatId || "",
        remarks: editData.remarks || "",
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        wechatId: "",
        remarks: "",
      });
    }
  }, [editData, visible]);

  // 当弹窗打开时，如果是扫码创建模式，自动生成二维码
  useEffect(() => {
    // 弹窗打开时，如果是扫码创建模式，无论之前是否有数据都重新生成
    if (visible && !isEdit && createMethod === "scan" && !qrCodeLoading && !generatingRef.current) {
      // 重置状态后重新生成（无论之前是否有数据）
      setQrCodeData(null);
      setScanning(false);
      // 使用 setTimeout 确保状态更新完成
      const timer = setTimeout(() => {
        handleGenerateQRCode();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 当二维码类型变化时，重新生成二维码（无论之前是否成功或失败都要重新生成）
  useEffect(() => {
    if (visible && !isEdit && createMethod === "scan" && !qrCodeLoading && !generatingRef.current) {
      // 重置状态后重新生成（无论之前是否有数据）
      setQrCodeData(null);
      setScanning(false);
      // 使用 setTimeout 确保状态更新完成
      const timer = setTimeout(() => {
        handleGenerateQRCode();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCodeType, visible, createMethod]);

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // 手机号是可选的，空值视为有效
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 处理手机号输入，只允许输入数字，最多11位
  const handlePhoneChange = (value: string) => {
    // 只保留数字
    const numbersOnly = value.replace(/\D/g, "");
    // 限制最多11位
    const limitedValue = numbersOnly.slice(0, 11);
    handleInputChange("phone", limitedValue);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (createMethod === "manual") {
      if (!formData.name.trim()) {
        message.error("请输入渠道名称");
        return;
      }

      // 验证手机号格式
      if (formData.phone && formData.phone.trim()) {
        if (!validatePhone(formData.phone.trim())) {
          message.error("请输入正确的手机号（11位数字，1开头）");
          return;
        }
      }

      setLoading(true);
      try {
        await onSubmit?.({
          id: editData?.id,
          name: formData.name.trim(),
          phone: formData.phone?.trim() || undefined,
          wechatId: formData.wechatId?.trim() || undefined,
          remarks: formData.remarks?.trim() || undefined,
        });
        // 成功后关闭弹窗（父组件会处理成功提示）
        handleClose();
      } catch (e) {
        // 错误已在父组件处理，这里不需要再次提示
        // 保持弹窗打开，让用户修改后重试
      } finally {
        setLoading(false);
      }
    } else {
      // 扫码创建逻辑
      if (!scanning) {
        setScanning(true);
        // TODO: 实现扫码创建逻辑
        message.info("扫码创建功能开发中");
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      phone: "",
      wechatId: "",
      remarks: "",
    });
    setScanning(false);
    setQrCodeData(null);
    setQrCodeType("h5");
    onClose();
  };

  // 生成二维码
  const handleGenerateQRCode = async () => {
    // 如果正在生成，直接返回，避免重复请求
    if (generatingRef.current || qrCodeLoading) {
      return;
    }
    generatingRef.current = true;
    setQrCodeLoading(true);
    try {
      const res = await generateQRCode(qrCodeType);
      // 确保返回的数据有效
      if (res && res.qrCode) {
        setQrCodeData(res);
        setScanning(true);
      } else {
        throw new Error("二维码数据格式错误");
      }
    } catch (e: any) {
      // 接口拦截器已经显示了错误提示，这里不需要再次显示
      // 请求失败时重置状态，允许重试
      setQrCodeData(null);
      setScanning(false);
    } finally {
      setQrCodeLoading(false);
      generatingRef.current = false;
    }
  };

  // 重新生成二维码
  const handleRegenerateQR = async () => {
    setScanning(false);
    setQrCodeData(null);
    await handleGenerateQRCode();
  };

  // 当切换到扫码创建时，自动生成二维码
  useEffect(() => {
    if (visible && createMethod === "scan" && !isEdit && !qrCodeLoading && !generatingRef.current) {
      // 重置状态后重新生成（无论之前是否有数据）
      setQrCodeData(null);
      setScanning(false);
      const timer = setTimeout(() => {
      handleGenerateQRCode();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMethod, visible]);

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      width="90%"
      style={{ maxWidth: "500px" }}
      centered
      className={styles.modalWrapper}
      maskClosable={true}
      closable={false}
    >
      <div className={styles.modal}>
        {/* 头部 */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>{isEdit ? "编辑渠道" : "新增渠道"}</h3>
            <p className={styles.subtitle}>
              {isEdit
                ? "修改渠道信息"
                : "选择创建方式: 手动填写或扫码获取微信信息"}
            </p>
          </div>
          <CloseOutlined className={styles.closeBtn} onClick={handleClose} />
        </div>

        {/* 创建方式选择 */}
        {!isEdit && (
          <div className={styles.methodTabs}>
            <button
              className={`${styles.methodTab} ${
                createMethod === "manual" ? styles.active : ""
              }`}
              onClick={() => setCreateMethod("manual")}
            >
              <UserOutlined className={styles.tabIcon} />
              <span>手动创建</span>
            </button>
            <button
              className={`${styles.methodTab} ${
                createMethod === "scan" ? styles.active : ""
              }`}
              onClick={() => setCreateMethod("scan")}
            >
              <QrcodeOutlined className={styles.tabIcon} />
              <span>扫码创建</span>
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div className={styles.content}>
          {createMethod === "manual" || isEdit ? (
            <div className={styles.form}>
              <div className={styles.formItem}>
                <label className={styles.label}>
                  渠道名称 <span className={styles.required}>*</span>
                </label>
                <Input
                  placeholder="请输入渠道名称"
                  value={formData.name}
                  onChange={e => handleInputChange("name", e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formItem}>
                <label className={styles.label}>联系电话</label>
                <Input
                  placeholder="请输入11位手机号"
                  value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  className={styles.input}
                  maxLength={11}
                  type="tel"
                />
                {formData.phone && formData.phone.length > 0 && (
                  <div className={styles.phoneHint}>
                    {formData.phone.length < 11 ? (
                      <span style={{ color: "#999", fontSize: "12px" }}>
                        还需输入 {11 - formData.phone.length} 位数字
                      </span>
                    ) : !validatePhone(formData.phone) ? (
                      <span style={{ color: "#ff4d4f", fontSize: "12px" }}>
                        手机号格式不正确，请以1开头
                      </span>
                    ) : (
                      <span style={{ color: "#52c41a", fontSize: "12px" }}>
                        ✓ 手机号格式正确
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formItem}>
                <label className={styles.label}>微信号</label>
                <Input
                  placeholder="请输入微信号"
                  value={formData.wechatId}
                  onChange={e => handleInputChange("wechatId", e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formItem}>
                <label className={styles.label}>备注</label>
                <TextArea
                  placeholder="请输入备注信息"
                  value={formData.remarks}
                  onChange={value => handleInputChange("remarks", value)}
                  className={styles.textarea}
                  rows={4}
                  showCount
                  maxLength={200}
                />
              </div>
            </div>
          ) : (
            <div className={styles.scanContent}>
              {/* 二维码类型选择 */}
              <div className={styles.qrCodeTypeSelector}>
                <div className={styles.typeTabs}>
                  <button
                    className={`${styles.typeTab} ${
                      qrCodeType === "h5" ? styles.active : ""
                    }`}
                    onClick={() => setQrCodeType("h5")}
                  >
                    H5
                  </button>
                  <button
                    className={`${styles.typeTab} ${
                      qrCodeType === "miniprogram" ? styles.active : ""
                    }`}
                    onClick={() => setQrCodeType("miniprogram")}
                  >
                    小程序
                  </button>
                </div>
              </div>

              <div className={styles.qrCodeContainer}>
                <div className={styles.qrCodeBox}>
                  {qrCodeLoading ? (
                    <div className={styles.qrCodeLoading}>
                      <SpinLoading color="primary" style={{ "--size": "24px" }} />
                      <span style={{ marginTop: "12px", fontSize: "14px", color: "#666" }}>
                        生成中...
                      </span>
                    </div>
                  ) : qrCodeData && qrCodeData.qrCode ? (
                    <img
                      src={qrCodeData.qrCode}
                      alt="二维码"
                      className={styles.qrCode}
                    />
                  ) : (
                    <div className={styles.qrCodePlaceholder}>
                      <QrcodeOutlined className={styles.qrCodeIcon} />
                      <span style={{ marginTop: "12px", fontSize: "14px", color: "#999" }}>
                        点击生成二维码
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className={styles.scanInstruction}>
                使用微信扫描二维码
              </p>
              <p className={styles.scanDescription}>
                扫描后将自动获取微信信息并创建渠道
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <Button
            fill="outline"
            onClick={handleClose}
            className={styles.cancelBtn}
          >
            取消
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            loading={loading}
            className={styles.submitBtn}
          >
            {isEdit ? "保存" : "创建"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddChannelModal;
