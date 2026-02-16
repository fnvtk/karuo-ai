import React, { useState, useEffect, useRef } from "react";
import { Modal, Input, Button, List, message, Spin, Space } from "antd";
import { SearchOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import styles from "./selectMap.module.scss";

// 声明腾讯地图类型（新版TMap API）
declare global {
  interface Window {
    TMap: any;
    geolocationRef: any; // 全局IP定位服务引用（TMap.service.IPLocation实例）
  }
}

interface SelectMapProps {
  visible: boolean;
  onClose: () => void;
  contract?: any;
  addMessage?: (message: any) => void;
  onConfirm?: (locationXml: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  adcode?: string;
  city?: string;
  district?: string;
}

interface LocationData {
  x: string; // 纬度
  y: string; // 经度
  scale: string; // 缩放级别
  label: string; // 地址标签
  poiname: string; // POI名称
  maptype: string; // 地图类型
  poiid: string; // POI ID
}

const SelectMap: React.FC<SelectMapProps> = ({
  visible,
  onClose,
  contract,
  addMessage,
  onConfirm,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null,
  );
  const [map, setMap] = useState<any>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [tmapLoaded, setTmapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geocoderRef = useRef<any>(null);
  const suggestServiceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { sendCommand } = useWebSocketStore.getState();

  // XML转义函数，防止特殊字符破坏XML格式
  const escapeXml = (str: string | undefined | null): string => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  // 加载腾讯地图SDK
  useEffect(() => {
    // 检查TMap是否已经加载
    if (window.TMap) {
      // 等待 API 完全初始化
      const checkAPIReady = () => {
        if (window.TMap && window.TMap.Map) {
          console.log("腾讯地图SDK已加载，API 可用");
          setTmapLoaded(true);
        } else {
          // 如果 API 还未完全初始化，等待一段时间后重试
          setTimeout(checkAPIReady, 100);
        }
      };
      checkAPIReady();
      return;
    }

    // 动态加载腾讯地图SDK（使用与index.html相同的密钥）
    const script = document.createElement("script");
    script.src =
      "https://map.qq.com/api/gljs?v=1.exp&libraries=service&key=7DZBZ-ZSRK3-QJN3W-O5VTV-4E2P6-7GFYX";
    script.async = true;
    script.onload = () => {
      console.log("腾讯地图SDK脚本加载成功，等待 API 初始化...");
      // 等待 API 完全初始化
      const checkAPIReady = () => {
        if (window.TMap && window.TMap.Map) {
          console.log("腾讯地图SDK API 初始化完成");
          setTmapLoaded(true);
        } else {
          // 如果 API 还未完全初始化，等待一段时间后重试（最多等待 5 秒）
          setTimeout(checkAPIReady, 100);
        }
      };
      // 延迟检查，给 API 一些初始化时间
      setTimeout(checkAPIReady, 200);
    };
    script.onerror = () => {
      console.error("腾讯地图SDK加载失败");
      message.error("地图加载失败，请刷新页面重试");
    };
    document.head.appendChild(script);

    return () => {
      // 清理script标签
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // 检查 TMap API 是否可用（辅助函数）
  const checkTMapAPI = () => {
    if (!window.TMap) {
      console.error("TMap 未加载");
      return false;
    }

    // 检查 MultiMarker 是否可用
    if (!window.TMap.MultiMarker) {
      console.error("TMap.MultiMarker 不可用", {
        TMap: window.TMap,
        keys: Object.keys(window.TMap || {}),
      });
      return false;
    }

    // 检查 Style 是否存在（可能是构造函数、对象或命名空间）
    // 注意：Style 可能不是构造函数，而是配置对象或命名空间
    const hasStyle =
      window.TMap.MultiMarker.Style !== undefined ||
      window.TMap.MarkerStyle !== undefined;

    if (!hasStyle) {
      console.warn("TMap Style API 不可用，将使用配置对象方式", {
        MultiMarker: window.TMap.MultiMarker,
        MultiMarkerKeys: Object.keys(window.TMap.MultiMarker || {}),
        MarkerStyle: window.TMap.MarkerStyle,
      });
      // 不返回 false，因为 MultiMarker 可能接受配置对象
    }

    return true;
  };

  // 创建标记样式（兼容不同的 API 版本）
  const createMarkerStyle = (options: any) => {
    // 检查 MultiMarker.Style 是否存在
    if (window.TMap.MultiMarker?.Style) {
      // 如果 Style 是函数（构造函数），使用 new
      if (typeof window.TMap.MultiMarker.Style === "function") {
        try {
          return new window.TMap.MultiMarker.Style(options);
        } catch (error) {
          console.warn(
            "使用 new MultiMarker.Style 失败，尝试直接返回配置对象:",
            error,
          );
          // 如果构造函数调用失败，直接返回配置对象
          return options;
        }
      } else {
        // 如果 Style 不是函数，可能是对象或命名空间，直接返回配置对象
        // MultiMarker 可能接受配置对象而不是 Style 实例
        console.log("MultiMarker.Style 不是构造函数，直接使用配置对象");
        return options;
      }
    }
    // 尝试 MarkerStyle
    if (window.TMap.MarkerStyle) {
      if (typeof window.TMap.MarkerStyle === "function") {
        try {
          return new window.TMap.MarkerStyle(options);
        } catch (error) {
          console.warn(
            "使用 new MarkerStyle 失败，尝试直接返回配置对象:",
            error,
          );
          return options;
        }
      } else {
        return options;
      }
    }
    // 如果都不存在，直接返回配置对象（让 MultiMarker 自己处理）
    console.warn("未找到 Style API，直接使用配置对象");
    return options;
  };

  // 初始化地图
  useEffect(() => {
    if (visible && mapContainerRef.current && tmapLoaded && window.TMap) {
      console.log("开始初始化地图");
      console.log("TMap API 检查:", {
        TMap: !!window.TMap,
        MultiMarker: !!window.TMap.MultiMarker,
        MultiMarkerStyle: !!window.TMap.MultiMarker?.Style,
        MarkerStyle: !!window.TMap.MarkerStyle,
      });

      // 检查容器尺寸，确保容器有有效的宽高
      const checkContainerSize = () => {
        if (!mapContainerRef.current) return false;
        const rect = mapContainerRef.current.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let mapInstance: any = null;
      let handleMapClickFn: ((evt: any) => void) | null = null;
      let delayTimer: NodeJS.Timeout | null = null;
      let isMounted = true; // 标记弹窗是否仍然打开

      // 初始化地图函数（使用箭头函数避免函数声明位置问题）
      const initializeMap = () => {
        if (!mapContainerRef.current) return;

        try {
          // 再次检查容器尺寸
          const rect = mapContainerRef.current.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            console.error("地图容器尺寸无效:", rect);
            message.error("地图容器尺寸无效，请刷新页面重试");
            return;
          }

          // 创建地图实例
          const center = new window.TMap.LatLng(39.908823, 116.39747); // 默认北京
          mapInstance = new window.TMap.Map(mapContainerRef.current, {
            center: center,
            zoom: 13,
            rotation: 0,
            pitch: 0,
          });

          setMap(mapInstance);

          // 创建地理编码服务（用于反向地理编码）
          geocoderRef.current = new window.TMap.service.Geocoder();

          // 创建IP定位服务
          window.geolocationRef = new window.TMap.service.IPLocation();

          // 创建搜索建议服务
          suggestServiceRef.current = new window.TMap.service.Suggestion({
            pageSize: 10,
            autoExtend: true,
          });

          // 地图点击事件处理函数
          handleMapClickFn = (evt: any) => {
            try {
              // 检查弹窗是否仍然打开，以及必要的API是否可用
              if (!isMounted || !mapInstance || !mapContainerRef.current) {
                return;
              }

              // 检查 TMap API 是否可用
              if (!checkTMapAPI()) {
                console.error("TMap API 不可用，无法创建标记点");
                message.warning("地图标记功能不可用，请刷新页面重试");
                return;
              }

              const lat = evt.latLng.getLat();
              const lng = evt.latLng.getLng();

              console.log("地图点击:", lat, lng);

              // 更新标记点
              if (markerRef.current) {
                markerRef.current.setMap(null);
                markerRef.current = null;
              }

              // 创建标记样式
              const markerStyle = createMarkerStyle({
                width: 25,
                height: 35,
                anchor: { x: 12, y: 35 },
                src: "https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png",
              });

              // 创建新标记
              const newMarker = new window.TMap.MultiMarker({
                id: "marker-layer",
                map: mapInstance,
                styles: {
                  marker: markerStyle,
                },
                geometries: [
                  {
                    id: "selected-marker",
                    styleId: "marker",
                    position: new window.TMap.LatLng(lat, lng),
                    properties: {
                      title: "选中位置",
                    },
                  },
                ],
              });

              markerRef.current = newMarker;

              // 设置基本位置信息（防止白屏）
              // 经纬度格式化为6位小数（微信位置消息标准格式）
              setSelectedLocation({
                x: lat.toString(),
                y: lng.toString(),
                scale: "16",
                label: `${lat}, ${lng}`,
                poiname: "选中位置",
                maptype: "0",
                poiid: "",
              });

              // 反向地理编码获取地址
              if (!isMounted || !geocoderRef.current) {
                return;
              }

              setIsReverseGeocoding(true);
              geocoderRef.current
                .getAddress({ location: new window.TMap.LatLng(lat, lng) })
                .then((result: any) => {
                  // 检查弹窗是否仍然打开
                  if (!isMounted) {
                    return;
                  }
                  setIsReverseGeocoding(false);
                  console.log("反向地理编码结果:", result);

                  try {
                    if (result && result.result) {
                      const resultData = result.result;
                      const address = resultData.address || "";
                      const addressComponent =
                        resultData.address_component || {};
                      const formattedAddresses =
                        resultData.formatted_addresses || {};

                      // 构建地址标签
                      let addressLabel =
                        formattedAddresses.recommend ||
                        formattedAddresses.rough ||
                        address;

                      if (!addressLabel) {
                        const parts = [];
                        if (addressComponent.province)
                          parts.push(addressComponent.province);
                        if (addressComponent.city)
                          parts.push(addressComponent.city);
                        if (addressComponent.district)
                          parts.push(addressComponent.district);
                        if (addressComponent.street)
                          parts.push(addressComponent.street);
                        if (addressComponent.street_number)
                          parts.push(addressComponent.street_number);
                        addressLabel = parts.join("");
                      }

                      if (!addressLabel) {
                        addressLabel = `${lat}, ${lng}`;
                      }

                      // 经纬度格式化为6位小数（微信位置消息标准格式）
                      setSelectedLocation({
                        x: lat.toString(),
                        y: lng.toString(),
                        scale: "16",
                        label: addressLabel,
                        poiname: addressComponent.street || "未知位置",
                        maptype: "0",
                        poiid: resultData.poi_id || "",
                      });
                    } else {
                      message.warning("获取详细地址信息失败，将使用坐标显示");
                    }
                  } catch (error) {
                    console.error("解析地址信息错误:", error);
                    message.warning("解析地址信息失败，将使用坐标显示");
                  }
                })
                .catch((error: any) => {
                  // 检查弹窗是否仍然打开
                  if (!isMounted) {
                    return;
                  }
                  setIsReverseGeocoding(false);
                  console.error("反向地理编码错误:", error);
                  message.warning("获取详细地址信息失败，将使用坐标显示");
                });
            } catch (error) {
              console.error("地图点击处理错误:", error);
              message.error("处理地图点击时出错，请重试");
            }
          };

          // 绑定地图点击事件
          mapInstance.on("click", handleMapClickFn);

          // 使用腾讯地图API初始化用户位置
          const initializeUserLocation = (
            lat: number,
            lng: number,
            isDefault: boolean = false,
          ) => {
            // 检查弹窗是否仍然打开，以及必要的API是否可用
            if (!isMounted || !mapInstance || !mapContainerRef.current) {
              console.log("弹窗已关闭或地图实例无效，跳过初始化位置");
              return;
            }

            // 检查 TMap API 是否可用
            if (!checkTMapAPI()) {
              console.error("TMap API 不可用，无法创建标记点");
              message.warning("地图标记功能不可用，请刷新页面重试");
              return;
            }

            // 创建位置对象
            let userLocation: any = null;
            try {
              console.log(isDefault ? "使用默认位置:" : "用户位置:", lat, lng);

              // 移动地图中心到位置
              userLocation = new window.TMap.LatLng(lat, lng);
              mapInstance.setCenter(userLocation);
              mapInstance.setZoom(16);

              // 添加标记点
              if (markerRef.current) {
                markerRef.current.setMap(null);
                markerRef.current = null;
              }

              // 创建标记样式
              const markerStyle = createMarkerStyle({
                width: 25,
                height: 35,
                anchor: { x: 12, y: 35 },
                src: "https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png",
              });

              const newMarker = new window.TMap.MultiMarker({
                id: "marker-layer",
                map: mapInstance,
                styles: {
                  marker: markerStyle,
                },
                geometries: [
                  {
                    id: "user-location",
                    styleId: "marker",
                    position: userLocation,
                    properties: {
                      title: isDefault ? "默认位置" : "当前位置",
                    },
                  },
                ],
              });

              markerRef.current = newMarker;
            } catch (error) {
              console.error("创建标记点失败:", error);
              // 即使创建标记失败，也设置基本的位置信息
              // 经纬度格式化为6位小数（微信位置消息标准格式）
              setSelectedLocation({
                x: lat.toString(),
                y: lng.toString(),
                scale: "16",
                label: `${lat}, ${lng}`,
                poiname: isDefault ? "默认位置" : "当前位置",
                maptype: "0",
                poiid: "",
              });
              return;
            }

            // 使用腾讯地图服务获取该位置的地址信息
            if (!isMounted || !geocoderRef.current || !userLocation) {
              return;
            }

            setIsReverseGeocoding(true);
            geocoderRef.current
              .getAddress({ location: userLocation })
              .then((result: any) => {
                // 检查弹窗是否仍然打开
                if (!isMounted) {
                  return;
                }
                setIsReverseGeocoding(false);
                if (result && result.result) {
                  const resultData = result.result;
                  const formattedAddresses =
                    resultData.formatted_addresses || {};
                  const addressComponent = resultData.address_component || {};

                  const addressLabel =
                    formattedAddresses.recommend ||
                    formattedAddresses.rough ||
                    resultData.address ||
                    `${lat}, ${lng}`;

                  // 经纬度格式化为6位小数（微信位置消息标准格式）
                  setSelectedLocation({
                    x: lat.toString(),
                    y: lng.toString(),
                    scale: "16",
                    label: addressLabel,
                    poiname:
                      addressComponent.street ||
                      (isDefault ? "默认位置" : "当前位置"),
                    maptype: "0",
                    poiid: resultData.poi_id || "",
                  });
                }
              })
              .catch((error: any) => {
                // 检查弹窗是否仍然打开
                if (!isMounted) {
                  return;
                }
                setIsReverseGeocoding(false);
                console.error("获取地址信息失败:", error);
                // 即使获取地址失败，也设置基本的位置信息
                // 经纬度格式化为6位小数（微信位置消息标准格式）
                setSelectedLocation({
                  x: lat.toString(),
                  y: lng.toString(),
                  scale: "16",
                  label: `${lat}, ${lng}`,
                  poiname: isDefault ? "默认位置" : "当前位置",
                  maptype: "0",
                  poiid: "",
                });
              });
          };

          // 使用腾讯地图IP定位获取用户位置
          setIsLocating(true);
          try {
            if (window.geolocationRef) {
              window.geolocationRef
                .locate()
                .then((result: any) => {
                  // 检查弹窗是否仍然打开
                  if (!isMounted) {
                    return;
                  }
                  setIsLocating(false);
                  console.log("IP定位结果:", result);
                  if (result && result.result && result.result.location) {
                    const { lat, lng } = result.result.location;
                    // message.info("已定位到您的大致位置");
                    initializeUserLocation(lat, lng, false);
                  } else {
                    // IP定位失败：使用默认位置
                    message.info("无法获取您的位置，已定位到北京");
                    // 使用默认位置（北京市）
                    initializeUserLocation(39.908823, 116.39747, true);
                  }
                })
                .catch((error: any) => {
                  // 检查弹窗是否仍然打开
                  if (!isMounted) {
                    return;
                  }
                  setIsLocating(false);
                  console.error("IP定位失败:", error);
                  message.info("无法获取您的位置，已定位到北京");
                  // 使用默认位置（北京市）
                  initializeUserLocation(39.908823, 116.39747, true);
                });
            } else {
              // IP定位服务未初始化：使用默认位置
              setIsLocating(false);
              message.info("无法获取您的位置，已定位到北京");
              // 使用默认位置（北京市）
              initializeUserLocation(39.908823, 116.39747, true);
            }
          } catch (error) {
            // 捕获任何可能的错误，防止白屏
            console.error("定位过程中发生错误:", error);
            if (isMounted) {
              setIsLocating(false);
              message.error("定位服务出现异常，已定位到北京");
              // 使用默认位置（北京市）
              initializeUserLocation(39.908823, 116.39747, true);
            }
          }
        } catch (error) {
          console.error("初始化地图时出错:", error);
          message.error("地图加载失败，请刷新页面重试");
          setIsLocating(false);
        }
      };

      // 使用 requestAnimationFrame 确保容器尺寸正确后再初始化
      const initTimer = requestAnimationFrame(() => {
        // 再次检查容器尺寸
        if (!checkContainerSize()) {
          console.log("容器尺寸无效，延迟初始化地图");
          delayTimer = setTimeout(() => {
            if (checkContainerSize() && mapContainerRef.current) {
              initializeMap();
            } else {
              console.error("地图容器尺寸仍然无效");
              message.error("地图容器初始化失败，请刷新页面重试");
            }
          }, 100);
          return;
        }

        // 容器尺寸有效，立即初始化
        initializeMap();
      });

      // 清理函数
      return () => {
        // 标记弹窗已关闭
        isMounted = false;
        // 取消 requestAnimationFrame
        cancelAnimationFrame(initTimer);
        // 清理延迟定时器
        if (delayTimer) {
          clearTimeout(delayTimer);
        }
        // 清理地图事件监听
        if (mapInstance && handleMapClickFn) {
          try {
            mapInstance.off("click", handleMapClickFn);
          } catch (error) {
            console.error("清理地图事件监听失败:", error);
          }
        }
        // 清理地图实例
        if (mapInstance) {
          try {
            mapInstance.destroy();
          } catch (error) {
            console.error("销毁地图实例失败:", error);
          }
          mapInstance = null;
        }
        // 清理标记点
        if (markerRef.current) {
          try {
            markerRef.current.setMap(null);
          } catch (error) {
            console.error("清理标记点失败:", error);
          }
          markerRef.current = null;
        }
        // 重置地图状态
        setMap(null);
      };
    }
  }, [visible, tmapLoaded]);

  // 搜索地址（获取搜索建议）
  const handleSearch = () => {
    try {
      if (!searchValue.trim()) {
        message.warning("请输入搜索关键词");
        return;
      }

      if (!suggestServiceRef.current) {
        message.error("搜索服务未初始化，请刷新页面重试");
        return;
      }

      setIsSearching(true);
      suggestServiceRef.current
        .getSuggestions({
          keyword: searchValue,
          location: map ? map.getCenter() : undefined,
        })
        .then((result: any) => {
          setIsSearching(false);
          console.log("搜索建议结果:", result);

          if (result && result.data && result.data.length > 0) {
            const searchResults = result.data.map((item: any) => ({
              id: item.id,
              title: item.title || item.name || "",
              address: item.address || "",
              location: {
                lat: item.location.lat,
                lng: item.location.lng,
              },
              adcode: item.adcode || "",
              city: item.city || "",
              district: item.district || "",
            }));
            setSearchResults(searchResults);
          } else {
            setSearchResults([]);
            message.info("未找到相关地址");
          }
        })
        .catch((error: any) => {
          setIsSearching(false);
          console.error("搜索失败:", error);
          message.error("搜索失败，请重试");
          // 确保搜索状态被重置
          setSearchResults([]);
        });
    } catch (error) {
      setIsSearching(false);
      console.error("搜索处理错误:", error);
      message.error("搜索过程中出错，请重试");
      setSearchResults([]);
    }
  };

  // 选择搜索结果
  const handleSelectResult = (result: SearchResult) => {
    try {
      if (!map) {
        message.error("地图未初始化，请刷新页面重试");
        return;
      }

      // 检查 TMap API 是否可用
      if (!checkTMapAPI()) {
        console.error("TMap API 不可用，无法创建标记点");
        message.error("地图API不可用，请刷新页面重试");
        return;
      }

      const lat = result.location.lat;
      const lng = result.location.lng;

      console.log("选择搜索结果:", result);

      // 移动地图中心
      map.setCenter(new window.TMap.LatLng(lat, lng));
      map.setZoom(16);

      // 更新标记点
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      // 创建标记样式
      const markerStyle = createMarkerStyle({
        width: 25,
        height: 35,
        anchor: { x: 12, y: 35 },
        src: "https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png",
      });

      const newMarker = new window.TMap.MultiMarker({
        id: "marker-layer",
        map: map,
        styles: {
          marker: markerStyle,
        },
        geometries: [
          {
            id: "selected-poi",
            styleId: "marker",
            position: new window.TMap.LatLng(lat, lng),
            properties: {
              title: result.title,
            },
          },
        ],
      });

      markerRef.current = newMarker;

      // 设置选中的位置信息
      // 经纬度格式化为6位小数（微信位置消息标准格式）
      setSelectedLocation({
        x: lat.toString(),
        y: lng.toString(),
        scale: "16",
        label: result.address || result.title,
        poiname: result.title || "",
        maptype: "0",
        poiid: result.id || "",
      });

      // 清空搜索结果
      setSearchResults([]);
      setSearchValue("");
    } catch (error) {
      console.error("选择搜索结果错误:", error);
      message.error("选择位置时出错，请重试");
    }
  };

  // 确认选择
  const handleConfirm = () => {
    try {
      if (!selectedLocation) {
        message.warning("请先选择位置");
        return;
      }

      // 转义XML特殊字符，确保格式正确
      // 注意：经纬度在存储时已经格式化为6位小数，直接使用即可
      const escapedLabel = escapeXml(selectedLocation.label);
      const escapedPoiname = escapeXml(selectedLocation.poiname);
      const scale = selectedLocation.scale || "16";
      const maptype = selectedLocation.maptype || "0";
      const poiid = escapeXml(selectedLocation.poiid || "");

      // 生成XML格式的位置信息（格式与正确示例保持一致）
      const locationXml =
        '<msg><location\n                    x="' +
        selectedLocation.x +
        '"\n                    y="' +
        selectedLocation.y +
        '"\n                    scale="' +
        scale +
        '"\n                    label="' +
        escapedLabel +
        '"\n                    poiname="' +
        escapedPoiname +
        '"\n                    infourl=""\n                    maptype="' +
        maptype +
        '"\n                    poiid="' +
        poiid +
        '" /></msg>';

      // 如果有onConfirm回调，调用它
      if (onConfirm) {
        onConfirm(locationXml);
      }

      // 如果有addMessage和contract，发送位置消息
      if (addMessage && contract) {
        const messageId = +Date.now();
        const localMessage = {
          id: messageId,
          wechatAccountId: contract.wechatAccountId,
          wechatFriendId: contract?.chatroomId ? 0 : contract.id,
          wechatChatroomId: contract?.chatroomId ? contract.id : 0,
          tenantId: 0,
          accountId: 0,
          synergyAccountId: 0,
          content: locationXml,
          msgType: 48, // 位置消息类型
          msgSubType: 0,
          msgSvrId: "",
          isSend: true,
          createTime: new Date().toISOString(),
          isDeleted: false,
          deleteTime: "",
          sendStatus: 1,
          wechatTime: Date.now(),
          origin: 0,
          msgId: 0,
          recalled: false,
          seq: messageId,
        };

        addMessage(localMessage);
        console.log(locationXml);

        // 发送消息到服务器
        sendCommand("CmdSendMessage", {
          wechatAccountId: contract.wechatAccountId,
          wechatChatroomId: contract?.chatroomId ? contract.id : 0,
          wechatFriendId: contract?.chatroomId ? 0 : contract.id,
          msgSubType: 0,
          msgType: 48,
          content: locationXml,
          seq: messageId,
        });
      }

      // 关闭弹窗并重置状态
      handleClose();
    } catch (error) {
      console.error("确认位置时出错:", error);
      message.error("发送位置信息时出错，请重试");
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    setSearchValue("");
    setSearchResults([]);
    setSelectedLocation(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    setIsSearching(false);
    setIsReverseGeocoding(false);
    setIsLocating(false);
    onClose();
  };

  return (
    <Modal
      title="选择位置"
      open={visible}
      onCancel={handleClose}
      width={900}
      centered
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!selectedLocation || isReverseGeocoding}
        >
          {isReverseGeocoding ? "正在获取地址信息..." : "确认"}
        </Button>,
      ]}
    >
      <div className={styles.selectMapContainer}>
        {/* 搜索区域 */}
        <div className={styles.searchArea}>
          {/* ✅ 使用 Space.Compact 替代 Input 的 suffix（addonAfter 已废弃） */}
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="搜索地址"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              className={styles.searchInput}
            />
            <Button
              type="primary"
              onClick={handleSearch}
              loading={isSearching}
            >
              搜索
            </Button>
          </Space.Compact>

          {/* 搜索结果列表 */}
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              <List
                dataSource={searchResults}
                renderItem={item => (
                  <List.Item
                    className={styles.resultItem}
                    onClick={() => handleSelectResult(item)}
                  >
                    <List.Item.Meta
                      avatar={<EnvironmentOutlined />}
                      title={item.title}
                      description={item.address}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>

        {/* 地图区域 */}
        <div className={styles.mapArea}>
          <Spin
            spinning={isReverseGeocoding || isLocating}
            tip={isLocating ? "正在定位您的位置..." : "正在获取地址信息..."}
          >
            <div ref={mapContainerRef} className={styles.mapContainer} />
          </Spin>
        </div>

        {/* 选中位置信息 */}
        {selectedLocation && (
          <div className={styles.locationInfo}>
            <div className={styles.locationLabel}>
              <EnvironmentOutlined /> 已选择位置
            </div>
            <div className={styles.locationText}>
              {selectedLocation.label || selectedLocation.poiname}
            </div>
            <div className={styles.locationCoords}>
              经度: {selectedLocation.y}, 纬度: {selectedLocation.x}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SelectMap;
