import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Typography,
  Spin,
  Space,
  Drawer,
  Slider,
  Select,
  Switch,
  message,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  MenuOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { Chapter, Book, ReaderSettings } from '../../types';
import { useChapterContent } from '../../hooks/useChapterContent';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { StorageUtil } from '../../utils/storage';
import { THEMES, FONT_FAMILIES } from '../../constants';
import './index.scss';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface ReaderProps {
  book: Book;
  chapters: Chapter[];
  currentChapterIndex: number;
  onChapterChange: (index: number) => void;
  onBack: () => void;
}

const Reader: React.FC<ReaderProps> = ({
  book,
  chapters,
  currentChapterIndex,
  onChapterChange,
  onBack,
}) => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chaptersVisible, setChaptersVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { currentChapter, loading, getChapterContent } = useChapterContent();
  const { settings, updateSettings, resetSettings } = useReaderSettings();

  const currentChapter_ = chapters[currentChapterIndex];

  // 加载章节内容
  useEffect(() => {
    if (currentChapter_) {
      // 直接使用从章节列表API获取的完整URL
      getChapterContent(currentChapter_.sourceUrl || '', {
        id: currentChapter_.id,
        bookId: book.id,
        index: currentChapter_.index,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter_?.id, currentChapter_?.sourceUrl, book.id]);

  // 当章节内容加载完成时，滚动到顶部
  useEffect(() => {
    if (contentRef.current && currentChapter && !loading) {
      // 使用setTimeout确保DOM更新完成后再滚动
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [currentChapter, loading]);

  // 监听滚动进度
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      // 滚动处理逻辑（进度条功能已移除）
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [currentChapter, book.id, currentChapterIndex, chapters.length]);

  // 滚动到顶部的函数
  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // 上一章
  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      onChapterChange(currentChapterIndex - 1);
      // 立即滚动到顶部，不等待章节内容加载
      setTimeout(() => scrollToTop(), 50);
    } else {
      message.info('已经是第一章了');
    }
  };

  // 下一章
  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      onChapterChange(currentChapterIndex + 1);
      // 立即滚动到顶部，不等待章节内容加载
      setTimeout(() => scrollToTop(), 50);
    } else {
      message.info('已经是最后一章了');
    }
  };

  // 切换全屏
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (readerRef.current?.requestFullscreen) {
        readerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 应用阅读设置样式
  const readerStyle: React.CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    lineHeight: settings.lineHeight,
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
  };

  return (
    <div className="ebook-reader" ref={readerRef} style={readerStyle}>
      {/* 顶部工具栏 */}
      <div className="reader-header">
        <div className="header-left">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={onBack}
          >
            返回
          </Button>
          <div className="book-info">
            <span className="book-title">{book.title}</span>
            <span className="chapter-title">
              {currentChapter?.title || '加载中...'}
            </span>
          </div>
        </div>
        
        <div className="header-right">
          <Space>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setChaptersVisible(true)}
            >
              目录
            </Button>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              设置
            </Button>
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
        </div>
      </div>


      {/* 主要内容区域 */}
      <div className="reader-content" ref={contentRef}>
        <div className="content-container">
          <Spin spinning={loading} size="large">
            {currentChapter ? (
              <div className="chapter-content" style={{
                fontSize: `${settings.fontSize}px`,
                fontFamily: settings.fontFamily,
                lineHeight: settings.lineHeight,
              }}>
                <h2 className="chapter-title" style={{
                  fontSize: `${settings.fontSize + 4}px`,
                  fontFamily: settings.fontFamily,
                  lineHeight: settings.lineHeight,
                }}>
                  {currentChapter.title}
                </h2>
                <div className="chapter-meta" style={{
                  fontSize: `${settings.fontSize - 2}px`,
                  fontFamily: settings.fontFamily,
                }}>
                  <span>第{currentChapter.index}章</span>
                  <span>{currentChapter.wordCount}字</span>
                </div>
                <div className="chapter-text" style={{
                  fontSize: `${settings.fontSize}px`,
                  fontFamily: settings.fontFamily,
                  lineHeight: settings.lineHeight,
                }}>
                  {currentChapter.content?.split('\n\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="paragraph" style={{
                        fontSize: `${settings.fontSize}px`,
                        fontFamily: settings.fontFamily,
                        lineHeight: settings.lineHeight,
                      }}>
                        {paragraph.trim()}
                      </p>
                    )
                  ))}
                </div>
              </div>
            ) : (
              <div className="loading-placeholder">
                <Spin size="large" />
                <p>正在加载章节内容...</p>
              </div>
            )}
          </Spin>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="reader-footer">
        <Button
          type="primary"
          ghost
          icon={<LeftOutlined />}
          onClick={handlePrevChapter}
          disabled={currentChapterIndex === 0}
        >
          上一章
        </Button>
        
        <div className="chapter-info">
          <span>
            {currentChapterIndex + 1} / {chapters.length}
          </span>
        </div>
        
        <Button
          type="primary"
          ghost
          icon={<RightOutlined />}
          onClick={handleNextChapter}
          disabled={currentChapterIndex === chapters.length - 1}
        >
          下一章
        </Button>
      </div>

      {/* 章节目录抽屉 */}
      <Drawer
        title="章节目录"
        placement="left"
        open={chaptersVisible}
        onClose={() => setChaptersVisible(false)}
        width={300}
      >
        <div className="chapter-list">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className={`chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
              onClick={() => {
                onChapterChange(index);
                setChaptersVisible(false);
                // 切换章节时滚动到顶部
                setTimeout(() => scrollToTop(), 50);
              }}
            >
              <span className="chapter-number">第{chapter.index}章</span>
              <span className="chapter-name">{chapter.title}</span>
            </div>
          ))}
        </div>
      </Drawer>

      {/* 设置抽屉 */}
      <Drawer
        title="阅读设置"
        placement="right"
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        width={320}
      >
        <div className="reader-settings">
          <div className="setting-group">
            <h4>字体大小</h4>
            <Slider
              min={12}
              max={24}
              value={settings.fontSize}
              onChange={(value) => updateSettings({ fontSize: value })}
              marks={{ 12: '小', 16: '中', 20: '大', 24: '特大' }}
            />
          </div>

          <div className="setting-group">
            <h4>字体类型</h4>
            <Select
              value={settings.fontFamily}
              onChange={(value) => updateSettings({ fontFamily: value })}
              style={{ width: '100%' }}
            >
              {FONT_FAMILIES.map(font => (
                <Option key={font.value} value={font.value}>
                  {font.label}
                </Option>
              ))}
            </Select>
          </div>

          <div className="setting-group">
            <h4>行间距</h4>
            <Slider
              min={1.2}
              max={2.0}
              step={0.1}
              value={settings.lineHeight}
              onChange={(value) => updateSettings({ lineHeight: value })}
              marks={{ 1.2: '紧密', 1.6: '标准', 2.0: '宽松' }}
            />
          </div>

          <div className="setting-group">
            <h4>阅读主题</h4>
            <div className="theme-options">
              {Object.entries(THEMES).map(([key, theme]) => (
                <div
                  key={key}
                  className={`theme-option ${settings.theme === key ? 'active' : ''}`}
                  onClick={() => updateSettings({
                    theme: key as any,
                    backgroundColor: theme.backgroundColor,
                    textColor: theme.textColor,
                  })}
                >
                  <div
                    className="theme-preview"
                    style={{
                      backgroundColor: theme.backgroundColor,
                      color: theme.textColor,
                    }}
                  >
                    文
                  </div>
                  <span>{theme.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <h4>自动翻页</h4>
            <div className="auto-turn-setting">
              <Switch
                checked={settings.autoTurnPage}
                onChange={(checked) => updateSettings({ autoTurnPage: checked })}
              />
              {settings.autoTurnPage && (
                <div style={{ marginTop: 12 }}>
                  <span>翻页速度（秒）</span>
                  <Slider
                    min={1}
                    max={10}
                    value={settings.turnPageSpeed}
                    onChange={(value) => updateSettings({ turnPageSpeed: value })}
                    marks={{ 1: '快', 5: '中', 10: '慢' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="setting-actions">
            <Button onClick={resetSettings} block>
              恢复默认设置
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Reader;
