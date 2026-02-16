import { createPersistStore } from "@/store/createPersistStore";
import { useUserStore } from "../user";
import { useCkChatStore } from "@/store/module/ckchat/ckchat";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { msgManageCore } from "./msgManage";
// WebSocket消息类型
export interface WebSocketMessage {
  cmdType?: string;
  seq?: number;
  wechatAccountIds?: string[];
  content?: any;
  [key: string]: any;
}

// WebSocket连接状态
export enum WebSocketStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// WebSocket配置
interface WebSocketConfig {
  url: string;
  client: string;
  accountId: number;
  accessToken: string;
  autoReconnect: boolean;
  cmdType: string;
  seq: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  [key: string]: any;
}

interface WebSocketState {
  // 连接状态
  status: WebSocketStatus;
  ws: WebSocket | null;

  // 配置信息
  config: WebSocketConfig | null;

  // 消息相关
  messages: WebSocketMessage[];
  unreadCount: number;

  // 重连相关
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  aliveStatusTimer: NodeJS.Timeout | null; // 客服用户状态查询定时器
  aliveStatusUnsubscribe: (() => void) | null;
  aliveStatusLastRequest: number | null;

  // 方法
  connect: (config: Partial<WebSocketConfig>) => void;
  disconnect: () => void;
  sendMessage: (message: Omit<WebSocketMessage, "id" | "timestamp">) => void;
  sendCommand: (cmdType: string, data?: any) => void;
  clearMessages: () => void;
  markAsRead: () => void;
  reconnect: () => void;
  clearConnectionState: () => void; // 清空连接状态

  // 内部方法
  _handleOpen: () => void;
  _handleMessage: (event: MessageEvent) => void;
  _handleClose: (event: CloseEvent) => void;
  _handleError: (event: Event) => void;
  _startReconnectTimer: () => void;
  _stopReconnectTimer: () => void;
  _startAliveStatusTimer: () => void; // 启动客服状态查询定时器
  _stopAliveStatusTimer: () => void; // 停止客服状态查询定时器
}

