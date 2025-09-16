import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  List,
  Button,
  Typography,
  Tag,
  Space,
  Spin,
  Progress,
  Input,
  message,
  Divider,
} from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  LeftOutlined,
  SearchOutlined,
  PlusOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Book, Chapter } from '../../types';
import { useBookDetail } from '../../hooks/useBookDetail';
import { StorageUtil } from '../../utils/storage';
import './index.scss';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

interface BookDetailProps {
  book: Book;
  onStartReading: (chapterIndex: number, chapters: Chapter[]) => void;
  onBack: () => void;
  onAddToShelf?: () => void;
}

const BookDetail: React.FC<BookDetailProps> = ({
  book,
  onStartReading,
  onBack,
  onAddToShelf,
}) => {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isInShelf, setIsInShelf] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  
  const { bookDetail, chapters, loading, getBookDetail } = useBookDetail();
  const chaptersListRef = useRef<HTMLDivElement>(null);

  // 检查书籍是否在书架中
  useEffect(() => {
    setIsInShelf(StorageUtil.isBookInShelf(book.id));
  }, [book.id]);

  // 获取书籍详情和章节列表
  useEffect(() => {
    if (book.sourceUrl) {
      getBookDetail(book.sourceUrl);
    }
  }, [book.sourceUrl, getBookDetail]);

  // 筛选章节
  useEffect(() => {
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const filtered = chapters.filter(chapter =>
        chapter.title.toLowerCase().includes(keyword) ||
        chapter.index.toString().includes(keyword)
      );
      setFilteredChapters(filtered);
    } else {
      setFilteredChapters(chapters);
    }
  }, [chapters, searchKeyword]);

  // 获取阅读进度
  const getReadingProgress = () => {
    const progress = StorageUtil.getReadingProgress(book.id);
    return progress?.totalProgress || 0;
  };

  // 获取当前阅读章节
  const getCurrentChapterIndex = () => {
    const progress = StorageUtil.getReadingProgress(book.id);
    if (!progress) return 0;
    
    const currentChapter = chapters.find(ch => ch.id === progress.currentChapterId);
    return currentChapter ? chapters.indexOf(currentChapter) : 0;
  };

  // 滚动到当前章节
  const scrollToCurrentChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    const currentChapter = filteredChapters[currentIndex];
    
    if (currentChapter && chaptersListRef.current) {
      const chapterElement = chaptersListRef.current.querySelector(
        `[data-chapter-id="${currentChapter.id}"]`
      ) as HTMLElement;
      
      if (chapterElement) {
        chapterElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  // 当章节列表加载完成后，滚动到当前章节
  useEffect(() => {
    if (filteredChapters.length > 0) {
      setTimeout(() => {
        scrollToCurrentChapter();
      }, 100);
    }
  }, [filteredChapters.length]);

  // 监听滚动，显示/隐藏回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      if (chaptersListRef.current) {
        const scrollTop = chaptersListRef.current.scrollTop;
        setShowBackToTop(scrollTop > 200);
      }
    };

    const listElement = chaptersListRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [filteredChapters.length]);

  // 回到顶部
  const scrollToTop = () => {
    if (chaptersListRef.current) {
      chaptersListRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // 添加到书架
  const handleAddToShelf = () => {
    if (isInShelf) {
      message.info('该书籍已在书架中');
      return;
    }

    StorageUtil.addBookToShelf(book);
    setIsInShelf(true);
    onAddToShelf?.();
    message.success('已添加到书架');
  };

  // 开始阅读
  const handleStartReading = (chapterIndex?: number) => {
    const targetIndex = chapterIndex ?? getCurrentChapterIndex();
    onStartReading(targetIndex, filteredChapters);
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const color = status === 'completed' ? 'green' : 'blue';
    const text = status === 'completed' ? '已完结' : '连载中';
    return <Tag color={color}>{text}</Tag>;
  };

  const readingProgress = getReadingProgress();
  const hasProgress = readingProgress > 0;

  return (
    <div className="book-detail">
      {/* 返回按钮 */}
      <div className="detail-header">
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={onBack}
          size="large"
        >
          返回
        </Button>
      </div>

      {/* 书籍信息卡片 */}
      <Card className="book-info-card">
        <div className="book-info-content">
          <div className="book-cover">
            <div className="cover-placeholder">
              <BookOutlined />
            </div>
          </div>
          
          <div className="book-details">
            <Title level={2} className="book-title">
              {book.title}
            </Title>
            
            <div className="book-meta">
              <Space wrap>
                <Text strong>作者：</Text>
                <Text>{book.author}</Text>
                {getStatusTag(book.status)}
                <Tag color="purple">{book.category}</Tag>
                {book.totalChapters > 0 && (
                  <Text type="secondary">共 {book.totalChapters} 章</Text>
                )}
              </Space>
            </div>

            {book.description && (
              <div className="book-description">
                <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                  {book.description}
                </Paragraph>
              </div>
            )}

            {hasProgress && (
              <div className="reading-progress-info">
                <Text strong>阅读进度：</Text>
                <Progress
                  percent={Math.round(readingProgress)}
                  size="small"
                  strokeColor="#1890ff"
                />
              </div>
            )}

            <div className="book-actions">
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReadOutlined />}
                  onClick={() => handleStartReading()}
                >
                  {hasProgress ? '继续阅读' : '开始阅读'}
                </Button>
                
                {!isInShelf && (
                  <Button
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={handleAddToShelf}
                  >
                    加入书架
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </div>
      </Card>

      {/* 章节列表 */}
      <Card 
        className="chapters-card"
        title={
          <div className="chapters-header">
            <div className="chapters-title">
              <span>章节目录</span>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                共 {filteredChapters.length} 章
              </Text>
            </div>
            <Search
              placeholder="搜索章节"
              allowClear
              style={{ width: 200 }}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              size="small"
            />
          </div>
        }
      >
        <Spin spinning={loading}>
          {filteredChapters.length === 0 ? (
            <div className="empty-chapters">
              {loading ? '正在加载章节列表...' : '暂无章节信息'}
            </div>
          ) : (
            <div ref={chaptersListRef} className="chapters-list">
              {filteredChapters.map((chapter, index) => {
                const progress = StorageUtil.getReadingProgress(book.id);
                const isCurrentChapter = progress?.currentChapterId === chapter.id;
                const isRead = progress && chapters.indexOf(chapter) <= getCurrentChapterIndex();

                return (
                  <div
                    key={chapter.id}
                    className={`chapter-item ${isCurrentChapter ? 'current' : ''} ${isRead ? 'read' : ''}`}
                    onClick={() => handleStartReading(filteredChapters.indexOf(chapter))}
                    data-chapter-id={chapter.id}
                  >
                    <div className="chapter-content">
                      <div className="chapter-number">
                        第 {chapter.index} 章
                      </div>
                      <div className="chapter-title">
                        {chapter.title}
                      </div>
                      {isCurrentChapter && (
                        <Tag color="blue">正在阅读</Tag>
                      )}
                      {isRead && !isCurrentChapter && (
                        <Tag color="green">已读</Tag>
                      )}
                    </div>
                    <div className="chapter-actions">
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReading(filteredChapters.indexOf(chapter));
                        }}
                      >
                        阅读
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Spin>
        
        {/* 回到顶部按钮 */}
        {showBackToTop && (
          <Button
            className="back-to-top-btn"
            type="primary"
            shape="circle"
            icon={<VerticalAlignTopOutlined />}
            onClick={scrollToTop}
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '20px',
              zIndex: 10,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default BookDetail;
