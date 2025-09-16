import { useState, useCallback, useEffect } from 'react';
import { ReaderSettings } from '../types';
import { DEFAULT_READER_SETTINGS } from '../constants';
import { StorageUtil } from '../utils/storage';

export interface UseReaderSettingsReturn {
  settings: ReaderSettings;
  updateSettings: (newSettings: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

export const useReaderSettings = (): UseReaderSettingsReturn => {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);

  // 初始化设置
  useEffect(() => {
    const savedSettings = StorageUtil.getReaderSettings();
    if (savedSettings) {
      setSettings({ ...DEFAULT_READER_SETTINGS, ...savedSettings });
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      StorageUtil.saveReaderSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_READER_SETTINGS);
    StorageUtil.saveReaderSettings(DEFAULT_READER_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};
