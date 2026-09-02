import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import httpService from '../common/request';
import { ConfigDrawer } from '../page/ai-novel/modals/ConfigDrawer';
import { useTheme } from './themeContext';

export interface ApiConfig {
  id?: number;
  name?: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isActive?: boolean;
}

interface AiConfigContextType {
  isConfigDrawerOpen: boolean;
  openConfigDrawer: () => void;
  closeConfigDrawer: () => void;
  apiConfig: ApiConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
  configPresets: any[];
  activePresetId: number | null;
  loading: boolean;
  testingConfig: boolean;
  handleSwitchPreset: (presetId: number) => Promise<void>;
  handleDeletePreset: (presetId: number) => Promise<void>;
  handleSaveConfig: (isNewPreset?: boolean, newPresetName?: string) => Promise<void>;
  handleTestConfig: () => Promise<void>;
  fetchApiConfig: () => Promise<void>;
}

const defaultApiConfig: ApiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4096,
  name: '默认配置'
};

const AiConfigContext = createContext<AiConfigContextType>({
  isConfigDrawerOpen: false,
  openConfigDrawer: () => {},
  closeConfigDrawer: () => {},
  apiConfig: defaultApiConfig,
  setApiConfig: () => {},
  configPresets: [],
  activePresetId: null,
  loading: false,
  testingConfig: false,
  handleSwitchPreset: async () => {},
  handleDeletePreset: async () => {},
  handleSaveConfig: async () => {},
  handleTestConfig: async () => {},
  fetchApiConfig: async () => {},
});

export const AiConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(defaultApiConfig);
  const [configPresets, setConfigPresets] = useState<any[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const { isDark } = useTheme();

  const fetchApiConfig = useCallback(async () => {
    try {
      const res: any = await httpService.get('/ai-novel/config');
      if (res && res.code === 200) {
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e) {
      console.warn('获取 AI 模型配置失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchApiConfig();
  }, [fetchApiConfig]);

  const openConfigDrawer = useCallback(() => {
    fetchApiConfig();
    setIsConfigDrawerOpen(true);
  }, [fetchApiConfig]);

  const closeConfigDrawer = useCallback(() => {
    setIsConfigDrawerOpen(false);
  }, []);

  const handleSwitchPreset = async (presetId: number) => {
    try {
      const res: any = await httpService.post('/ai-novel/config/switch-preset', { id: presetId });
      if (res && res.code === 200) {
        message.success(`已切换至【${res.data?.name || '新预设'}】`);
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e: any) {
      message.error(e?.message || '切换预设失败');
    }
  };

  const handleDeletePreset = async (presetId: number) => {
    try {
      const res: any = await httpService.delete(`/ai-novel/config/preset/${presetId}`);
      if (res && res.code === 200) {
        message.success('预设已删除');
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e: any) {
      message.error(e?.message || '删除预设失败');
    }
  };

  const handleSaveConfig = async (isNewPreset = false, newPresetName = '') => {
    setLoading(true);
    try {
      const payload = {
        ...apiConfig,
        isNew: isNewPreset,
        name: isNewPreset ? (newPresetName || `预设 #${Date.now().toString().slice(-4)}`) : apiConfig.name
      };
      const res: any = await httpService.post('/ai-novel/config', payload);
      if (res && res.code === 200) {
        message.success(isNewPreset ? '已成功另存为新预设！' : 'API 配置保存成功！');
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
        setIsConfigDrawerOpen(false);
      }
    } catch (e: any) {
      message.error('配置保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async () => {
    setTestingConfig(true);
    try {
      const res: any = await httpService.post('/ai-novel/config/test', apiConfig);
      const isSuccess = res && res.code === 200 && (res.data?.success !== false);
      const msg = res?.data?.message || res?.msg || '连接测试成功！';
      if (isSuccess) {
        message.success(msg);
      } else {
        message.error(`连通性测试失败: ${msg}`);
      }
    } catch (e: any) {
      message.error(`网络或服务器异常: ${e.message || '连接失败'}`);
    } finally {
      setTestingConfig(false);
    }
  };

  return (
    <AiConfigContext.Provider
      value={{
        isConfigDrawerOpen,
        openConfigDrawer,
        closeConfigDrawer,
        apiConfig,
        setApiConfig,
        configPresets,
        activePresetId,
        loading,
        testingConfig,
        handleSwitchPreset,
        handleDeletePreset,
        handleSaveConfig,
        handleTestConfig,
        fetchApiConfig
      }}
    >
      {children}
      {/* 全局大模型配置抽屉挂载 */}
      <ConfigDrawer
        open={isConfigDrawerOpen}
        onClose={closeConfigDrawer}
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
        configPresets={configPresets}
        activePresetId={activePresetId}
        onSwitchPreset={handleSwitchPreset}
        onDeletePreset={handleDeletePreset}
        onSave={handleSaveConfig}
        onTest={handleTestConfig}
        loading={loading}
        testingConfig={testingConfig}
        paperTheme={isDark ? 'dark' : 'parchment'}
      />
    </AiConfigContext.Provider>
  );
};

export const useAiConfig = () => useContext(AiConfigContext);