// 默认配置
const DEFAULT_CONFIG: WebSocketConfig = {
  url: (import.meta as any).env?.VITE_API_WS_URL,
  client: "kefu-client",
  accountId: 0,
  accessToken: "",
  autoReconnect: true,
  cmdType: "", // 添加默认的命令类型
  seq: +new Date(), // 添加默认的序列号
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

const ALIVE_STATUS_MIN_INTERVAL = 5 * 1000; // ms

export const useWebSocketStore = createPersistStore<WebSocketState>(
  (set, get) => ({
    status: WebSocketStatus.DISCONNECTED,
    ws: null,
    config: null,
    messages: [],
    unreadCount: 0,
    reconnectAttempts: 0,
    reconnectTimer: null,
    aliveStatusTimer: null,
    aliveStatusUnsubscribe: null,
    aliveStatusLastRequest: null,

    // 连接WebSocket
    connect: (config: Partial<WebSocketConfig>) => {
      const currentState = get();

      // 检查当前连接状态，避免重复连接
      if (
        currentState.status === WebSocketStatus.CONNECTED ||
        currentState.status === WebSocketStatus.CONNECTING
      ) {
        // console.log("WebSocket已连接或正在连接，跳过重复连接", {
        //   currentStatus: currentState.status,
        //   hasWebSocket: !!currentState.ws,
        // });
        return;
      }

      // 如果已经有WebSocket实例，先断开
      if (currentState.ws) {
        // console.log("断开现有WebSocket连接");
        currentState.disconnect();
      }

      // 合并配置
      const fullConfig: WebSocketConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      };

      // 获取用户信息
      const { token2 } = useUserStore.getState();

      if (!token2) {
        // Toast.show({ content: "未找到有效的访问令牌", position: "top" });
        return;
      }

      // 构建WebSocket URL
      const { getAccountId } = useCkChatStore.getState();
      const params = new URLSearchParams({
        client: fullConfig.client.toString(),
        accountId: getAccountId().toString(),
        accessToken: token2,
        t: Date.now().toString(),
      });

      const wsUrl = fullConfig.url + "?" + params;

      // 检查URL是否为localhost，如果是则不连接
      if (wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1")) {
        // console.error("WebSocket连接被拦截：不允许连接到本地地址", wsUrl);
        // Toast.show({
        //   content: "WebSocket连接被拦截：不允许连接到本地地址",
        //   position: "top",
        // });
        set({ status: WebSocketStatus.ERROR });
        return;
      }

      set({
        status: WebSocketStatus.CONNECTING,
        config: fullConfig,
      });

      try {
        const ws = new WebSocket(wsUrl);

        // 绑定事件处理器
        ws.onopen = () => get()._handleOpen();
        ws.onmessage = event => get()._handleMessage(event);
        ws.onclose = event => get()._handleClose(event);
        ws.onerror = event => get()._handleError(event);

        set({ ws });

        // console.log("WebSocket连接创建成功", wsUrl);
      } catch (error) {
        // console.error("WebSocket连接失败:", error);
        set({ status: WebSocketStatus.ERROR });
        // Toast.show({ content: "WebSocket连接失败", position: "top" });
      }
    },

    // 断开连接
    disconnect: () => {
      const currentState = get();

      if (currentState.ws) {
        currentState.ws.close();
      }

      currentState._stopReconnectTimer();
      currentState._stopAliveStatusTimer();

      set({
        status: WebSocketStatus.DISCONNECTED,
        ws: null,
        reconnectAttempts: 0,
      });

      // console.log("WebSocket连接已断开");
    },

    // 发送消息
    sendMessage: message => {
      const currentState = get();

      if (
        currentState.status !== WebSocketStatus.CONNECTED ||
        !currentState.ws
      ) {
        // Toast.show({ content: "WebSocket未连接", position: "top" });
        return;
      }

      const fullMessage: WebSocketMessage = {
        ...message,
      };

      try {
        currentState.ws.send(JSON.stringify(fullMessage));
        // console.log("消息发送成功:", fullMessage);
      } catch (error) {
        // console.error("消息发送失败:", error);
        // Toast.show({ content: "消息发送失败", position: "top" });
      }
    },

    // 发送命令
    sendCommand: (cmdType: string, data?: any) => {
      const currentState = get();

      if (
        currentState.status !== WebSocketStatus.CONNECTED ||
        !currentState.ws
      ) {
        // 重置连接状态并发起重新连接
        set({ status: WebSocketStatus.DISCONNECTED });
        if (currentState.config) {
          currentState.connect(currentState.config);
        }
        return;
      }

      const command = {
        cmdType,
        ...data,
        seq: +new Date(),
      };

      try {
        currentState.ws.send(JSON.stringify(command));
        // console.log("命令发送成功:", command);
      } catch (error) {
        // console.error("命令发送失败:", error);
        // Toast.show({ content: "命令发送失败", position: "top" });

        // 发送失败时也尝试重新连接
        set({ status: WebSocketStatus.DISCONNECTED });
        if (currentState.config) {
          currentState.connect(currentState.config);
        }
      }
    },

    // 清除消息
    clearMessages: () => {
      set({ messages: [], unreadCount: 0 });
    },

    // 标记为已读
    markAsRead: () => {
      set({ unreadCount: 0 });
    },

    // 重连
    reconnect: () => {
      const currentState = get();

      if (currentState.config) {
        // 检查是否允许重连
        if (!currentState.config.autoReconnect) {
          // console.log("自动重连已禁用，不再尝试重连");
          return;
        }
        currentState.connect(currentState.config);
      }
    },

    // 清空连接状态（用于退出登录时）
    clearConnectionState: () => {
      const currentState = get();

      // 断开现有连接
      if (currentState.ws) {
        currentState.ws.close();
      }

      // 停止所有定时器
      currentState._stopReconnectTimer();
      currentState._stopAliveStatusTimer();

      // 重置所有状态
      set({
        status: WebSocketStatus.DISCONNECTED,
        ws: null,
        config: null,
        messages: [],
        unreadCount: 0,
        reconnectAttempts: 0,
        reconnectTimer: null,
        aliveStatusTimer: null,
      });

      // console.log("WebSocket连接状态已清空");
    },

    // 内部方法：处理连接打开
    _handleOpen: () => {
      const currentState = get();

      set({
        status: WebSocketStatus.CONNECTED,
        reconnectAttempts: 0,
      });

      // console.log("WebSocket连接成功");
      const { token2 } = useUserStore.getState();
      const { getAccountId } = useCkChatStore.getState();
      // 发送登录命令
      if (currentState.config) {
        currentState.sendCommand("CmdSignIn", {
          accessToken: token2,
          accountId: Number(getAccountId()),
          client: currentState.config?.client || "kefu-client",
          seq: +new Date(),
        });
      }

      // Toast.show({ content: "WebSocket连接成功", position: "top" });

      // 启动客服状态查询定时器
      currentState._startAliveStatusTimer();
    },

    // 内部方法：处理消息接收
    _handleMessage: (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        const currentState = get();
        const newMessage: WebSocketMessage = {
          id: Date.now().toString(),
          type: data.type || "message",
          content: data,
          timestamp: Date.now(),
          sender: data.sender,
          receiver: data.receiver,
        };

        set({
          messages: [...currentState.messages, newMessage],
          unreadCount: (currentState.unreadCount ?? 0) + 1,
        });
        //消息处理器
        msgManageCore(data);

        // 可以在这里添加消息处理逻辑
        // 比如播放提示音、显示通知等
      } catch (error) {
        // console.error("解析WebSocket消息失败:", error);
      }
    },

    // 内部方法：处理连接关闭
    _handleClose: () => {
      const currentState = get();

      // console.log("WebSocket连接关闭:", event.code, event.reason);

      set({
        status: WebSocketStatus.DISCONNECTED,
        ws: null,
      });

      // 自动重连逻辑
      if (
        currentState.config?.autoReconnect &&
        currentState.reconnectAttempts <
          (currentState.config?.maxReconnectAttempts || 5)
      ) {
        // console.log("尝试自动重连...");
        currentState._startReconnectTimer();
      } else if (!currentState.config?.autoReconnect) {
        // console.log("自动重连已禁用，不再尝试重连");
        // 重置重连计数
        set({ reconnectAttempts: 0 });
      }
    },

    // 内部方法：处理连接错误
    _handleError: () => {
      // console.error("WebSocket连接错误:", event);

      set({ status: WebSocketStatus.ERROR });

      // Toast.show({ content: "WebSocket连接错误", position: "top" });
    },

    // 内部方法：启动重连定时器
    _startReconnectTimer: () => {
      const currentState = get();

      currentState._stopReconnectTimer();

      set({
        status: WebSocketStatus.RECONNECTING,
        reconnectAttempts: currentState.reconnectAttempts + 1,
      });

      const timer = setTimeout(() => {
        // console.log(
        //   `尝试重连 (${currentState.reconnectAttempts + 1}/${currentState.config?.maxReconnectAttempts})`,
        // );
        currentState.reconnect();
      }, currentState.config?.reconnectInterval || 3000);

      set({ reconnectTimer: timer });
    },

    // 内部方法：停止重连定时器
    _stopReconnectTimer: () => {
      const currentState = get();

      if (currentState.reconnectTimer) {
        clearTimeout(currentState.reconnectTimer);
        set({ reconnectTimer: null });
      }
    },

    // 内部方法：启动客服状态查询定时器
    _startAliveStatusTimer: () => {
      const currentState = get();

      // 先停止现有定时器
      currentState._stopAliveStatusTimer();

      const requestAliveStatus = () => {
        const state = get();
        if (state.status !== WebSocketStatus.CONNECTED) {
          return;
        }

        const now = Date.now();
        if (
          state.aliveStatusLastRequest &&
          now - state.aliveStatusLastRequest < ALIVE_STATUS_MIN_INTERVAL
        ) {
          return;
        }

        const { customerList } = useCustomerStore.getState();
        const { kfUserList } = useCkChatStore.getState();
        const targets =
          customerList && customerList.length > 0
            ? customerList
            : kfUserList && kfUserList.length > 0
              ? kfUserList
              : [];

        if (targets.length > 0) {
          state.sendCommand("CmdRequestWechatAccountsAliveStatus", {
            wechatAccountIds: targets.map(v => v.id),
          });
          set({ aliveStatusLastRequest: now });
        }
      };

      // 尝试立即请求一次，如果客服列表尚未加载，后续定时器会继续检查
      requestAliveStatus();

      const unsubscribeCustomer = useCustomerStore.subscribe(state => {
        if (
          get().status === WebSocketStatus.CONNECTED &&
          state.customerList &&
          state.customerList.length > 0
        ) {
          requestAliveStatus();
        }
      });

      const unsubscribeKf = useCkChatStore.subscribe(state => {
        if (
          get().status === WebSocketStatus.CONNECTED &&
          state.kfUserList &&
          state.kfUserList.length > 0
        ) {
          requestAliveStatus();
        }
      });

      // 启动定时器，每5秒查询一次
      const timer = setInterval(() => {
        const state = get();
        // 检查连接状态
        if (state.status === WebSocketStatus.CONNECTED) {
          requestAliveStatus();
        } else {
          // 如果连接断开，停止定时器
          state._stopAliveStatusTimer();
        }
      }, 5 * 1000);

      set({
        aliveStatusTimer: timer,
        aliveStatusUnsubscribe: () => {
          unsubscribeCustomer();
          unsubscribeKf();
        },
      });
    },

    // 内部方法：停止客服状态查询定时器
    _stopAliveStatusTimer: () => {
      const currentState = get();

      if (currentState.aliveStatusUnsubscribe) {
        currentState.aliveStatusUnsubscribe();
      }

      if (currentState.aliveStatusTimer) {
        clearInterval(currentState.aliveStatusTimer);
      }
      set({
        aliveStatusTimer: null,
        aliveStatusUnsubscribe: null,
        aliveStatusLastRequest: null,
      });
    },
  }),
  {
    name: "websocket-store",
    partialize: state => ({
      // 只持久化必要的状态，不持久化WebSocket实例
      status: state.status,
      config: state.config,
      messages: state.messages.slice(-100), // 只保留最近100条消息
      unreadCount: state.unreadCount,
      reconnectAttempts: state.reconnectAttempts,
      aliveStatusLastRequest: state.aliveStatusLastRequest,
      // 注意：定时器不需要持久化，重新连接时会重新创建
    }),
    onRehydrateStorage: () => state => {
      // 页面刷新后，如果之前是连接状态，尝试重新连接
      if (state && state.status === WebSocketStatus.CONNECTED && state.config) {
        // console.log("页面刷新后恢复WebSocket连接", {
        //   persistedConfig: state.config,
        //   currentDefaultConfig: DEFAULT_CONFIG,
        // });

        // 使用最新的默认配置，而不是持久化的配置
        const freshConfig = {
          ...DEFAULT_CONFIG,
          client: state.config.client,
          accountId: state.config.accountId,
          accessToken: state.config.accessToken,
          autoReconnect: state.config.autoReconnect,
        };

        // console.log("使用刷新后的配置重连:", freshConfig);

        // 延迟一下再重连，确保页面完全加载
        // 同时检查当前状态，避免重复连接
        setTimeout(() => {
          // 重新获取最新的状态，而不是使用闭包中的state
          const currentState = useWebSocketStore.getState();
          // console.log("页面刷新后检查状态", {
          //   status: currentState.status,
          //   hasWs: !!currentState.ws,
          // });

          // 强制重置状态为disconnected，因为页面刷新后WebSocket实例已失效
          if (
            currentState.status === WebSocketStatus.CONNECTED &&
            !currentState.ws
          ) {
            // console.log("检测到状态不一致，重置为disconnected");
            useWebSocketStore.setState({
              status: WebSocketStatus.DISCONNECTED,
            });
          }

          // 重新获取状态进行连接
          const latestState = useWebSocketStore.getState();
          if (
            latestState.status === WebSocketStatus.DISCONNECTED ||
            latestState.status === WebSocketStatus.ERROR
          ) {
            // console.log("页面刷新后开始重连");
            latestState.connect(freshConfig);
          } else {
            // console.log("WebSocket已连接或正在连接，跳过页面刷新重连", {
            //   status: latestState.status,
            // });
          }
        }, 1000);
      }
    },
  },
);
