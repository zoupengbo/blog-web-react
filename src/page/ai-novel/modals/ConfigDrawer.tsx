import React, { useState } from 'react';
import {
  Drawer, Form, Input, Progress, Radio, InputNumber, Space, Button,
  Select, Card, Tag, Modal, Popconfirm, Tooltip, Divider
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CheckCircleFilled, ThunderboltOutlined,
  ApiOutlined, SettingOutlined, SwapOutlined
} from '@ant-design/icons';

// 常用服务商快速填入模板
const PROVIDER_TEMPLATES = [
  {
    name: 'DeepSeek (官方)',
    baseUrl: 'https://api.deepseek.com/v1',
    modelName: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '极高性价比 / 叙事出色',
    color: 'blue'
  },
  {
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    modelName: 'deepseek-ai/DeepSeek-V3',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '高速稳定 / 丰富开源模型',
    color: 'purple'
  },
  {
    name: 'OpenAI (官方)',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '通用逻辑强',
    color: 'green'
  },
  {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelName: 'moonshot-v1-8k',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '长上下文 / 逻辑连贯',
    color: 'orange'
  },
  {
    name: '智谱 AI (GLM-4)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelName: 'glm-4-flash',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '免费极速',
    color: 'cyan'
  },
  {
    name: '本地服务 (Ollama/8045)',
    baseUrl: 'http://127.0.0.1:8045/v1',
    modelName: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 8192,
    tag: '本地私有化',
    color: 'default'
  }
];

