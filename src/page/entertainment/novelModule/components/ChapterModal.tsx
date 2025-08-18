import React, { useState, useEffect } from 'react';
import { Modal, List, Button, message, Spin, Typography, Divider } from 'antd';
import { EyeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import httpService from '../../../../common/request';
import './ChapterModal.scss';

const { Title, Paragraph } = Typography;

interface Chapter {
  id: number;
  novelId: number;
  title: string;
  chapterNumber: number;
  content: string;
  wordCount: number;
  sourceUrl: string;
  crawlStatus: string;
  publishTime: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChapterModalProps {
  open: boolean;
  novelId: number | null;
  novelTitle: string;
  onClose: () => void;
}

const ChapterModal: React.FC<ChapterModalProps> = ({
  open,
  novelId,
  novelTitle,
  onClose,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [contentLoading, setContentLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 获取章节列表
  const getChapterList = async (page: number = 1, pageSize: number = 50) => {
    if (!novelId) return;
    
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const res = await httpService(`/novel/${novelId}/chapters`, {
        params: { offset, limit: pageSize }
      });
      
      if (res.code === 200) {
        setChapters(res.data);
        setTotal(res.count);
      } else {
        message.error(res.msg || '获取章节列表失败');
      }
    } catch (error) {
      console.error('获取章节列表失败:', error);
      message.error('获取章节列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取章节内容
  const getChapterContent = async (chapterId: number) => {
    if (!novelId) return;
    
    setContentLoading(true);
    try {
      const res = await httpService(`/novel/${novelId}/chapter/${chapterId}`);
      
      if (res.code === 200) {
        setSelectedChapter(res.data);
      } else {
        message.error(res.msg || '获取章节内容失败');
      }
    } catch (error) {
      console.error('获取章节内容失败:', error);
      message.error('获取章节内容失败');
    } finally {
      setContentLoading(false);
    }
  };

  // 选择章节
  const handleChapterSelect = (chapter: Chapter) => {
    if (chapter.crawlStatus === 'completed') {
      getChapterContent(chapter.id);
    } else {
      message.warning('该章节尚未爬取完成');
    }
  };

  // 上一章
  const handlePrevChapter = () => {
    if (!selectedChapter) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter.id);
    if (currentIndex > 0) {
      const prevChapter = chapters[currentIndex - 1];
      handleChapterSelect(prevChapter);
    } else {
      message.info('已经是第一章了');
    }
  };

  // 下一章
  const handleNextChapter = () => {
    if (!selectedChapter) return;
    
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter.id);
    if (currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      handleChapterSelect(nextChapter);
    } else {
      message.info('已经是最后一章了');
    }
  };

  // 返回章节列表
  const handleBackToList = () => {
    setSelectedChapter(null);
  };

  // 分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    getChapterList(page);
  };

  useEffect(() => {
    if (open && novelId) {
      getChapterList();
      setSelectedChapter(null);
      setCurrentPage(1);
    }
  }, [open, novelId]);

  return (
    <Modal
      title={
        <div className="chapter-modal-title">
          <EyeOutlined className="title-icon" />
          <span>{novelTitle} - {selectedChapter ? '章节阅读' : '章节列表'}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={selectedChapter ? 900 : 700}
      className="chapter-modal"
    >
      {selectedChapter ? (
        // 章节内容视图
        <div className="chapter-content">
          <div className="chapter-header">
            <Button 
              icon={<LeftOutlined />} 
              onClick={handleBackToList}
              style={{ marginRight: 16 }}
            >
              返回列表
            </Button>
            <Title level={3} style={{ margin: 0, flex: 1 }}>
              {selectedChapter.title}
            </Title>
            <div className="chapter-nav">
              <Button 
                icon={<LeftOutlined />} 
                onClick={handlePrevChapter}
                disabled={chapters.findIndex(ch => ch.id === selectedChapter.id) === 0}
              >
                上一章
              </Button>
              <Button 
                icon={<RightOutlined />} 
                onClick={handleNextChapter}
                disabled={chapters.findIndex(ch => ch.id === selectedChapter.id) === chapters.length - 1}
                style={{ marginLeft: 8 }}
              >
                下一章
              </Button>
            </div>
          </div>
          
          <Divider />
          
          <div className="chapter-info">
            <span>字数：{selectedChapter.wordCount?.toLocaleString() || '未知'}</span>
            <span>阅读量：{selectedChapter.viewCount?.toLocaleString() || 0}</span>
            <span>发布时间：{new Date(selectedChapter.publishTime).toLocaleString()}</span>
          </div>
          
          <Divider />
          
          <Spin spinning={contentLoading}>
            <div className="chapter-text">
              <Paragraph>
                {selectedChapter.content || '暂无内容'}
              </Paragraph>
            </div>
          </Spin>
          
          <div className="chapter-footer">
            <Button 
              icon={<LeftOutlined />} 
              onClick={handlePrevChapter}
              disabled={chapters.findIndex(ch => ch.id === selectedChapter.id) === 0}
            >
              上一章
            </Button>
            <Button 
              onClick={handleBackToList}
              style={{ margin: '0 16px' }}
            >
              返回列表
            </Button>
            <Button 
              icon={<RightOutlined />} 
              onClick={handleNextChapter}
              disabled={chapters.findIndex(ch => ch.id === selectedChapter.id) === chapters.length - 1}
            >
              下一章
            </Button>
          </div>
        </div>
      ) : (
        // 章节列表视图
        <div className="chapter-list">
          <Spin spinning={loading}>
            <List
              dataSource={chapters}
              pagination={{
                current: currentPage,
                total: total,
                pageSize: 50,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                onChange: handlePageChange,
              }}
              renderItem={(chapter) => (
                <List.Item
                  className={`chapter-item ${chapter.crawlStatus !== 'completed' ? 'disabled' : ''}`}
                  onClick={() => handleChapterSelect(chapter)}
                >
                  <div className="chapter-item-content">
                    <div className="chapter-title">
                      <span className="chapter-number">第{chapter.chapterNumber}章</span>
                      <span className="chapter-name">{chapter.title}</span>
                    </div>
                    <div className="chapter-meta">
                      <span className="word-count">
                        {chapter.wordCount ? `${chapter.wordCount}字` : '未知'}
                      </span>
                      <span className="view-count">
                        阅读 {chapter.viewCount || 0}
                      </span>
                      <span className={`crawl-status ${chapter.crawlStatus}`}>
                        {chapter.crawlStatus === 'completed' ? '已完成' : 
                         chapter.crawlStatus === 'crawling' ? '爬取中' : 
                         chapter.crawlStatus === 'failed' ? '失败' : '待爬取'}
                      </span>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Spin>
        </div>
      )}
    </Modal>
  );
};

export default ChapterModal;
