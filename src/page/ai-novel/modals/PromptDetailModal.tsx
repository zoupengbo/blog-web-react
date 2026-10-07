import React, { useState } from 'react';
import { Modal, Tabs, Space, Button, Tag, Typography, message } from 'antd';
import { CopyOutlined, CheckOutlined, CodeOutlined, UserOutlined, RobotOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { PromptLogItem, PaperTheme } from '../types';

const { Text } = Typography;

interface PromptDetailModalProps {
  open: boolean;
  onCancel: () => void;
  log: PromptLogItem | null;
  paperTheme?: PaperTheme;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({
  open,
  onCancel,
  log,
  paperTheme = 'dark',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string | undefined, key: string) => {
    if (!text) {
      message.warning('内容为空，无需复制');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    message.success('已复制到剪贴板！');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  if (!log) return null;

  const renderContentTab = (content: string | undefined, key: string, emptyDesc: string) => {
    const text = content || '';
    const charCount = text.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <Space>
            <Tag color="blue">{charCount.toLocaleString()} 字符</Tag>
            {key === 'output' && log.durationMs ? (
              <Tag color="green">耗时 {(log.durationMs / 1000).toFixed(2)}s</Tag>
            ) : null}
          </Space>
          <Button
            size="small"
            icon={copiedKey === key ? <CheckOutlined /> : <CopyOutlined />}
            onClick={() => handleCopy(text, key)}
          >
            {copiedKey === key ? '已复制' : '复制内容'}
          </Button>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: paperTheme === 'dark' ? '#141414' : '#fafafa',
            border: '1px solid #303030',
            borderRadius: 6,
            padding: 12,
            overflowY: 'auto',
            maxHeight: 'calc(75vh - 120px)',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: paperTheme === 'dark' ? '#d4d4d4' : '#1f1f1f',
          }}
        >
          {text ? text : <Text type="secondary" italic>{emptyDesc}</Text>}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space align="center" wrap>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#ffd666' }}>
              🔍 Prompt 与 AI 调用详情
            </span>
            <Tag color="gold">{log.stepName}</Tag>
            {log.status === 'error' ? (
              <Tag color="error">调用失败</Tag>
            ) : (
              <Tag color="success">调用成功</Tag>
            )}
            {log.chapterNumber ? <Tag color="cyan">第 {log.chapterNumber} 章</Tag> : null}
            {log.model && <Tag color="purple">{log.model}</Tag>}
          </Space>
          <Space size="small" style={{ fontSize: 12, color: '#8c8c8c' }}>
            <ClockCircleOutlined />
            <span>{log.createdAt || ''}</span>
          </Space>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" type="primary" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      width={1000}
      centered
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
      styles={{ body: { paddingTop: 12, minHeight: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' } }}
    >
      <Tabs
        defaultActiveKey="system"
        type="card"
        items={[
          {
            key: 'system',
            label: (
              <Space>
                <CodeOutlined />
                <span>📌 System Prompt</span>
              </Space>
            ),
            children: renderContentTab(log.systemPrompt, 'system', '暂无 System Prompt (可能未配置或使用默认预设)'),
          },
          {
            key: 'user',
            label: (
              <Space>
                <UserOutlined />
                <span>💬 User Prompt</span>
              </Space>
            ),
            children: renderContentTab(log.userPrompt, 'user', '暂无 User Prompt'),
          },
          {
            key: 'output',
            label: (
              <Space>
                <RobotOutlined />
                <span>{log.status === 'error' ? '❌ 异常报错详情' : '✨ AI 原始回复/产出'}</span>
              </Space>
            ),
            children: renderContentTab(log.output, 'output', '暂无 AI 回复/产出记录'),
          },
        ]}
      />
    </Modal>
  );
};
