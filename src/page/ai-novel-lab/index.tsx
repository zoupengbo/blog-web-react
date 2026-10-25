import React, { useState } from 'react';
import { Tabs, Tag } from 'antd';
import {
  ExperimentOutlined,
  BookOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { NovelCorpusStation } from './components/NovelCorpusStation';
import { WritingRulesStation } from './components/WritingRulesStation';
import { AIDiagnosisLab } from './components/AIDiagnosisLab';
import './styles.scss';

const AiNovelLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('diagnosis');
  const [selectedGenreForRules, setSelectedGenreForRules] = useState<string>('all');

  const handleGoToRules = (genre?: string) => {
    if (genre) setSelectedGenreForRules(genre);
    setActiveTab('rules_simple');
  };

  const tabItems = [
    {
      key: 'diagnosis',
      label: (
        <span>
          <ExperimentOutlined />
          AI 感诊断与文风实验室
        </span>
      ),
      children: <AIDiagnosisLab />,
    },
    {
      key: 'rules_simple',
      label: (
        <span>
          <FireOutlined />
          写作笔法与规则库
        </span>
      ),
      children: <WritingRulesStation initialGenre={selectedGenreForRules} />,
    },
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
                极简自用版 · 即开即用
              </Tag>
            </h1>
            <p className="lab-subtitle">
              上传参考小说，AI 自主诊断规划并提炼实战笔法，开关一键启用即可直通注入正文写作
            </p>
          </div>
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

