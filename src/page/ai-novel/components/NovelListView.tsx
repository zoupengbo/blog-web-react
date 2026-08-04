import React from 'react';
import { Space, Button, Card, Spin, Tooltip, Badge } from 'antd';
import { BookOutlined, PlusOutlined, SettingOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Novel } from '../types';

interface NovelListViewProps {
  loading: boolean;
  novels: Novel[];
  onOpenCreate: () => void;
  onOpenConfig: () => void;
  onLoadNovelToEditor: (id: number) => void;
  onDeleteNovel: (id: number, title: string) => void;
}

export const NovelListView: React.FC<NovelListViewProps> = ({
  loading,
  novels,
  onOpenCreate,
  onOpenConfig,
  onLoadNovelToEditor,
  onDeleteNovel,
}) => {
  const safeNovels = Array.isArray(novels) ? novels : [];

  return (
    <div className="novel-list-view">
      <div className="view-header">
        <div className="view-title">
          <BookOutlined className="icon-title" />
          <span>AI 写作工坊创作列表</span>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreate}
            className="create-btn"
          >
            开启全新创作
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={onOpenConfig}
            ghost
            type="primary"
          >
            大模型配置
          </Button>
        </Space>
      </div>

      {(() => {
        if (loading && safeNovels.length === 0) {
          return (
            <div className="spinner-wrap">
              <Spin size="large" tip="正在加载小说库..." />
            </div>
          );
        }
        if (safeNovels.length === 0) {
          return (
            <Card className="empty-card">
              <div className="empty-state">
                <EditOutlined className="empty-icon" />
                <h3>笔墨未启，灵感先行</h3>
                <p>目前创作库中尚无 AI 小说。点击“开启全新创作”，通过强大的 AI 捕捉灵感并开始书写您的第一部鸿篇巨著！</p>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onOpenCreate}>
                  立即开始
                </Button>
              </div>
            </Card>
          );
        }
        return (
          <div className="novel-grid">
            {safeNovels.map(novel => (
              <Card
                key={novel.id}
                className="novel-card"
                hoverable
                actions={[
                  <Tooltip title="进入沉浸式协作编辑器"><EditOutlined key="edit" onClick={() => onLoadNovelToEditor(novel.id)} /></Tooltip>,
                  <Tooltip title="一键删除"><DeleteOutlined key="delete" style={{color: '#ff4d4f'}} onClick={() => onDeleteNovel(novel.id, novel.title)} /></Tooltip>
                ]}
              >
                <div className="novel-card-body" onClick={() => onLoadNovelToEditor(novel.id)}>
                  <div className="novel-cover-placeholder">
                    <BookOutlined />
                  </div>
                  <div className="novel-info">
                    <h3 className="novel-title">{novel.title}</h3>
                    <div className="novel-meta">
                      <Badge status="processing" text={novel.category} />
                      <span className="author">{novel.author}</span>
                    </div>
                    <p className="novel-desc">{novel.description}</p>
                    <div className="novel-stats">
                      <span>已写章数: {novel.crawledChapters}/{novel.totalChapters}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );
      })()}
    </div>
  );
};
