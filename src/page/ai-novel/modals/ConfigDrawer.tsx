import React from 'react';
import { Drawer, Form, Input, Progress, Radio, InputNumber, Space, Button } from 'antd';

interface ConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  apiConfig: any;
  setApiConfig: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  onTest: () => void;
  loading: boolean;
  testingConfig: boolean;
}

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({
  open,
  onClose,
  apiConfig,
  setApiConfig,
  onSave,
  onTest,
  loading,
  testingConfig,
}) => {
  return (
    <Drawer
      title="⚙️ 大模型全局设置"
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
      className="config-drawer"
    >
      <Form layout="vertical">
        <Form.Item label="API Base URL">
          <Input
            value={apiConfig.baseUrl}
            onChange={e => setApiConfig({...apiConfig, baseUrl: e.target.value})}
            placeholder="默认: https://api.deepseek.com/v1"
          />
        </Form.Item>
        <Form.Item label="API Key">
          <Input.Password
            value={apiConfig.apiKey}
            onChange={e => setApiConfig({...apiConfig, apiKey: e.target.value})}
            placeholder="请输入您的私有 API 密钥"
          />
        </Form.Item>
        <Form.Item label="Model Name (模型名称)">
          <Input
            value={apiConfig.modelName}
            onChange={e => setApiConfig({...apiConfig, modelName: e.target.value})}
            placeholder="例如: deepseek-chat, gpt-4o-mini"
          />
        </Form.Item>
        <Form.Item label="Temperature (多样性温度)">
          <Progress
            percent={Math.round(apiConfig.temperature * 100)}
            showInfo={false}
            strokeColor="#d4b106"
          />
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 5}}>
            <span>更严谨连贯</span>
            <Radio.Group
              size="small"
              value={apiConfig.temperature}
              onChange={e => setApiConfig({...apiConfig, temperature: e.target.value})}
            >
              <Radio.Button value={0.3}>0.3</Radio.Button>
              <Radio.Button value={0.5}>0.5</Radio.Button>
              <Radio.Button value={0.7}>0.7</Radio.Button>
              <Radio.Button value={0.9}>0.9</Radio.Button>
            </Radio.Group>
            <span>更多脑洞灵感</span>
          </div>
        </Form.Item>
        <Form.Item
          label="Max Output Tokens (最大输出 Token 长度)"
          extra="推荐设置为 4096 或 8192。若此值设定过低（如 2000），在生成长章节（2300-2700字）时会导致尾部正文被大模型接口强制截断，导致末尾句子不完整。"
        >
          <InputNumber
            value={apiConfig.maxTokens}
            onChange={val => setApiConfig({...apiConfig, maxTokens: val || 8192})}
            min={500}
            max={16384}
            style={{ width: '100%' }}
            placeholder="默认: 8192"
          />
        </Form.Item>
        <Space style={{width: '100%', display: 'flex', justifyContent: 'space-between', marginTop: 25}}>
          <Button onClick={onTest} loading={testingConfig} ghost type="primary">
            测试 API 连接
          </Button>
          <Button type="primary" onClick={onSave} loading={loading}>
            保存全局配置
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
};
