import React from "react";
import styles from "./LocationMessage.module.scss";

interface LocationMessageProps {
  content: string;
}

interface LocationData {
  x: string; // 经度
  y: string; // 纬度
  scale: string; // 缩放级别
  label: string; // 地址标签
  maptype: string; // 地图类型
  poiname: string; // POI名称
  poiid: string; // POI ID
  buildingId: string; // 建筑ID
  floorName: string; // 楼层名称
  poiCategoryTips: string; // POI分类提示
  poiBusinessHour: string; // 营业时间
  poiPhone: string; // 电话
  poiPriceTips: string; // 价格提示
  isFromPoiList: string; // 是否来自POI列表
  adcode: string; // 行政区划代码
  cityname: string; // 城市名称
  fromusername: string; // 发送者用户名
}

const LocationMessage: React.FC<LocationMessageProps> = ({ content }) => {
  // 统一的错误消息渲染函数
  const renderErrorMessage = (fallbackText: string) => (
    <div className={styles.messageText}>{fallbackText}</div>
  );

  if (typeof content !== "string" || !content.trim()) {
    return renderErrorMessage("[位置消息 - 无效内容]");
  }

  try {
    // 解析位置消息内容
    const parseLocationContent = (content: string): LocationData | null => {
      try {
        // 提取XML中的location标签内容
        const locationMatch = content.match(/<location[^>]*>/);
        if (!locationMatch) {
          return null;
        }

        const locationTag = locationMatch[0];

        // 提取所有属性
        const extractAttribute = (tag: string, attrName: string): string => {
          const regex = new RegExp(`${attrName}="([^"]*)"`);
          const match = tag.match(regex);
          return match ? match[1] : "";
        };

        return {
          x: extractAttribute(locationTag, "x"),
          y: extractAttribute(locationTag, "y"),
          scale: extractAttribute(locationTag, "scale"),
          label: extractAttribute(locationTag, "label"),
          maptype: extractAttribute(locationTag, "maptype"),
          poiname: extractAttribute(locationTag, "poiname"),
          poiid: extractAttribute(locationTag, "poiid"),
          buildingId: extractAttribute(locationTag, "buildingId"),
          floorName: extractAttribute(locationTag, "floorName"),
          poiCategoryTips: extractAttribute(locationTag, "poiCategoryTips"),
          poiBusinessHour: extractAttribute(locationTag, "poiBusinessHour"),
          poiPhone: extractAttribute(locationTag, "poiPhone"),
          poiPriceTips: extractAttribute(locationTag, "poiPriceTips"),
          isFromPoiList: extractAttribute(locationTag, "isFromPoiList"),
          adcode: extractAttribute(locationTag, "adcode"),
          cityname: extractAttribute(locationTag, "cityname"),
          fromusername: extractAttribute(locationTag, "fromusername"),
        };
      } catch (error) {
        console.error("解析位置消息失败:", error);
        return null;
      }
    };

    const locationData = parseLocationContent(content);

    if (!locationData) {
      return renderErrorMessage("[位置消息 - 解析失败]");
    }

    // 格式化经纬度为6位小数
    const formatCoordinate = (coord: string): string => {
      const num = parseFloat(coord);
      if (isNaN(num)) {
        return coord; // 如果无法解析，返回原值
      }
      return num.toFixed(6);
    };

    // 生成地图链接（用于点击跳转）
    const generateMapUrl = (lat: string, lng: string, label: string) => {
      const formattedLat = formatCoordinate(lat);
      const formattedLng = formatCoordinate(lng);
      // 使用腾讯地图链接
      return `https://apis.map.qq.com/uri/v1/marker?marker=coord:${formattedLng},${formattedLat};title:${encodeURIComponent(label)}&referer=wechat`;
    };

    // 生成静态地图预览图URL
    const generateStaticMapUrl = (
      lat: string,
      lng: string,
      width: number = 420,
      height: number = 200,
    ) => {
      const formattedLat = formatCoordinate(lat);
      const formattedLng = formatCoordinate(lng);
      const key = "7DZBZ-ZSRK3-QJN3W-O5VTV-4E2P6-7GFYX";
      const zoom = locationData.scale || "15";
      // 腾讯地图静态地图API
      return `https://apis.map.qq.com/ws/staticmap/v2/?center=${formattedLng},${formattedLat}&zoom=${zoom}&size=${width}x${height}&markers=${formattedLng},${formattedLat}&key=${key}`;
    };

    const mapUrl = generateMapUrl(
      locationData.y,
      locationData.x,
      locationData.label,
    );

    const staticMapUrl = generateStaticMapUrl(
      locationData.y,
      locationData.x,
      420,
      200,
    );

    // 处理POI信息
    // 提取道路名称（如果有的话，从label中提取）
    const roadName =
      locationData.poiname.split(/[（(]/)[0] || locationData.label;
    const detailAddress = locationData.label;

    return (
      <div className={styles.locationMessage}>
        <div
          className={styles.locationCard}
          onClick={() => window.open(mapUrl, "_blank")}
        >
          {/* 地图预览图 */}
          <div className={styles.mapPreview}>
            <img
              src={staticMapUrl}
              alt={locationData.label}
              className={styles.mapImage}
              onError={e => {
                // 如果图片加载失败，显示占位符
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = "flex";
                }
              }}
            />
            <div className={styles.mapPlaceholder}>
              <span>📍</span>
              <span>地图加载中...</span>
            </div>
          </div>

          {/* 位置信息 */}
          <div className={styles.locationContent}>
            {/* 道路名称 */}
            {roadName && <div className={styles.roadName}>{roadName}</div>}

            {/* 详细地址 */}
            <div className={styles.locationAddress}>{detailAddress}</div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("位置消息渲染失败:", error);
    return renderErrorMessage("[位置消息 - 渲染失败]");
  }
};

export default LocationMessage;
