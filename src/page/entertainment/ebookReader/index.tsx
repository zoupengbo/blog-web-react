import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import SearchPanel from './components/SearchPanel';
import BookShelf from './components/BookShelf';
import BookDetail from './components/BookDetail';
import Reader from './components/Reader';
import { Book, ViewType, Chapter } from './types';
import { StorageUtil } from './utils/storage';
import './index.scss';

const EbookReader: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('shelf');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookshelf, setBookshelf] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);

  // 初始化书架数据
  useEffect(() => {
    const books = StorageUtil.getBookshelf();
    setBookshelf(books);
    
    // 如果书架为空，显示搜索页面
    if (books.length === 0) {
      setCurrentView('search');
    }
  }, []);

  // 处理视图切换
  const handleViewChange = (view: ViewType, book?: Book) => {
    setCurrentView(view);
    if (book) {
      setSelectedBook(book);
    }
  };

  // 处理书籍选择（从搜索结果）
  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('detail');
  };

  // 处理书籍打开（从书架）
  const handleBookOpen = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('detail');
  };

  // 处理添加到书架
  const handleAddToShelf = (book: Book) => {
    const updatedBooks = StorageUtil.getBookshelf();
    setBookshelf(updatedBooks);
  };

  // 处理从书架移除
  const handleBookRemove = (bookId: string) => {
    const updatedBooks = bookshelf.filter(book => book.id !== bookId);
    setBookshelf(updatedBooks);
    
    // 如果当前查看的书籍被移除，返回书架
    if (selectedBook?.id === bookId) {
      setSelectedBook(null);
      setCurrentView('shelf');
    }
  };

  // 处理开始阅读
  const handleStartReading = (chapterIndex: number, bookChapters: Chapter[]) => {
    if (!selectedBook) return;

    // 直接使用从BookDetail组件传递的真实章节数据
    setChapters(bookChapters);
    setCurrentChapterIndex(chapterIndex);
    setCurrentView('reader');
  };

  // 处理章节切换
  const handleChapterChange = (index: number) => {
    setCurrentChapterIndex(index);
  };

  // 处理返回操作
  const handleBack = () => {
    switch (currentView) {
      case 'detail':
        setCurrentView('shelf');
        setSelectedBook(null);
        break;
      case 'reader':
        setCurrentView('detail');
        break;
      default:
        setCurrentView('shelf');
        break;
    }
  };

  // 处理导航菜单点击
  const handleNavClick = (view: ViewType) => {
    if (view === 'search') {
      setCurrentView('search');
    } else if (view === 'shelf') {
      setCurrentView('shelf');
      setSelectedBook(null);
    }
  };

  // 渲染当前视图
  const renderCurrentView = () => {
    switch (currentView) {
      case 'search':
        return (
          <SearchPanel
            onBookSelect={handleBookSelect}
            onAddToShelf={handleAddToShelf}
          />
        );
      
      case 'shelf':
        return (
          <BookShelf
            books={bookshelf}
            onBookOpen={handleBookOpen}
            onBookRemove={handleBookRemove}
            onBooksUpdate={setBookshelf}
          />
        );
      
      case 'detail':
        return selectedBook ? (
          <BookDetail
            book={selectedBook}
            onStartReading={handleStartReading}
            onBack={handleBack}
            onAddToShelf={() => handleAddToShelf(selectedBook)}
          />
        ) : null;
      
      case 'reader':
        return selectedBook ? (
          <Reader
            book={selectedBook}
            chapters={chapters}
            currentChapterIndex={currentChapterIndex}
            onChapterChange={handleChapterChange}
            onBack={handleBack}
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <div className="ebook-reader-app">
      {/* 导航栏 - 仅在非阅读器模式下显示 */}
      {currentView !== 'reader' && (
        <div className="app-navigation">
          <div className="nav-items">
            <button
              className={`nav-item ${currentView === 'shelf' ? 'active' : ''}`}
              onClick={() => handleNavClick('shelf')}
            >
              我的书架
            </button>
            <button
              className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
              onClick={() => handleNavClick('search')}
            >
              搜索书籍
            </button>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`app-content ${currentView === 'reader' ? 'fullscreen' : ''}`}>
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default EbookReader;
