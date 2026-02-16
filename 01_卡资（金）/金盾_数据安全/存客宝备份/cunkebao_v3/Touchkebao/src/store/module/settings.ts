import { createPersistStore } from "@/store/createPersistStore";

export interface AppSettings {
  paddingTop: number;
  appId: string;
  appName: string;
  appVersion: string;
  isAppMode: boolean;
}

interface SettingsState {
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

// 默认设置
const defaultSettings: AppSettings = {
  paddingTop: 0,
  appId: "",
  appName: "",
  appVersion: "",
  isAppMode: false,
};

export const useSettingsStore = createPersistStore<SettingsState>(
  set => ({
    settings: defaultSettings,

    setSettings: newSettings =>
      set(state => ({
        settings: { ...state.settings, ...newSettings },
      })),

    resetSettings: () => set({ settings: defaultSettings }),

    updateSetting: (key, value) =>
      set(state => ({
        settings: { ...state.settings, [key]: value },
      })),
  }),
  {
    name: "settings-store",
    partialize: state => ({
      settings: state.settings,
    }),
    onRehydrateStorage: () => state => {
      // console.log("Settings store hydrated:", state);
    },
  },
);

// 设置工具函数
export const getSetting = <K extends keyof AppSettings>(
  key: K,
): AppSettings[K] => {
  const { settings } = useSettingsStore.getState();
  return settings[key];
};

export const setSetting = <K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
) => {
  const { updateSetting } = useSettingsStore.getState();
  updateSetting(key, value);
};
