import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Empty,
  Tag,
  Space,
  Select,
  Input,
  Popconfirm,
  message,
} from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  DeleteOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { Book, SortType } from '../../types';
import { StorageUtil } from '../../utils/storage';
import './index.scss';

const { Search } = Input;
const { Option } = Select;

interface BookShelfProps {
  books: Book[];
  onBookOpen: (book: Book) => void;
  onBookRemove: (bookId: string) => void;
  onBooksUpdate: (books: Book[]) => void;
}

const BookShelf: React.FC<BookShelfProps> = ({
  books,
  onBookOpen,
  onBookRemove,
  onBooksUpdate,
}) => {
  const [filteredBooks, setFilteredBooks] = useState<Book[]>(books);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortType, setSortType] = useState<SortType>('addTime');

  // 更新筛选后的书籍列表
  useEffect(() => {
    let result = [...books];

    // 搜索过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(book =>
        book.title.toLowerCase().includes(keyword) ||
        book.author.toLowerCase().includes(keyword) ||
        book.category.toLowerCase().includes(keyword)
      );
    }

    // 排序
    result.sort((a, b) => {
      switch (sortType) {
        case 'addTime':
          return new Date(b.addedTime).getTime() - new Date(a.addedTime).getTime();
        case 'lastRead':
          const progressA = StorageUtil.getReadingProgress(a.id);
          const progressB = StorageUtil.getReadingProgress(b.id);
          const timeA = progressA?.lastReadTime || a.addedTime;
          const timeB = progressB?.lastReadTime || b.addedTime;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'progress':
          // 进度条功能已移除，按添加时间排序
          return new Date(b.addedTime).getTime() - new Date(a.addedTime).getTime();
        default:
          return 0;
      }
    });

    setFilteredBooks(result);
  }, [books, searchKeyword, sortType]);

  // 删除书籍
  const handleRemoveBook = (bookId: string) => {
    StorageUtil.removeBookFromShelf(bookId);
    onBookRemove(bookId);
    message.success('已从书架移除');
  };


  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    return status === 'completed' ? 'green' : 'blue';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    return status === 'completed' ? '已完结' : '连载中';
  };

  return (
    <div className="book-shelf">
      {/* 工具栏 */}
      <Card className="shelf-toolbar">
        <div className="toolbar-content">
          <div className="toolbar-left">
            <BookOutlined className="shelf-icon" />
            <div className="shelf-info">
              <h2>我的书架</h2>
              <p>共 {books.length} 本书籍</p>
            </div>
          </div>
          
          <div className="toolbar-right">
            <Space size="middle">
              <Search
                placeholder="搜索书名、作者或分类"
                allowClear
                style={{ width: 240 }}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                prefix={<SearchOutlined />}
              />
              
              <Select
                value={sortType}
                onChange={setSortType}
                style={{ width: 120 }}
                suffixIcon={<SortAscendingOutlined />}
              >
                <Option value="addTime">添加时间</Option>
                <Option value="lastRead">最近阅读</Option>
                <Option value="title">书名</Option>
                <Option value="author">作者</Option>
                <Option value="progress">阅读进度</Option>
              </Select>
            </Space>
          </div>
        </div>
      </Card>

      {/* 书籍列表 */}
      <Card className="books-container">
        {filteredBooks.length === 0 ? (
          <Empty
            description={
              searchKeyword ? '未找到匹配的书籍' : '书架还是空的，快去搜索添加书籍吧'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 3,
              lg: 4,
              xl: 5,
              xxl: 6,
            }}
            dataSource={filteredBooks}
            renderItem={(book) => {
              return (
                <List.Item>
                  <Card
                    className="book-card"
                    hoverable
                    onClick={() => {
                      onBookOpen(book);
                    }}
                    cover={
                      <div className="book-cover">
                        <div className="cover-placeholder">
                          <BookOutlined />
                        </div>
                      </div>
                    }
                    actions={[
                      <Button
                        key="read"
                        type="primary"
                        size="small"
                        icon={<ReadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止事件冒泡
                          onBookOpen(book);
                        }}
                      >
                        开始阅读
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="确定要从书架移除这本书吗？"
                        onConfirm={() => handleRemoveBook(book.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                        >
                          移除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Card.Meta
                      title={
                        <div className="book-title" title={book.title}>
                          {book.title}
                        </div>
                      }
                      description={
                        <div className="book-info">
                          <div className="book-author" title={book.author}>
                            {book.author}
                          </div>
                          <div className="book-meta">
                            <Tag color={getStatusColor(book.status)}>
                              {getStatusText(book.status)}
                            </Tag>
                            <Tag color="purple">{book.category}</Tag>
                          </div>
                          {book.totalChapters > 0 && (
                            <div className="chapter-count">
                              共 {book.totalChapters} 章
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default BookShelf;
