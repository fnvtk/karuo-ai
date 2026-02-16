import React, { useState, useEffect } from "react";
import { Card, Button, Toast, Dialog } from "antd-mobile";
import { Input } from "antd";
import style from "./index.module.scss";
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import NavCommon from "@/components/NavCommon";
import Layout from "@/components/Layout/Layout";
import { getTaocanList, buyPackage } from "./api";
import type { PowerPackage } from "./api";

const BuyPowerPage: React.FC = () => {
  const [packages, setPackages] = useState<PowerPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PowerPackage | null>(
    null,
  );
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await getTaocanList();
      setPackages(res.list || []);
    } catch (error) {
      console.error("获取套餐列表失败:", error);
      Toast.show({ content: "获取套餐列表失败", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const getPackageTag = (pkg: PowerPackage) => {
    if (pkg.isTrial === 1) return { text: "限购一次", color: "orange" };
    if (pkg.isRecommend === 1) return { text: "推荐", color: "blue" };
    if (pkg.isHot === 1) return { text: "热门", color: "green" };
    if (pkg.isVip === 1) return { text: "VIP", color: "purple" };
    return null;
  };

  const handleSelectPackage = (pkg: PowerPackage) => {
    setSelectedPackage(pkg);
    setCustomAmount(""); // 清空自定义金额
  };

  const handleBuy = async () => {
    if (!selectedPackage && !customAmount) {
      Toast.show({ content: "请选择套餐或输入自定义金额", position: "top" });
      return;
    }

    setLoading(true);
    try {
      let res;

      if (customAmount) {
        // 自定义购买
        const amount = parseFloat(customAmount);
        if (isNaN(amount) || amount < 1 || amount > 50000) {
          Toast.show({ content: "请输入1-50000之间的金额", position: "top" });
          setLoading(false);
          return;
        }
        res = await buyPackage({ price: amount });
      } else if (selectedPackage) {
        // 套餐购买
        res = await buyPackage({
          id: selectedPackage.id,
          price: selectedPackage.price,
        });
      }

      if (res?.code_url) {
        // 显示支付二维码
        Dialog.show({
          content: (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div
                style={{
                  marginBottom: "16px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                请使用微信扫码支付
              </div>
              <img
                src={res.code_url}
                alt="支付二维码"
                style={{ width: "250px", height: "250px", margin: "0 auto" }}
              />
              <div
                style={{ marginTop: "16px", color: "#666", fontSize: "14px" }}
              >
                {selectedPackage
                  ? `支付金额: ¥${selectedPackage.price / 100}`
                  : `支付金额: ¥${customAmount}`}
              </div>
            </div>
          ),
          closeOnMaskClick: true,
        });
      }
    } catch (error) {
      console.error("购买失败:", error);
      Toast.show({ content: "购买失败，请重试", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      header={<NavCommon title="购买算力包" />}
      footer={
        <div className={style.footer}>
          <Button
            block
            color="primary"
            size="large"
            className={style.buyButton}
            loading={loading}
            onClick={handleBuy}
            disabled={!selectedPackage && !customAmount}
          >
            {selectedPackage
              ? `立即购买 ¥${selectedPackage.price / 100}`
              : customAmount
                ? `立即购买 ¥${customAmount}`
                : "请选择套餐"}
          </Button>
        </div>
      }
    >
      <div className={style.buyPowerPage}>
        {/* 选择套餐标题 */}
        <div className={style.sectionTitle}>选择套餐</div>

        {/* 套餐列表 */}
        <div className={style.packageList}>
          {packages.map(pkg => {
            const tag = getPackageTag(pkg);
            const isSelected = selectedPackage?.id === pkg.id;

            return (
              <Card
                key={pkg.id}
                className={`${style.packageCard} ${isSelected ? style.packageCardActive : ""}`}
                onClick={() => handleSelectPackage(pkg)}
              >
                {/* 套餐头部 */}
                <div className={style.packageHeader}>
                  <div className={style.packageTitle}>
                    <span className={style.packageName}>{pkg.name}</span>
                    {tag && (
                      <span
                        className={`${style.packageTag} ${style[`tag-${tag.color}`]}`}
                      >
                        {tag.text}
                      </span>
                    )}
                  </div>
                  <div className={style.packagePrice}>
                    <span className={style.currentPrice}>
                      ¥{pkg.price / 100}
                    </span>
                    {pkg.originalPrice && (
                      <span className={style.originalPrice}>
                        ¥{pkg.originalPrice / 100}
                      </span>
                    )}
                  </div>
                </div>

                {/* 算力信息 */}
                <div className={style.packageTokens}>
                  {pkg.tokens?.toLocaleString()} 算力点
                </div>

                {/* 单价和优惠 */}
                <div className={style.packageMeta}>
                  <div className={style.unitPrice}>
                    单价
                    <br />
                    <span className={style.unitPriceValue}>
                      ¥{(pkg.unitPrice / 100).toFixed(4)}/点
                    </span>
                  </div>
                  {pkg.discount > 0 && (
                    <div className={style.discount}>
                      优惠幅度
                      <br />
                      <span className={style.discountValue}>
                        {pkg.discount}%
                      </span>
                    </div>
                  )}
                </div>

                {/* 描述信息 */}
                {pkg.description && pkg.description.length > 0 && (
                  <div className={style.packageDescription}>
                    {pkg.description.map((desc, index) => (
                      <span key={index} className={style.descriptionTag}>
                        {desc}
                      </span>
                    ))}
                  </div>
                )}

                {/* 特性列表 */}
                {pkg.features && pkg.features.length > 0 && (
                  <div className={style.packageFeatures}>
                    {pkg.features.map((feature, index) => (
                      <div key={index} className={style.featureItem}>
                        <CheckCircleOutlined className={style.featureIcon} />
                        {feature}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 自定义购买 */}
        <Card className={style.customCard}>
          <div className={style.customHeader}>
            <ThunderboltOutlined className={style.customIcon} />
            <span className={style.customTitle}>自定义购买</span>
          </div>
          <div className={style.customContent}>
            <div className={style.customLabel}>自定义金额（1-50000元）</div>
            <Input
              type="number"
              placeholder="请输入金额"
              value={customAmount}
              onChange={e => {
                setCustomAmount(e.target.value);
                setSelectedPackage(null); // 清空套餐选择
              }}
              style={{ fontSize: 16 }}
            />
          </div>
        </Card>

        {/* 安全保障 */}
        <Card className={style.securityCard}>
          <div className={style.securityHeader}>
            <SafetyOutlined className={style.securityIcon} />
            <span className={style.securityTitle}>安全保障</span>
          </div>
          <div className={style.securityList}>
            <div className={style.securityItem}>
              • 所有算力永久有效,无使用期限
            </div>
            <div className={style.securityItem}>
              • 支持微信支付、支付宝安全支付
            </div>
            <div className={style.securityItem}>
              • 购买后立即到账,7x24小时客服支持
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default BuyPowerPage;
