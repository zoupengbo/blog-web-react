import React, { useState } from 'react';
import { Tabs, Tag, Button, Space } from 'antd';
import {
  ExperimentOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  BookOutlined,
  DashboardOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { LabDashboard } from './components/LabDashboard';
import { CorpusRegistry } from './components/CorpusRegistry';
import { DistillTaskStation } from './components/DistillTaskStation';
import { RuleAuditConsole } from './components/RuleAuditConsole';
import { RuleBundleStation } from './components/RuleBundleStation';
import './styles.scss';

const AiNovelLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          全景大盘
        </span>
      ),
      children: (
        <LabDashboard
          onNavigateTab={setActiveTab}
          onOpenNewTask={() => setIsTaskModalOpen(true)}
        />
      ),
    },
    {
      key: 'corpus',
      label: (
        <span>
          <SafetyCertificateOutlined />
          语料来源库
        </span>
      ),
      children: <CorpusRegistry />,
    },
    {
      key: 'tasks',
      label: (
        <span>
          <ThunderboltOutlined />
          能力蒸馏流水线
        </span>
      ),
      children: (
        <DistillTaskStation
          isCreateModalOpen={isTaskModalOpen}
          onCloseCreateModal={() => setIsTaskModalOpen(false)}
          onNavigateTab={setActiveTab}
        />
      ),
    },
    {
      key: 'rules',
      label: (
        <span>
          <FileDoneOutlined />
          规则审核台
        </span>
      ),
      children: <RuleAuditConsole />,
    },
    {
      key: 'bundles',
      label: (
        <span>
          <BookOutlined />
          规则包编译与发布
        </span>
      ),
      children: <RuleBundleStation />,
    },
  ];

  return (
    <div className="ai-novel-lab-container">
      {/* 顶部产品 Header Banner */}
      <div className="lab-header">
        <div className="header-left">
          <div className="lab-icon">
            <ExperimentOutlined />
          </div>
          <div>
            <h1 className="lab-title">
              小说写作能力实验室
              <Tag color="cyan" style={{ fontSize: 12, fontWeight: 'normal' }}>
                去 AI 味 · 逆向工程
              </Tag>
            </h1>
            <p className="lab-subtitle">
              从合法语料到可验证、可复用的写作规则 · 真实因果动机与自然留白强化
            </p>
          </div>
        </div>
        <div className="header-right">
          <Space direction="horizontal">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: '#0284c7', borderColor: '#0284c7' }}
              onClick={() => {
                setActiveTab('tasks');
                setIsTaskModalOpen(true);
              }}
            >
              发起新蒸馏
            </Button>
          </Space>
        </div>
      </div>

      {/* 一级菜单 / Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={tabItems}
      />
    </div>
  );
};

export default AiNovelLab;
