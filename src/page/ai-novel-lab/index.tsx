import React, { useState } from 'react';
import { Tabs, Tag, Button, Space, Switch, Tooltip, Typography } from 'antd';

import {
  ExperimentOutlined,
  BookOutlined,
  FireOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  DashboardOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { NovelCorpusStation } from './components/NovelCorpusStation';
import { WritingRulesStation } from './components/WritingRulesStation';
import { LabDashboard } from './components/LabDashboard';
import { CorpusRegistry } from './components/CorpusRegistry';
import { DistillTaskStation } from './components/DistillTaskStation';
import { RuleAuditConsole } from './components/RuleAuditConsole';
import { RuleBundleStation } from './components/RuleBundleStation';
import './styles.scss';

const { Text } = Typography;

const AiNovelLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('novels');
  const [selectedGenreForRules, setSelectedGenreForRules] = useState<string>('all');
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  const handleGoToRules = (genre?: string) => {
    if (genre) setSelectedGenreForRules(genre);
    setActiveTab('rules_simple');
  };

  // 极简两栏模式（Plan A 默认核心）
  const simpleTabItems = [
    {
      key: 'novels',
      label: (
        <span>
          <BookOutlined />
          语料小说
        </span>
      ),
      children: <NovelCorpusStation onGoToRules={handleGoToRules} />,
    },
    {
      key: 'rules_simple',
      label: (
        <span>
          <FireOutlined />
          写作笔法库
        </span>
      ),
      children: <WritingRulesStation initialGenre={selectedGenreForRules} />,
    },
  ];

  // 高级工坊全量模式（包含原始全景大盘、任务流与版本包）
  const advancedTabItems = [
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
      key: 'novels',
      label: (
        <span>
          <BookOutlined />
          语料小说 (极简)
        </span>
      ),
      children: <NovelCorpusStation onGoToRules={handleGoToRules} />,
    },
    {
      key: 'rules_simple',
      label: (
        <span>
          <FireOutlined />
          写作笔法库 (即开即用)
        </span>
      ),
      children: <WritingRulesStation initialGenre={selectedGenreForRules} />,
    },
    {
      key: 'corpus',
      label: (
        <span>
          <SafetyCertificateOutlined />
          法务来源库
        </span>
      ),
      children: <CorpusRegistry />,
    },
    {
      key: 'tasks',
      label: (
        <span>
          <ThunderboltOutlined />
          异步任务流
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
          工业审核台
        </span>
      ),
      children: <RuleAuditConsole />,
    },
    {
      key: 'bundles',
      label: (
        <span>
          <SettingOutlined />
          规则包编译发布
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
              <Tag color="cyan" style={{ fontSize: 12, fontWeight: 'normal', marginLeft: 8 }}>
                极简自用版 · 拖书即提炼
              </Tag>
            </h1>
            <p className="lab-subtitle">
              上传同类小说或一键标杆，AI 自动提炼对话潜台词与深层因果，勾选开关即可注入正文写作
            </p>
          </div>
        </div>
        <div className="header-right">
          <Space size="middle" align="center">
            <Tooltip title="切换是否展示底层的法务登记、异步流水线与规则包编译器">
              <Space size="small">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  高级工坊模式
                </Text>
                <Switch
                  checked={isAdvancedMode}
                  onChange={(checked) => {
                    setIsAdvancedMode(checked);
                    if (!checked && (activeTab !== 'novels' && activeTab !== 'rules_simple')) {
                      setActiveTab('novels');
                    }
                  }}
                  size="small"
                />
              </Space>
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 一级菜单 / Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={isAdvancedMode ? advancedTabItems : simpleTabItems}
      />
    </div>
  );
};

export default AiNovelLab;
