import React, { useState } from 'react';
import {
  Input,
  Button,
  Card,
  List,
  Tag,
  Space,
  Typography,
  Empty,
  Spin,
  AutoComplete,
  message,
} from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  PlusOutlined,
  HistoryOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { SearchResult, Book } from '../../types';
import { useBookSearch } from '../../hooks/useBookSearch';
import { StorageUtil } from '../../utils/storage';
import './index.scss';

const { Search } = Input;
const { Text, Paragraph } = Typography;

interface SearchPanelProps {
  onBookSelect: (book: Book) => void;
  onAddToShelf: (book: Book) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  onBookSelect,
  onAddToShelf,
}) => {
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<string[]>(
    StorageUtil.getSearchHistory()
  );
  
  const { searchResults, loading, searchBook, clearResults } = useBookSearch();

  // 处理搜索
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    
    await searchBook(keyword);
    // 更新搜索历史
    setSearchHistory(StorageUtil.getSearchHistory());
  };

  // 清空搜索历史
  const clearSearchHistory = () => {
    StorageUtil.clearSearchHistory();
    setSearchHistory([]);
    message.success('搜索历史已清空');
  };

  // 转换搜索结果为书籍对象
  const convertToBook = (result: SearchResult): Book => ({
    id: result.url, // 使用URL作为唯一ID
    title: result.title,
    author: result.author,
    description: result.description,
    category: '未分类', // API没有返回分类信息
    status: result.status === '完本' ? 'completed' : 'ongoing',
    totalChapters: 0, // API没有返回总章节数
    lastUpdateTime: result.updateTime || new Date().toISOString(),
    sourceUrl: result.url,
    tags: [],
    addedTime: new Date().toISOString(),
  });

  // 查看书籍详情
  const handleBookSelect = (result: SearchResult) => {
    const book = convertToBook(result);
    onBookSelect(book);
  };

  // 添加到书架
  const handleAddToShelf = (result: SearchResult) => {
    const book = convertToBook(result);
    
    if (StorageUtil.isBookInShelf(book.id)) {
      message.info('该书籍已在书架中');
      return;
    }
    
    StorageUtil.addBookToShelf(book);
    onAddToShelf(book);
    message.success('已添加到书架');
  };

  // 自动完成选项
  const autoCompleteOptions = searchHistory.map(item => ({
    value: item,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HistoryOutlined style={{ color: '#999' }} />
        <span>{item}</span>
      </div>
    ),
  }));

  return (
    <div className="search-panel">
      {/* 搜索区域 */}
      <Card className="search-card">
        <div className="search-header">
          <div className="search-title">
            <BookOutlined className="title-icon" />
            <div>
              <h2>电子书搜索</h2>
              <p>搜索并发现你喜欢的电子书</p>
            </div>
          </div>
        </div>
        
        <div className="search-input-area">
          <AutoComplete
            options={autoCompleteOptions}
            value={searchKeyword}
            onChange={setSearchKeyword}
            onSelect={handleSearch}
            style={{ width: '100%' }}
          >
            <Search
              placeholder="输入书名、作者或关键词搜索"
              enterButton={
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  loading={loading}
                >
                  搜索
                </Button>
              }
              size="large"
              onSearch={handleSearch}
              loading={loading}
            />
          </AutoComplete>
        </div>

        {/* 搜索历史 */}
        {searchHistory.length > 0 && (
          <div className="search-history">
            <div className="history-header">
              <Text type="secondary">搜索历史</Text>
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                onClick={clearSearchHistory}
              >
                清空
              </Button>
            </div>
            <div className="history-tags">
              {searchHistory.slice(0, 10).map((item, index) => (
                <Tag
                  key={index}
                  className="history-tag"
                  onClick={() => handleSearch(item)}
                >
                  {item}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 搜索结果 */}
      <Card className="results-card" title="搜索结果">
        <Spin spinning={loading}>
          {searchResults.length === 0 ? (
            <Empty
              description="暂无搜索结果"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={searchResults}
              renderItem={(result) => (
                <List.Item
                  className="search-result-item"
                  actions={[
                    <Button
                      key="view"
                      type="primary"
                      ghost
                      size="small"
                      onClick={() => handleBookSelect(result)}
                    >
                      查看详情
                    </Button>,
                    <Button
                      key="add"
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddToShelf(result)}
                    >
                      加入书架
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="book-avatar">
                        <BookOutlined />
                      </div>
                    }
                    title={
                      <div className="book-title">
                        <span>{result.title}</span>
                        <Text type="secondary" className="author">
                          {result.author}
                        </Text>
                      </div>
                    }
                    description={
                      <div className="book-info">
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          className="description"
                        >
                          {result.description}
                        </Paragraph>
                        <Space className="book-meta">
                          <Tag color="purple">{result.source}</Tag>
                          <Tag color={result.status === '完本' ? 'green' : 'orange'}>
                            {result.status}
                          </Tag>
                          <Text type="secondary">
                            最新：{result.latestChapter}
                          </Text>
                          <Text type="secondary">
                            更新：{result.updateTime}
                          </Text>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default SearchPanel;
