import React from 'react';
import {
  Button, Space, Tooltip, Radio, Select, Card, Checkbox, Popconfirm, Badge,
  Spin, Popover, Input, Tag, Tabs
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
  PicLeftOutlined, PicRightOutlined, FullscreenExitOutlined, FullscreenOutlined,
  RocketOutlined, CloudDownloadOutlined, DeleteOutlined, PlusOutlined, PlusCircleOutlined,
  SortAscendingOutlined, SortDescendingOutlined, InteractionOutlined, LoadingOutlined,
  HighlightOutlined, RedoOutlined, PlayCircleOutlined, CheckCircleFilled, UserAddOutlined,
  UserDeleteOutlined, EditOutlined, EyeOutlined, SaveOutlined
} from '@ant-design/icons';
import { Novel, NovelOutline, CharacterRelationship, VectorMemoryItem, PaperTheme } from '../types';
import { parseVolumeStructure, getChapterVolume, isPastCharacter } from '../utils/volumeParser';

const { TextArea } = Input;

interface EditorViewProps {
  selectedNovel: Novel | null;
  selectedOutline: NovelOutline | null;
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>;
  activeChapterNum: number;
  onExitEditor: () => void;
  paperTheme: PaperTheme;
  setPaperTheme: (theme: PaperTheme) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  leftCollapsed: boolean;
  setLeftCollapsed: (val: boolean) => void;
  rightCollapsed: boolean;
  setRightCollapsed: (val: boolean) => void;
  isFullScreen: boolean;
  toggleFullScreen: () => void;
  onOpenFanqieModal: () => void;
  onExportTxt: () => void;
  isDeleteMode: boolean;
  setIsDeleteMode: (val: boolean) => void;
  checkedChapters: number[];
  setCheckedChapters: React.Dispatch<React.SetStateAction<number[]>>;
  onConfirmBatchDelete: () => void;
  onOpenBatchModal: () => void;
  onOpenInsertModal: (defaultAfterNum?: number) => void;
  onOpenFreeWrite: () => void;
  chapterSortAsc: boolean;
  setChapterSortAsc: React.Dispatch<React.SetStateAction<boolean>>;
  selectedVolumeNum: number | null;
  setSelectedVolumeNum: (val: number | null) => void;
  onSelectChapter: (num: number) => void;
  toggleCheckChapter: (num: number) => void;
  onToggleSyncStatus: (chNum: number, currentIsSynced: boolean) => void;
  onDeleteChapter: (e: React.MouseEvent, chNum: number) => void;
  onAiRenameChapter: () => void;
  onManualRenameChapter: (chNum: number, newTitle: string) => void;
  renamingChapter: boolean;
  chapterContent: string;
  setChapterContent: (val: string) => void;
  isGenerating: boolean;
  writingSpeed: number;
  showPolishPop: boolean;
  setShowPolishPop: (show: boolean) => void;
  selectedText: string;
  setSelectedText: (val: string) => void;
  selectedRange: { start: number; end: number } | null;
  setSelectedRange: (range: { start: number; end: number } | null) => void;
  polishInstruction: string;
  setPolishInstruction: (val: string) => void;
  polishing: boolean;
  onPolishText: () => void;
  polishedResult: string;
  onReplacePolishedText: () => void;
  textRef: React.RefObject<HTMLTextAreaElement>;
  saveManualEdits: (content: string) => void;
  onSaveChapterContent?: (showToast?: boolean) => void;
  wordCountLimit: number;
  setWordCountLimit: (val: number) => void;
  onContinueWriting: () => void;
  onWriteChapterStream: (isResume?: boolean) => void;
  loading: boolean;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  onPauseGeneration: () => void;
  onStopGeneration: () => void;
  rightWidth: number;
  isResizingRight: boolean;
  startResizeRight: (e: React.MouseEvent) => void;
  onOpenManualEdit: (field: string, title: string, value: string) => void;
  intervention: string;
  setIntervention: (val: string) => void;
  httpService: any;
  message: any;
  setModifyField: (field: 'worldSetting' | 'mainLine' | 'characterSetting') => void;
  setIsModifyModalOpen: (open: boolean) => void;
  setIsBackgroundSettingsModalOpen: (open: boolean) => void;
  isAnalyzingSys: boolean;
  onAnalyzeSystemAndCultivation: () => void;
  onOpenBatchAnalyzeModal: (type?: 'sys' | 'rel') => void;
  onStartAddRelationship: () => void;
  relSortAsc: boolean;
  setRelSortAsc: React.Dispatch<React.SetStateAction<boolean>>;
  isAnalyzingRel: boolean;
  onAnalyzeRelationships: () => void;
  activeRelNode: CharacterRelationship | null;
  setActiveRelNode: (node: CharacterRelationship | null) => void;
  onTogglePastStatus: (relName: string) => Promise<void>;
  isDeslopping?: boolean;
  onDeslopContent?: (customInstruction?: string) => void;
  onStartEditRelationship: (rel: CharacterRelationship) => void;
  onDeleteRelationship: (name: string) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  selectedNovel,
  selectedOutline,
  setSelectedOutline,
  activeChapterNum,
  isDeslopping = false,
  onDeslopContent,
  onExitEditor,
  paperTheme,
  setPaperTheme,
  fontSize,
  setFontSize,
  leftCollapsed,
  setLeftCollapsed,
  rightCollapsed,
  setRightCollapsed,
  isFullScreen,
  toggleFullScreen,
  onOpenFanqieModal,
  onExportTxt,
  isDeleteMode,
  setIsDeleteMode,
  checkedChapters,
  setCheckedChapters,
  onConfirmBatchDelete,
  onOpenBatchModal,
  onOpenInsertModal,
  chapterSortAsc,
  setChapterSortAsc,
  selectedVolumeNum,
  setSelectedVolumeNum,
  onSelectChapter,
  toggleCheckChapter,
  onToggleSyncStatus,
  onDeleteChapter,
  onAiRenameChapter,
  onManualRenameChapter,
  renamingChapter,
  chapterContent,
  setChapterContent,
  isGenerating,
  writingSpeed,
  showPolishPop,
  setShowPolishPop,
  selectedText,
  setSelectedText,
  selectedRange,
  setSelectedRange,
  polishInstruction,
  setPolishInstruction,
  polishing,
  onPolishText,
  polishedResult,
  onReplacePolishedText,
  textRef,
  saveManualEdits,
  onSaveChapterContent,
  wordCountLimit,
  setWordCountLimit,
  onContinueWriting,
  onWriteChapterStream,
  loading,
  isPaused,
  setIsPaused,
  onPauseGeneration,
  onStopGeneration,
  rightWidth,
  isResizingRight,
  startResizeRight,
  onOpenManualEdit,
  intervention,
  setIntervention,
  httpService,
  message,
  setModifyField,
  setIsModifyModalOpen,
  setIsBackgroundSettingsModalOpen,
  isAnalyzingSys,
  onAnalyzeSystemAndCultivation,
  onOpenBatchAnalyzeModal,
  onStartAddRelationship,
  relSortAsc,
  setRelSortAsc,
  isAnalyzingRel,
  onAnalyzeRelationships,
  activeRelNode,
  setActiveRelNode,
  onTogglePastStatus,
  onStartEditRelationship,
  onDeleteRelationship,
  onOpenFreeWrite,
}) => {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInputValue, setTitleInputValue] = React.useState('');
  const [popoverRenameNum, setPopoverRenameNum] = React.useState<number | null>(null);
  const [popoverRenameValue, setPopoverRenameValue] = React.useState('');
  const debounceSaveRef = React.useRef<any>(null);

  const getCleanChapterTitle = (chap: any) => {
    if (!chap || !chap.title) return `第${chap?.chapterNumber || ''}章`;
    const num = chap.chapterNumber;
    const numPattern = new RegExp(`^第\\s*${num}\\s*章[\\s:：·—\\-]*`, 'i');
    const clean = chap.title.replace(numPattern, '').trim();
    return clean || chap.title;
  };

  // 🧠 向量长程记忆库状态
  const [vectorMemories, setVectorMemories] = React.useState<VectorMemoryItem[]>([]);
  const [loadingMemories, setLoadingMemories] = React.useState(false);
  const [memorySearchText, setMemorySearchText] = React.useState('');
  const [selectedMemoryType, setSelectedMemoryType] = React.useState('all');

  const fetchVectorMemories = React.useCallback(async () => {
    if (!selectedNovel?.id) return;
    try {
      setLoadingMemories(true);
      const res: any = await httpService.get(`/ai-novel/vector-memories?novelId=${selectedNovel.id}&memoryType=${selectedMemoryType}&search=${encodeURIComponent(memorySearchText)}`);
      if (res.code === 200) {
        setVectorMemories(res.data || []);
      }
    } catch (err) {
      console.warn('获取向量记忆列表失败:', err);
    } finally {
      setLoadingMemories(false);
    }
  }, [selectedNovel?.id, selectedMemoryType, memorySearchText, httpService]);

  React.useEffect(() => {
    fetchVectorMemories();
  }, [fetchVectorMemories]);

  const handleDeleteMemoryItem = async (memId: number) => {
    try {
      const res: any = await httpService.delete(`/ai-novel/vector-memory/${memId}`);
      if (res.code === 200) {
        message.success('已删除该条深层记忆');
        fetchVectorMemories();
      }
    } catch (e: any) {
      message.error(e?.message || '删除记忆失败');
    }
  };

  const handleTextChange = (newVal: string) => {
    setChapterContent(newVal);
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    debounceSaveRef.current = setTimeout(() => {
      if (onSaveChapterContent) {
        onSaveChapterContent(false);
      }
    }, 1500);
  };

  if (!selectedNovel) return null;

  const safeOutline = selectedOutline || { chaptersOutline: [], characterRelationships: [], systemAndCultivationState: {}, theme: '', worldSetting: '', characterSetting: '', mainLine: '' };
  const currentChapter = (safeOutline.chaptersOutline || []).find((c: any) => parseInt(c.chapterNumber, 10) === parseInt(activeChapterNum as any, 10));

  const handleTextSelect = () => {
    if (textRef.current) {
      const start = textRef.current.selectionStart;
      const end = textRef.current.selectionEnd;
      if (start !== end) {
        const text = chapterContent.substring(start, end);
        setSelectedText(text);
        setSelectedRange({ start, end });
      }
    }
  };

  return (
    <div className={`novel-editor-view paper-theme-${paperTheme} ${isFullScreen ? 'full-screen-writing' : ''}`}>
      <div className="editor-top-bar">
        <Button icon={<ArrowLeftOutlined />} onClick={onExitEditor} type="text" className="back-btn-editor">
          退出工坊
        </Button>
        <div className="novel-main-title">
          <BookOutlined style={{color: '#d4b106', marginRight: 8, flexShrink: 0}} />
          <span className="title-text">《{selectedNovel.title}》</span>
          <span className="category-tag">{selectedNovel.category}</span>
        </div>
        <Space className="top-bar-actions">
          <Tooltip title="切换护眼模式">
            <Radio.Group value={paperTheme} onChange={e => setPaperTheme(e.target.value as any)} size="small">
              <Radio.Button value="light">极简白</Radio.Button>
              <Radio.Button value="paper">羊皮纸</Radio.Button>
              <Radio.Button value="mint">薄荷绿</Radio.Button>
              <Radio.Button value="dark">🌑 暗夜黑</Radio.Button>
            </Radio.Group>
          </Tooltip>
          <Tooltip title="字号调节">
            <Space>
              <Button size="small" onClick={() => setFontSize(prev => Math.max(12, prev - 2))}>A-</Button>
              <span>{fontSize}px</span>
              <Button size="small" onClick={() => setFontSize(prev => Math.min(26, prev + 2))}>A+</Button>
            </Space>
          </Tooltip>
          <Tooltip title={leftCollapsed ? '展开章节管理' : '收起章节管理'}>
            <Button
              icon={leftCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              ghost
              style={{ borderColor: 'rgba(212, 177, 6, 0.4)', color: '#d4b106' }}
            />
          </Tooltip>
          <Tooltip title={rightCollapsed ? '展开情节参考' : '收起情节参考'}>
            <Button
              icon={rightCollapsed ? <PicLeftOutlined /> : <PicRightOutlined />}
              onClick={() => setRightCollapsed(!rightCollapsed)}
              ghost
              style={{ borderColor: 'rgba(212, 177, 6, 0.4)', color: '#d4b106' }}
            />
          </Tooltip>
          <Tooltip title={isFullScreen ? '退出全屏专注写作' : '一键全屏专注写作'}>
            <Button
              icon={isFullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullScreen}
              type="primary"
              ghost
              style={{ borderColor: isFullScreen ? '#52c41a' : 'rgba(212, 177, 6, 0.4)', color: isFullScreen ? '#52c41a' : '#d4b106' }}
            />
          </Tooltip>
          <Tooltip title="将当前完成的章节一键自动同步至番茄小说草稿箱">
            <Button
              icon={<RocketOutlined />}
              onClick={onOpenFanqieModal}
              type="primary"
              style={{ background: 'linear-gradient(135deg, #d4b106 0%, #b29100 100%)', border: 'none', color: '#fff' }}
            >
              同步到草稿箱
            </Button>
          </Tooltip>
          <Button icon={<CloudDownloadOutlined />} onClick={onExportTxt} type="primary" ghost>
            导出作品
          </Button>
        </Space>
      </div>

      <div className="editor-main-body">
        {/* 左侧章节树 */}
        <div className={`left-chapters-tree ${leftCollapsed ? 'collapsed' : ''}`}>
          {isDeleteMode ? (
            <div className="tree-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <span style={{ fontSize: 13, color: '#ff4d4f', fontWeight: 600 }}>已选 {checkedChapters.length} 章</span>
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  danger
                  disabled={checkedChapters.length === 0}
                  onClick={onConfirmBatchDelete}
                  style={{ fontSize: 11, padding: '0 8px', height: 24 }}
                >
                  确认删除
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsDeleteMode(false);
                    setCheckedChapters([]);
                  }}
                  style={{ background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#cbd5e1', fontSize: 11, padding: '0 8px', height: 24 }}
                >
                  取消
                </Button>
              </Space>
            </div>
          ) : (
            <div className="tree-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>章节管理</span>
              <Space>
                <Tooltip title="🪄 智能剧情批量拆章规划">
                  <Button
                    size="small"
                    icon={<RocketOutlined />}
                    onClick={onOpenBatchModal}
                    style={{ background: 'transparent', color: '#d4b106', borderColor: 'rgba(212, 177, 6, 0.3)' }}
                  />
                </Tooltip>
                <Tooltip title="📝 自由创作 → 智能拆章（先写剧情白稿，AI 自动分章生成正文）">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={onOpenFreeWrite}
                    style={{ background: 'transparent', color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)' }}
                  />
                </Tooltip>
                <Tooltip title="🗑️ 批量删除章节">
                  <Button
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setIsDeleteMode(true);
                      setCheckedChapters([]);
                    }}
                    style={{ background: 'transparent', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3)' }}
                  />
                </Tooltip>
                <Tooltip title="➕ 手动加一章到末尾">
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={async () => {
                      if (!selectedOutline) return;
                      const list = [...selectedOutline.chaptersOutline];
                      const nextNum = list.length + 1;
                      list.push({
                        chapterNumber: nextNum,
                        title: `第 ${nextNum} 章 新增计划章节`,
                        outline: '点击这里编辑本章细纲内容，为 AI 构思剧情...',
                        status: 'pending',
                        wordCount: 0
                      });
                      setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
                      await httpService.post('/ai-novel/save-outline', {
                        novelId: selectedNovel.id,
                        chaptersOutline: list
                      });
                    }}
                  />
                </Tooltip>
                <Tooltip title="🆕 智能插章 (在任意位置插入章节，AI 结合上下文顺接细纲)">
                  <Button
                    size="small"
                    icon={<PlusCircleOutlined />}
                    style={{ color: '#1890ff', borderColor: 'rgba(24, 144, 255, 0.3)' }}
                    onClick={() => onOpenInsertModal(activeChapterNum ? activeChapterNum - 1 : 0)}
                  />
                </Tooltip>
                <Tooltip title={chapterSortAsc ? '当前正序，点击切换为倒序' : '当前倒序，点击切换为正序'}>
                  <Button
                    size="small"
                    icon={chapterSortAsc ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                    onClick={() => setChapterSortAsc(v => !v)}
                    style={{ background: 'transparent', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}
                  />
                </Tooltip>
              </Space>
            </div>
          )}
          {(() => {
            const volumeInfo = parseVolumeStructure(selectedOutline?.mainLine || '');
            let filteredChapters = (selectedOutline?.chaptersOutline || []).filter(chap => {
              if (!volumeInfo.parsed || selectedVolumeNum === null) return true;
              const chapVol = getChapterVolume(chap.chapterNumber, volumeInfo.volumes);
              return chapVol.volumeNumber === selectedVolumeNum;
            });
            if (!chapterSortAsc) {
              filteredChapters = [...filteredChapters].reverse();
            }

            return (
              <>
                {volumeInfo.parsed && (
                  <div className="volume-selector-container" style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOutlined style={{ color: '#d4b106', fontSize: 14, flexShrink: 0 }} />
                    <Select
                      value={selectedVolumeNum === null ? 'all' : selectedVolumeNum}
                      onChange={val => setSelectedVolumeNum(val === 'all' ? null : Number(val))}
                      style={{ flex: 1, minWidth: 0 }}
                      size="small"
                      bordered={false}
                      dropdownMatchSelectWidth={false}
                      className="volume-select-dropdown"
                    >
                      <Select.Option value="all">
                        📖 全部卷章 (共 {selectedOutline?.chaptersOutline?.length || 0} 章)
                      </Select.Option>
                      {volumeInfo.volumes.map(vol => {
                        const nextVol = volumeInfo.volumes.find((v: any) => v.volumeNumber === vol.volumeNumber + 1);
                        const rangeText = nextVol
                          ? `(第${vol.startChapter}-${nextVol.startChapter - 1}章)`
                          : `(第${vol.startChapter}章+)`;
                        return (
                          <Select.Option key={vol.volumeNumber} value={vol.volumeNumber}>
                            第{vol.volumeNumber}卷：{vol.title} {rangeText}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </div>
                )}
                <div className="tree-scroll">
                  {filteredChapters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 12px', color: '#94a3b8' }}>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>该分卷下暂无章节</div>
                      <Button size="small" type="dashed" onClick={() => setSelectedVolumeNum(null)}>
                        显示全部章节
                      </Button>
                    </div>
                  ) : (
                    filteredChapters.map(chap => {
                      const chapVol = getChapterVolume(chap.chapterNumber, volumeInfo.volumes);
                      return (
                        <div
                          key={chap.chapterNumber}
                          className={`tree-item ${Number(chap.chapterNumber) === Number(activeChapterNum) ? 'active' : ''}`}
                          onClick={() => {
                            if (isDeleteMode) {
                              toggleCheckChapter(chap.chapterNumber);
                            } else {
                              onSelectChapter(chap.chapterNumber);
                            }
                          }}
                        >
                          {isDeleteMode && (
                            <Checkbox
                              checked={checkedChapters.includes(chap.chapterNumber)}
                              onChange={() => toggleCheckChapter(chap.chapterNumber)}
                              style={{ marginRight: 8 }}
                              onClick={e => e.stopPropagation()}
                            />
                          )}
                          <span className="chap-num">#{chap.chapterNumber}</span>
                          {volumeInfo.parsed && (
                            <span style={{ fontSize: 10, background: '#e8e8e8', color: '#666', padding: '0px 4px', borderRadius: 4, marginRight: 4, flexShrink: 0 }}>
                              卷 {chapVol.volumeNumber}
                            </span>
                          )}
                        <span className="chap-name" title={chap.title}>
                          {getCleanChapterTitle(chap)}
                        </span>
                        <span className="chap-state-badge" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {chap.crawlStatus === 'published' ? (
                            <Popconfirm
                              title="确定将此章节标记为【未同步】吗？"
                              okText="确定"
                              cancelText="取消"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                onToggleSyncStatus(chap.chapterNumber, true);
                              }}
                              onCancel={(e) => e?.stopPropagation()}
                            >
                              <span onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="点击手动更改同步状态">
                                  <Badge status="warning" text="已同步" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} />
                                </Tooltip>
                              </span>
                            </Popconfirm>
                          ) : chap.status === 'completed' ? (
                            <Popconfirm
                              title="确定将此章节手动标记为【已同步草稿箱】吗？"
                              okText="确定"
                              cancelText="取消"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                onToggleSyncStatus(chap.chapterNumber, false);
                              }}
                              onCancel={(e) => e?.stopPropagation()}
                            >
                              <span onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="点击手动标记为已同步">
                                  <Badge status="success" text={`${chap.wordCount || 0}字`} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} />
                                </Tooltip>
                              </span>
                            </Popconfirm>
                          ) : (
                            <Badge status="default" text="待写" style={{ whiteSpace: 'nowrap' }} />
                          )}
                          {!isDeleteMode && (
                            <span className="chap-hover-actions" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <Popover
                                trigger="click"
                                open={popoverRenameNum === chap.chapterNumber}
                                onOpenChange={(visible) => {
                                  if (visible) {
                                    setPopoverRenameNum(chap.chapterNumber);
                                    setPopoverRenameValue(chap.title);
                                  } else {
                                    setPopoverRenameNum(null);
                                  }
                                }}
                                content={
                                  <div style={{ padding: 4, display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      size="small"
                                      value={popoverRenameValue}
                                      onChange={(e) => setPopoverRenameValue(e.target.value)}
                                      onPressEnter={() => {
                                        if (popoverRenameValue.trim()) {
                                          onManualRenameChapter(chap.chapterNumber, popoverRenameValue);
                                        }
                                        setPopoverRenameNum(null);
                                      }}
                                      autoFocus
                                      placeholder="输入新章节名"
                                      style={{ width: 180 }}
                                    />
                                    <Button
                                      type="primary"
                                      size="small"
                                      onClick={() => {
                                        if (popoverRenameValue.trim()) {
                                          onManualRenameChapter(chap.chapterNumber, popoverRenameValue);
                                        }
                                        setPopoverRenameNum(null);
                                      }}
                                    >
                                      确定
                                    </Button>
                                  </div>
                                }
                              >
                                <Tooltip title="修改章节名字">
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPopoverRenameNum(chap.chapterNumber);
                                      setPopoverRenameValue(chap.title);
                                    }}
                                    className="chap-edit-btn"
                                    style={{ padding: 0, width: 18, height: 18, fontSize: 11, marginLeft: 2, color: '#595959' }}
                                  />
                                </Tooltip>
                              </Popover>
                              <Tooltip title={`在该章（第 ${chap.chapterNumber} 章）之后插入新章节`}>
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<PlusOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenInsertModal(chap.chapterNumber);
                                  }}
                                  className="chap-insert-btn"
                                  style={{ padding: 0, width: 18, height: 18, fontSize: 11, marginLeft: 2, color: '#595959' }}
                                />
                              </Tooltip>
                              <Tooltip title="删除本章">
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => onDeleteChapter(e, chap.chapterNumber)}
                                  className="chap-delete-btn"
                                  style={{ padding: 0, width: 20, height: 20, fontSize: 12, marginLeft: 2 }}
                                />
                              </Tooltip>
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                </div>
              </>
            );
          })()}
        </div>

        {/* 中间主编辑器 */}
        <div className={`center-writing-desk ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
          <div className="paper-container">
            <div className="paper-header-info">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                {isEditingTitle ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, marginRight: 16 }}>
                    <Input
                      size="large"
                      value={titleInputValue}
                      onChange={(e) => setTitleInputValue(e.target.value)}
                      onPressEnter={() => {
                        const targetNum = currentChapter?.chapterNumber || activeChapterNum || 1;
                        if (titleInputValue.trim()) {
                          onManualRenameChapter(targetNum, titleInputValue.trim());
                        }
                        setIsEditingTitle(false);
                      }}
                      autoFocus
                      placeholder="请输入章节名字..."
                      style={{ fontWeight: 'bold', fontSize: 18 }}
                    />
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        const targetNum = currentChapter?.chapterNumber || activeChapterNum || 1;
                        if (titleInputValue.trim()) {
                          onManualRenameChapter(targetNum, titleInputValue.trim());
                        }
                        setIsEditingTitle(false);
                      }}
                    >
                      保存
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setIsEditingTitle(false)}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    className="editable-chapter-title-group"
                    onClick={() => {
                      setIsEditingTitle(true);
                      setTitleInputValue(currentChapter?.title || '');
                    }}
                  >
                    <h2 style={{ margin: 0 }}>
                      {currentChapter?.title || (activeChapterNum ? `第 ${activeChapterNum} 章` : '未命名章节')}
                    </h2>
                    <Tooltip title="点击修改章节名字">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingTitle(true);
                          setTitleInputValue(currentChapter?.title || '');
                        }}
                      />
                    </Tooltip>
                  </div>
                )}
                <Button
                  type="primary"
                  ghost
                  size="small"
                  icon={<InteractionOutlined />}
                  onClick={onAiRenameChapter}
                  loading={renamingChapter}
                >
                  AI起名字
                </Button>
              </div>
              <div className="words-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span>字数统计: {chapterContent.length} 字</span>
                  {isGenerating && (
                    <span className="speed-stats" style={{marginLeft: 15, color: '#389e0d'}}>
                      <LoadingOutlined /> 生成中: {writingSpeed}字/秒
                    </span>
                  )}
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => onSaveChapterContent && onSaveChapterContent(true)}
                  style={{ borderRadius: 4 }}
                >
                  保存正文
                </Button>
              </div>
            </div>

            {/* 本章高级蓝图指示栏 */}
            {currentChapter && (currentChapter.suspenseLevel || currentChapter.foreshadowing || currentChapter.hookType || currentChapter.keyItems) && (
              <div className="chapter-blueprint-bar">
                <span className="blueprint-label">🎯 本章蓝图：</span>
                {currentChapter.suspenseLevel && (
                  <Tag color="volcano" style={{ margin: 0, fontSize: 11 }}>
                    ⚡ 悬念: {currentChapter.suspenseLevel}
                  </Tag>
                )}
                {currentChapter.foreshadowing && (
                  <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                    🔍 伏笔: {currentChapter.foreshadowing}
                  </Tag>
                )}
                {currentChapter.hookType && (
                  <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                    🪝 留钩: {currentChapter.hookType}
                  </Tag>
                )}
                {currentChapter.keyItems && (
                  <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>
                    🎒 道具: {currentChapter.keyItems}
                  </Tag>
                )}
              </div>
            )}

            {isGenerating && chapterContent.length === 0 ? (
              <div className="writing-loading-state">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="AI 正在凝神构思，铺展墨水..." />
              </div>
            ) : (
              <div className="editor-wrap-box">
                <Popover
                  content={
                    <div className="polish-gas-content">
                      <h4 style={{margin: '0 0 8px 0'}}>🛠️ 修复重写选中段落</h4>
                      {selectedText && (
                        <div style={{fontSize: 12, color: '#5b6472', background: '#eef5ff', border: '1px solid #cfe3ff', padding: '6px 8px', borderRadius: 4, marginBottom: 8, maxHeight: 86, overflowY: 'auto', whiteSpace: 'pre-wrap'}}>
                          已选中 {selectedText.length} 字：{selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText}
                        </div>
                      )}
                      <Input
                        placeholder="例如：删除突兀台词“怕的不是你笨”，改为描写动作与平淡语气..."
                        value={polishInstruction}
                        onChange={e => setPolishInstruction(e.target.value)}
                        style={{width: 320, marginBottom: 8}}
                        size="small"
                      />
                      <Space style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Button size="small" onMouseDown={e => e.preventDefault()} onClick={() => setShowPolishPop(false)}>取消</Button>
                        <Button size="small" type="primary" loading={polishing} onMouseDown={e => e.preventDefault()} onClick={onPolishText}>开始修复</Button>
                      </Space>

                      {polishedResult && (
                        <div className="polished-result-box" style={{marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 8}}>
                          <p style={{fontSize: 12, color: '#666', background: '#f5f5f5', padding: 6, borderRadius: 4, maxHeight: 150, overflowY: 'auto'}}>{polishedResult}</p>
                          <Space style={{display: 'flex', justifyContent: 'flex-end', marginTop: 5}}>
                            <Button size="small" icon={<RedoOutlined />} onMouseDown={e => e.preventDefault()} onClick={onPolishText} loading={polishing}>再修一版</Button>
                            <Button size="small" type="primary" icon={<CheckCircleFilled />} onMouseDown={e => e.preventDefault()} onClick={onReplacePolishedText}>替换选中段</Button>
                          </Space>
                        </div>
                      )}
                    </div>
                  }
                  title={null}
                  trigger="click"
                  open={showPolishPop}
                  onOpenChange={setShowPolishPop}
                  placement="top"
                >
                  <textarea
                    ref={textRef}
                    value={chapterContent}
                    onChange={e => handleTextChange(e.target.value)}
                    onBlur={() => {
                      if (onSaveChapterContent) {
                        onSaveChapterContent(false);
                      }
                    }}
                    onMouseUp={handleTextSelect}
                    onKeyUp={handleTextSelect}
                    onSelect={handleTextSelect}
                    className="inkwell-textarea"
                    style={{ fontSize: `${fontSize}px` }}
                    placeholder="如果您处于[待写]状态，可在此处编写，或在右侧配置突发剧情干预，然后点击下方【召唤 AI 智能撰写章节正文】..."
                  />
                </Popover>
              </div>
            )}

            <div className="paper-action-bar">
              {currentChapter?.status === 'completed' ? (
                <Space>
                  <Select
                    value={wordCountLimit}
                    onChange={setWordCountLimit}
                    style={{ width: 130 }}
                    className="word-limit-select"
                    popupClassName="word-limit-popup"
                  >
                    <Select.Option value={1500}>1500 字</Select.Option>
                    <Select.Option value={2000}>2000 字</Select.Option>
                    <Select.Option value={2500}>2500 字(默认)</Select.Option>
                    <Select.Option value={3000}>3000 字</Select.Option>
                    <Select.Option value={4000}>4000 字</Select.Option>
                    <Select.Option value={5000}>5000 字</Select.Option>
                  </Select>
                  <Button
                    type="primary"
                    icon={<HighlightOutlined />}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      if (textRef.current) {
                        const start = textRef.current.selectionStart;
                        const end = textRef.current.selectionEnd;
                        if (start !== end) {
                          const txt = chapterContent.substring(start, end);
                          setSelectedText(txt);
                          setSelectedRange({ start, end });
                          setShowPolishPop(true);
                          return;
                        }
                      }
                      if (selectedText) {
                        setShowPolishPop(true);
                      } else {
                        message.warning('请先用鼠标在上方正文框中划线选中需要修改的段落！');
                      }
                    }}
                  >
                    修复重写选中段
                  </Button>
                  <Button
                    style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: '#fff', fontWeight: 600 }}
                    loading={isDeslopping}
                    disabled={isGenerating || !chapterContent.trim()}
                    onClick={() => onDeslopContent && onDeslopContent()}
                    icon={<span>✨</span>}
                  >
                    深度去 AI 味 (7 Gate)
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={onContinueWriting}
                    loading={loading}
                  >
                    AI 一键续写
                  </Button>
                  <Button
                    icon={<RedoOutlined />}
                    danger
                    onClick={() => onWriteChapterStream(false)}
                    disabled={isGenerating}
                  >
                    重写当前章
                  </Button>
                </Space>
              ) : (
                <div style={{width: '100%'}}>
                  {isGenerating ? (
                    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                      <Button
                        type="primary"
                        style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', flex: 1 }}
                        size="large"
                        onClick={onPauseGeneration}
                      >
                        ⏸️ 暂停 AI 书写
                      </Button>
                      <Button
                        type="primary"
                        danger
                        style={{ flex: 1 }}
                        size="large"
                        onClick={onStopGeneration}
                      >
                        🛑 终止 AI 书写
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                      <Select
                        value={wordCountLimit}
                        onChange={setWordCountLimit}
                        size="large"
                        style={{ width: 140 }}
                        className="word-limit-select"
                        popupClassName="word-limit-popup"
                      >
                        <Select.Option value={1500}>1500 字</Select.Option>
                        <Select.Option value={2000}>2000 字</Select.Option>
                        <Select.Option value={2500}>2500 字(默认)</Select.Option>
                        <Select.Option value={3000}>3000 字</Select.Option>
                        <Select.Option value={4000}>4000 字</Select.Option>
                        <Select.Option value={5000}>5000 字</Select.Option>
                      </Select>
                      {isPaused ? (
                        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            size="large"
                            style={{ flex: 2 }}
                            onClick={() => onWriteChapterStream(true)}
                            className="btn-trigger-ai"
                          >
                            ▶️ 继续 AI 撰写
                          </Button>
                          <Button
                            danger
                            size="large"
                            icon={<RedoOutlined />}
                            style={{ flex: 1 }}
                            onClick={() => {
                              setIsPaused(false);
                              onWriteChapterStream(false);
                            }}
                          >
                            放弃并重写
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          size="large"
                          style={{ flex: 1 }}
                          onClick={() => onWriteChapterStream(false)}
                          className="btn-trigger-ai"
                        >
                          🖋️ 召唤 AI 智能撰写章节正文
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 拖拽拉伸拉把 */}
        {!rightCollapsed && (
          <div
            className={`resize-handle-right ${isResizingRight ? 'resizing' : ''}`}
            onMouseDown={startResizeRight}
          />
        )}

        {/* 右侧大纲参考 */}
        <div
          className={`right-reference-desk ${rightCollapsed ? 'collapsed' : ''} ${isResizingRight ? 'resizing' : ''}`}
          style={{ width: rightCollapsed ? 0 : rightWidth }}
        >
          <div className="tab-pane-scroll" style={{ height: '100%', padding: '12px' }}>
            <Card
              className="ref-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>📋 本章细纲剧情要求</span>
                  <Button
                    size="small"
                    type="link"
                    icon={<FullscreenOutlined />}
                    style={{ color: '#d4b106', padding: 0 }}
                    onClick={() => onOpenManualEdit('outline', '本章细纲剧情要求', currentChapter?.outline || '')}
                  />
                </div>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <TextArea
                value={currentChapter?.outline}
                onChange={async e => {
                  if (!selectedOutline) return;
                  const list = [...selectedOutline.chaptersOutline];
                  const current = list.find(c => Number(c.chapterNumber) === Number(activeChapterNum));
                  if (current) {
                    current.outline = e.target.value;
                    setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
                    await httpService.post('/ai-novel/save-outline', {
                      novelId: selectedNovel.id,
                      chaptersOutline: list
                    });
                  }
                }}
                rows={4}
                placeholder="在此编辑本章细纲要求，指导 AI 写作..."
              />
            </Card>

            <Card
              className="intervention-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>💥 情节插手 / 突发干预 <Tooltip title="强制让大模型在本章中安插您自定义的突发矛盾事件"><EyeOutlined style={{color: '#999'}} /></Tooltip></span>
                  <Button
                    size="small"
                    type="link"
                    icon={<FullscreenOutlined />}
                    style={{ color: '#d4b106', padding: 0 }}
                    onClick={() => onOpenManualEdit('intervention', '情节插手 / 突发干预', intervention)}
                  />
                </div>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <TextArea
                value={intervention}
                onChange={async e => {
                  const newVal = e.target.value;
                  setIntervention(newVal);
                  if (selectedOutline && selectedNovel) {
                    const list = [...selectedOutline.chaptersOutline];
                    const current = list.find(c => Number(c.chapterNumber) === Number(activeChapterNum));
                    if (current) {
                      current.interventionPrompt = newVal;
                      setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
                      try {
                        await httpService.post('/ai-novel/save-outline', {
                          novelId: selectedNovel.id,
                          chaptersOutline: list
                        });
                      } catch (err: any) {
                        console.error('自动保存突发干预指令失败:', err.message);
                      }
                    }
                  }
                }}
                placeholder="例如：主角在心动的Offer急诊查房中遭遇刻薄的家属，系统突然发出紧急提示..."
                rows={5}
              />
            </Card>

            <Card
              className="mainline-sandbox-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>⛓️ 四大分卷升级主线沙盘</span>
                  <Space size="middle">
                    <Button
                      size="small"
                      type="link"
                      icon={<FullscreenOutlined />}
                      style={{ color: '#d4b106', padding: 0 }}
                      onClick={() => onOpenManualEdit('mainLine', '四大分卷升级主线沙盘', selectedOutline?.mainLine || '')}
                    />
                    <Button
                      size="small"
                      type="link"
                      icon={<RocketOutlined />}
                      style={{ color: '#d4b106', padding: 0 }}
                      onClick={() => {
                        setModifyField('mainLine');
                        setIsModifyModalOpen(true);
                      }}
                    >
                      AI修改
                    </Button>
                  </Space>
                </div>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <TextArea
                value={selectedOutline?.mainLine}
                onChange={e => {
                  if (selectedOutline) {
                    setSelectedOutline({ ...selectedOutline, mainLine: e.target.value });
                  }
                }}
                onBlur={async e => {
                  if (!selectedNovel) return;
                  await httpService.post('/ai-novel/save-outline', {
                    novelId: selectedNovel.id,
                    mainLine: e.target.value
                  });
                  message.success({ content: '主线沙盘设定自动保存成功！', duration: 1.5 });
                }}
                rows={6}
                placeholder="在此输入并修改主线沙盘设定，引导后续剧情的发展大方向..."
                style={{ fontSize: 13 }}
              />
            </Card>

            <Card
              className="outline-brief-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>🌌 小说背景设定与修改</span>
                  <Button
                    size="small"
                    type="text"
                    icon={<FullscreenOutlined />}
                    style={{ color: '#d4b106', padding: '0 8px', height: 24, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 4, background: 'rgba(212, 177, 6, 0.1)' }}
                    onClick={() => setIsBackgroundSettingsModalOpen(true)}
                  >
                    整体放大
                  </Button>
                </div>
              }
              size="small"
            >
              <Tabs
                size="small"
                items={[
                  {
                    key: 'w',
                    label: (
                      <Space>
                        <span>世界观</span>
                        <Button
                          size="small"
                          type="text"
                          style={{ fontSize: 11, color: '#d4b106', padding: '0 4px', height: 'auto' }}
                          icon={<RocketOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModifyField('worldSetting');
                            setIsModifyModalOpen(true);
                          }}
                        >
                          AI修改
                        </Button>
                      </Space>
                    ),
                    children: (
                      <TextArea
                        value={selectedOutline?.worldSetting}
                        onChange={e => {
                          if (selectedOutline) {
                            setSelectedOutline({ ...selectedOutline, worldSetting: e.target.value });
                          }
                        }}
                        onBlur={async e => {
                          if (!selectedNovel) return;
                          await httpService.post('/ai-novel/save-outline', {
                            novelId: selectedNovel.id,
                            worldSetting: e.target.value
                          });
                          message.success({ content: '世界观背景设定已自动保存！', duration: 1.5 });
                        }}
                        rows={8}
                        placeholder="在此输入并修改小说世界观及规则设定..."
                        style={{ fontSize: 13 }}
                      />
                    )
                  },
                  {
                    key: 'c',
                    label: (
                      <Space>
                        <span>主角团</span>
                        <Button
                          size="small"
                          type="text"
                          style={{ fontSize: 11, color: '#d4b106', padding: '0 4px', height: 'auto' }}
                          icon={<RocketOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModifyField('characterSetting');
                            setIsModifyModalOpen(true);
                          }}
                        >
                          AI修改
                        </Button>
                      </Space>
                    ),
                    children: (
                      <TextArea
                        value={selectedOutline?.characterSetting}
                        onChange={e => {
                          if (selectedOutline) {
                            setSelectedOutline({ ...selectedOutline, characterSetting: e.target.value });
                          }
                        }}
                        onBlur={async e => {
                          if (!selectedNovel) return;
                          await httpService.post('/ai-novel/save-outline', {
                            novelId: selectedNovel.id,
                            characterSetting: e.target.value
                          });
                          message.success({ content: '主角团人设已自动保存！', duration: 1.5 });
                        }}
                        rows={8}
                        placeholder="在此输入并修改主要人物及角色设定..."
                        style={{ fontSize: 13 }}
                      />
                    )
                  },
                  {
                    key: 'sys',
                    label: '修仙与金手指',
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1890ff" }}>⚡ 战力境界与系统金手指看板</span>
                          <Space size={4}>
                            <Button
                              size="small"
                              icon={isAnalyzingSys ? <LoadingOutlined /> : <RocketOutlined />}
                              onClick={onAnalyzeSystemAndCultivation}
                              loading={isAnalyzingSys}
                            >
                              分析本章
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<CheckCircleFilled />}
                              onClick={() => onOpenBatchAnalyzeModal('sys')}
                            >
                              勾选多章分析
                            </Button>
                          </Space>
                        </div>

                        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                          <Card size="small" style={{ background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: 6 }} bodyStyle={{ padding: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#0050b3", fontWeight: 600 }}>🌟 主角当前突破修为：</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#096dd9", marginTop: 2 }}>
                                  {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.currentRealm || "暂未突破 / 练气期"}
                                </div>
                              </div>
                              {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.karmaPoints && (
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 11, color: "#d48806", fontWeight: 600 }}>⚡ 剩余因缘值：</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d46b08", marginTop: 2 }}>
                                    {selectedOutline.systemAndCultivationState.protagonistCultivation.karmaPoints}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>

                          {/* 随身关键道具/战利品 */}
                          {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.inventory && selectedOutline.systemAndCultivationState.protagonistCultivation.inventory.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>🎒 关键战利品与随身底牌：</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {selectedOutline.systemAndCultivationState.protagonistCultivation.inventory.map((item, idx) => (
                                  <Tag key={idx} color="gold" style={{ fontSize: 10, margin: 0 }}>
                                    {item}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="section-sub-title">已解锁金手指/系统功能：</div>
                          {(!selectedOutline?.systemAndCultivationState?.systemFeatures || selectedOutline.systemAndCultivationState.systemFeatures.length === 0) ? (
                            <div className="empty-sub-tip">
                              暂无系统功能记载，可在正文生成后点击上方按钮 AI 分析提取。
                            </div>
                          ) : (
                            selectedOutline.systemAndCultivationState.systemFeatures.map((feat, idx) => (
                              <div key={idx} className="cultivation-feat-card">
                                <div className="feat-header">
                                  <span className="feat-name">{feat.featureName}</span>
                                  <span className="feat-status-tag">{feat.status}</span>
                                </div>
                                <div className="feat-desc">{feat.description}</div>
                              </div>
                            ))
                          )}

                          {/* 活跃伏笔与线索追踪 */}
                          {selectedOutline?.systemAndCultivationState?.foreshadowingNotes && selectedOutline.systemAndCultivationState.foreshadowingNotes.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div className="section-foreshadow-title">🔍 活跃伏笔与悬念线索库：</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {selectedOutline.systemAndCultivationState.foreshadowingNotes.map((note, idx) => (
                                  <div key={idx} className="foreshadow-note-card">
                                    <div className="foreshadow-header">
                                      <span className="foreshadow-clue">{note.clue}</span>
                                      <Tag color={note.status === '已收束' ? 'default' : 'purple'} style={{ margin: 0, fontSize: 9 }}>
                                        {note.status || '待收束'}
                                      </Tag>
                                    </div>
                                    {note.plantedChapter && (
                                      <div className="foreshadow-chapter">
                                        📌 第 {note.plantedChapter} 章埋下
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'r',
                    label: '关系网',
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            style={{ background: '#d4b106', borderColor: '#d4b106', color: '#fff' }}
                            onClick={onStartAddRelationship}
                          >
                            手动补录
                          </Button>
                          <Space size={4}>
                            <Tooltip title={relSortAsc ? '当前按登场章节正序，点击倒序' : '当前倒序，点击切换正序'}>
                              <Button
                                size="small"
                                icon={relSortAsc ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                                onClick={() => setRelSortAsc(v => !v)}
                              />
                            </Tooltip>
                            <Button
                              size="small"
                              icon={isAnalyzingRel ? <LoadingOutlined /> : <RocketOutlined />}
                              onClick={onAnalyzeRelationships}
                              loading={isAnalyzingRel}
                            >
                              分析本章
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<CheckCircleFilled />}
                              onClick={() => onOpenBatchAnalyzeModal('rel')}
                            >
                              勾选多章分析
                            </Button>
                          </Space>
                        </div>

                        <div className="relationships-scroll-list" style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                          {(!selectedOutline?.characterRelationships || selectedOutline.characterRelationships.length === 0) ? (
                            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#ccc', fontSize: 12 }}>
                              暂无人物关系记录，可在正文生成后自动提取，或点击上方按钮手动录入。
                            </div>
                          ) : (() => {
                            const sortedAll = [...(selectedOutline.characterRelationships)].sort((a, b) => {
                              const aMax = Math.max(...(a.appearanceChapters || [0]));
                              const bMax = Math.max(...(b.appearanceChapters || [0]));
                              return relSortAsc ? aMax - bMax : bMax - aMax;
                            });
                            const activeList = sortedAll.filter(r => !isPastCharacter(r));
                            const pastList = sortedAll.filter(r => isPastCharacter(r));

                            const renderCard = (rel: CharacterRelationship, idx: number, isPast: boolean) => (
                              <Card
                                key={`${rel.name}-${idx}`}
                                size="small"
                                className={`relationship-card ${isPast ? 'is-past-character' : 'is-active-character'}`}
                                bodyStyle={{ padding: 10 }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span className="rel-name">{rel.name}</span>
                                    <span className={`rel-badge ${isPast ? 'past' : 'active'}`}>{rel.relationship}</span>
                                    {isPast && <Tag color="default" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>已退场/斩杀</Tag>}
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <Tooltip title={isPast ? "恢复为活跃人物" : "标记为过往/退场人物（AI 不再读取）"}>
                                      <Button
                                        size="small"
                                        type="text"
                                        icon={isPast ? <UserAddOutlined style={{ fontSize: 11, color: '#52c41a' }} /> : <UserDeleteOutlined style={{ fontSize: 11, color: '#fa8c16' }} />}
                                        onClick={() => onTogglePastStatus(rel.name)}
                                        style={{ width: 20, height: 20, padding: 0 }}
                                      />
                                    </Tooltip>
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<EditOutlined style={{ fontSize: 11, color: '#1890ff' }} />}
                                      onClick={() => onStartEditRelationship(rel)}
                                      style={{ width: 20, height: 20, padding: 0 }}
                                    />
                                    <Popconfirm
                                      title={`确定要删除人物 ${rel.name} 的关系记录吗？`}
                                      okText="确定"
                                      cancelText="取消"
                                      onConfirm={() => onDeleteRelationship(rel.name)}
                                    >
                                      <Button
                                        size="small"
                                        type="text"
                                        icon={<DeleteOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />}
                                        style={{ width: 20, height: 20, padding: 0 }}
                                      />
                                    </Popconfirm>
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: isPast ? '#94a3b8' : '#666', lineHeight: 1.5, marginBottom: 4 }}>
                                  {rel.description || '暂无特征/细节描述。'}
                                </div>
                                <div style={{ fontSize: 10, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>登场章节:</span>
                                  {rel.appearanceChapters && rel.appearanceChapters.map((num, i) => (
                                    <span key={i} style={{ background: isPast ? '#e2e8f0' : '#e6f7ff', color: isPast ? '#64748b' : '#1890ff', padding: '0 4px', borderRadius: 4 }}>
                                      #{num}
                                    </span>
                                  ))}
                                </div>
                              </Card>
                            );

                            return (
                              <>
                                {activeList.map((rel, idx) => renderCard(rel, idx, false))}
                                {pastList.length > 0 && (
                                  <div style={{ margin: '8px 0 2px', fontSize: 11, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>🪦 过往 / 退场人物 ({pastList.length})</span>
                                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'normal' }}>（置灰，AI 不再读取）</span>
                                  </div>
                                )}
                                {pastList.map((rel, idx) => renderCard(rel, idx, true))}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'mem',
                    label: (
                      <Space size={2}>
                        <span>🧠 记忆库</span>
                        {vectorMemories.length > 0 && <Badge count={vectorMemories.length} overflowCount={99} style={{ backgroundColor: '#722ed1', fontSize: 10, height: 16, lineHeight: '16px' }} />}
                      </Space>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#722ed1' }}>🧠 跨卷深层向量记忆库</span>
                          <Button
                            size="small"
                            icon={<RedoOutlined />}
                            onClick={fetchVectorMemories}
                            loading={loadingMemories}
                          >
                            刷新
                          </Button>
                        </div>

                        {/* 搜索与分类 */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Input.Search
                            size="small"
                            placeholder="语义搜索前尘伏笔/宗门秘史..."
                            value={memorySearchText}
                            onChange={e => setMemorySearchText(e.target.value)}
                            onSearch={fetchVectorMemories}
                            allowClear
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {[
                            { key: 'all', label: '全部' },
                            { key: 'lore', label: '🔮 设定' },
                            { key: 'item', label: '🎒 法宝' },
                            { key: 'clue', label: '🔍 伏笔' },
                            { key: 'event', label: '🏛️ 纪事' }
                          ].map(t => (
                            <Tag.CheckableTag
                              key={t.key}
                              checked={selectedMemoryType === t.key}
                              onChange={() => setSelectedMemoryType(t.key)}
                              style={{ fontSize: 11, padding: '0 6px', margin: 0 }}
                            >
                              {t.label}
                            </Tag.CheckableTag>
                          ))}
                        </div>

                        {/* 记忆列表 */}
                        <div style={{ maxHeight: 330, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {loadingMemories ? (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}><Spin size="small" tip="正在检索记忆库..." /></div>
                          ) : vectorMemories.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#ccc', fontSize: 12 }}>
                              暂无已沉淀的长程记忆切片。<br />章节正文生成后后台会自动提炼入库。
                            </div>
                          ) : (
                            vectorMemories.map(mem => (
                              <Card
                                key={mem.id}
                                size="small"
                                className="vector-memory-card"
                                bodyStyle={{ padding: 8 }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                                      {mem.memoryType === 'lore' ? '🔮 设定' : mem.memoryType === 'item' ? '🎒 奇物' : mem.memoryType === 'clue' ? '🔍 伏笔' : '🏛️ 纪事'}
                                    </Tag>
                                    <span className="mem-title">{mem.title}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {mem.chapterNumber ? (
                                      <span className="mem-chapter-badge">
                                        第 {mem.chapterNumber} 章
                                      </span>
                                    ) : null}
                                    <Popconfirm
                                      title="确定要从记忆库中删除该切片吗？"
                                      okText="删除"
                                      cancelText="取消"
                                      onConfirm={() => handleDeleteMemoryItem(mem.id)}
                                    >
                                      <Button
                                        size="small"
                                        type="text"
                                        icon={<DeleteOutlined style={{ fontSize: 10, color: '#ff4d4f' }} />}
                                        style={{ width: 18, height: 18, padding: 0 }}
                                      />
                                    </Popconfirm>
                                  </div>
                                </div>
                                <div className="mem-content">
                                  {mem.content}
                                </div>
                                {mem.entities && mem.entities.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                    {mem.entities.map((ent, idx) => (
                                      <Tag key={idx} className="mem-entity-tag">
                                        #{ent}
                                      </Tag>
                                    ))}
                                  </div>
                                )}
                              </Card>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorView;
