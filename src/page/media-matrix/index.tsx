import React, { useState, useEffect } from 'react';
import { Tabs, Typography, Space, Badge } from 'antd';
import {
  FireOutlined,
  EditOutlined,
  SettingOutlined,
  HistoryOutlined,
  SendOutlined
} from '@ant-design/icons';
import { HotNewsTab } from './components/HotNewsTab';
import { ArticleEditorTab } from './components/ArticleEditorTab';
import { ChannelConfigTab } from './components/ChannelConfigTab';
import { PushHistoryTab } from './components/PushHistoryTab';
import { DraftArticleItem } from './types';
import { MediaMatrixApi } from './services/mediaMatrixApi';

const { Title, Text } = Typography;

const MediaMatrixDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('mm_active_tab') || 'hot-news';
  });
  const [currentArticle, setCurrentArticle] = useState<DraftArticleItem | null>(null);

  // 页面刷新或首次加载时，自动恢复最近编辑的一篇草稿文章，避免现场丢失
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res: any = await MediaMatrixApi.getLatestDraft();
        if (res && res.data && res.data.id) {
          setCurrentArticle(res.data);
        }
      } catch (e) {
        // 静默失败
      }
    };
    fetchLatest();
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    localStorage.setItem('mm_active_tab', key);
  };

  // 当在“热搜追踪”页面点击“AI 深度写稿”成功后，自动切换到文章编辑 Tab
  const handleArticleGenerated = (article: DraftArticleItem) => {
    setCurrentArticle(article);
    handleTabChange('article-editor');
  };

  // 当在编辑器完成推送后，自动切换到推送历史 Tab
  const handleArticlePushed = () => {
    handleTabChange('push-history');
  };

  const items = [
    {
      key: 'hot-news',
      label: (
        <Space>
          <FireOutlined style={{ color: '#ff4d4f' }} />
          <span>全网热点追踪与聚合</span>
        </Space>
      ),
      children: <HotNewsTab onArticleGenerated={handleArticleGenerated} />
    },
    {
      key: 'article-editor',
      label: (
        <Space>
          <EditOutlined style={{ color: '#1890ff' }} />
          <span>AI 深度加工与排版预览</span>
          {currentArticle && <Badge dot status="processing" />}
        </Space>
      ),
      children: (
        <ArticleEditorTab
          article={currentArticle}
          onSaved={article => setCurrentArticle(article)}
          onPushed={handleArticlePushed}
        />
      )
    },
    {
      key: 'channel-config',
      label: (
        <Space>
          <SettingOutlined style={{ color: '#52c41a' }} />
          <span>自媒体渠道凭据配置</span>
        </Space>
      ),
      children: <ChannelConfigTab />
    },
    {
      key: 'push-history',
      label: (
        <Space>
          <HistoryOutlined style={{ color: '#722ed1' }} />
          <span>草稿推送历史与审计</span>
        </Space>
      ),
      children: (
        <PushHistoryTab
          onNavigateToConfig={() => handleTabChange('channel-config')}
          onEditArticle={(article) => {
            setCurrentArticle(article);
            handleTabChange('article-editor');
          }}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '0 8px 32px 8px' }}>
      {/* 头部标题与简介 */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          <SendOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          自媒体矩阵与热点自动推送中心
        </Title>
        <Text type="secondary">
          实时聚合全网热点话题，依托 AI 进行深度观点提炼与公众号/头条爆款排版加工，一键安全推送至平台官方草稿箱。
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        size="large"
        items={items}
        style={{ minHeight: 600 }}
      />
    </div>
  );
};

export default MediaMatrixDashboard;