interface ConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  apiConfig: any;
  setApiConfig: React.Dispatch<React.SetStateAction<any>>;
  configPresets?: any[];
  activePresetId?: number | null;
  onSwitchPreset?: (id: number) => void;
  onDeletePreset?: (id: number) => void;
  onSave: (isNew?: boolean, newName?: string) => void;
  onTest: () => void;
  loading: boolean;
  testingConfig: boolean;
}

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({
  open,
  onClose,
  apiConfig,
  setApiConfig,
  configPresets = [],
  activePresetId,
  onSwitchPreset,
  onDeletePreset,
  onSave,
  onTest,
  loading,
  testingConfig,
}) => {
  const [isNewPresetModalOpen, setIsNewPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 快捷填入模板
  const handleApplyTemplate = (tpl: typeof PROVIDER_TEMPLATES[0]) => {
    setApiConfig({
      ...apiConfig,
      name: tpl.name,
      baseUrl: tpl.baseUrl,
      modelName: tpl.modelName,
      temperature: tpl.temperature,
      maxTokens: tpl.maxTokens
    });
  };

  const handleConfirmSaveNew = () => {
    if (!newPresetName.trim()) return;
    onSave(true, newPresetName.trim());
    setIsNewPresetModalOpen(false);
    setNewPresetName('');
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SettingOutlined style={{ color: '#d4b106' }} />
          <span>大模型配置管理（支持多 Key / 多预设一键切换）</span>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={460}
      className="config-drawer"
    >
      {/* 1. 顶部预设选择与快速切换 */}
      <Card
        size="small"
        style={{
          background: '#fcfcfc',
          borderColor: '#e8e8e8',
          borderRadius: 8,
          marginBottom: 16
        }}
        bodyStyle={{ padding: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ApiOutlined style={{ color: '#1890ff' }} />
            <span>已保存的模型预设：</span>
          </span>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#d4b106', borderColor: '#d4b106', fontSize: 11 }}
            onClick={() => {
              setNewPresetName('');
              setIsNewPresetModalOpen(true);
            }}
          >
            另存为新预设
          </Button>
        </div>

        {configPresets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {configPresets.map(preset => {
              const isActive = (activePresetId ? preset.id === activePresetId : preset.isActive) || (apiConfig?.id === preset.id);
              return (
                <div
                  key={preset.id}
                  onClick={() => onSwitchPreset && onSwitchPreset(preset.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isActive ? '#e6f7ff' : '#fff',
                    border: isActive ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isActive ? (
                      <CheckCircleFilled style={{ color: '#1890ff', fontSize: 14 }} />
                    ) : (
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #d9d9d9', display: 'inline-block' }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#096dd9' : '#333' }}>
                      {preset.name || `预设 #${preset.id}`}
                    </span>
                    <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                      {preset.modelName || '默认模型'}
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isActive && (
                      <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>当前生效</Tag>
                    )}
                    {configPresets.length > 1 && (
                      <Popconfirm
                        title="确定删除此模型预设吗？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          onDeletePreset && onDeletePreset(preset.id);
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 22, height: 22, padding: 0 }}
                        />
                      </Popconfirm>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '10px 0' }}>
            暂无多预设配置，保存后将自动沉淀。
          </div>
        )}
      </Card>

      {/* 2. 常用服务商快捷模板 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>常用大模型服务商一键填入：</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PROVIDER_TEMPLATES.map(tpl => (
            <Tooltip key={tpl.name} title={`${tpl.tag} (${tpl.baseUrl})`}>
              <Tag
                color={tpl.color}
                onClick={() => handleApplyTemplate(tpl)}
                style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4, margin: 0 }}
              >
                + {tpl.name}
              </Tag>
            </Tooltip>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '12px 0 16px' }} />

      {/* 3. 具体配置项编辑 */}
      <Form layout="vertical">
        <Form.Item label="预设备注名称">
          <Input
            value={apiConfig.name}
            onChange={e => setApiConfig({ ...apiConfig, name: e.target.value })}
            placeholder="例如: DeepSeek 主力模型, 硅基流动 V3"
          />
        </Form.Item>

        <Form.Item label="API Base URL (接口基地址)">
          <Input
            value={apiConfig.baseUrl}
            onChange={e => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
            placeholder="例如: https://api.deepseek.com/v1"
          />
        </Form.Item>

        <Form.Item label="API Key (密钥)">
          <Input.Password
            value={apiConfig.apiKey}
            onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
            placeholder="请输入您的私有 API 密钥"
          />
        </Form.Item>

        <Form.Item label="Model Name (模型名称)">
          <Input
            value={apiConfig.modelName}
            onChange={e => setApiConfig({ ...apiConfig, modelName: e.target.value })}
            placeholder="例如: deepseek-chat, gpt-4o-mini"
          />
        </Form.Item>

        <Form.Item label="Temperature (多样性温度)">
          <Progress
            percent={Math.round((apiConfig.temperature || 0.7) * 100)}
            showInfo={false}
            strokeColor="#d4b106"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 11, color: '#888' }}>更严谨连贯</span>
            <Radio.Group
              size="small"
              value={apiConfig.temperature}
              onChange={e => setApiConfig({ ...apiConfig, temperature: e.target.value })}
            >
              <Radio.Button value={0.3}>0.3</Radio.Button>
              <Radio.Button value={0.5}>0.5</Radio.Button>
              <Radio.Button value={0.7}>0.7</Radio.Button>
              <Radio.Button value={0.9}>0.9</Radio.Button>
            </Radio.Group>
            <span style={{ fontSize: 11, color: '#888' }}>更多脑洞灵感</span>
          </div>
        </Form.Item>

        <Form.Item
          label="Max Output Tokens (最大输出 Token 长度)"
          extra="推荐设置为 4096 或 8192，防止长篇章节生成时尾部正文被截断。"
        >
          <InputNumber
            value={apiConfig.maxTokens}
            onChange={val => setApiConfig({ ...apiConfig, maxTokens: val || 8192 })}
            min={500}
            max={16384}
            style={{ width: '100%' }}
            placeholder="默认: 8192"
          />
        </Form.Item>

        <Space style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <Button onClick={onTest} loading={testingConfig} ghost type="primary">
            测试当前 API 连通性
          </Button>
          <Button type="primary" onClick={() => onSave(false)} loading={loading}>
            保存当前配置
          </Button>
        </Space>
      </Form>

      {/* 另存为新预设 Modal */}
      <Modal
        title="另存为新模型预设"
        open={isNewPresetModalOpen}
        onOk={handleConfirmSaveNew}
        onCancel={() => setIsNewPresetModalOpen(false)}
        okText="确认保存"
        cancelText="取消"
      >
        <div style={{ margin: '15px 0' }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#333' }}>请输入新预设的名称：</div>
          <Input
            placeholder="例如: DeepSeek V3、SiliconFlow、OpenAI 等"
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            onPressEnter={handleConfirmSaveNew}
            autoFocus
          />
        </div>
      </Modal>
    </Drawer>
  );
};
