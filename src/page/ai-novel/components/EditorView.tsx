import React, { useState, useEffect, useMemo } from 'react';
import {
  Button, Space, Tooltip, Radio, Select, Card, Checkbox, Popconfirm, Badge,
  Spin, Popover, Input, Tag, Tabs, Table, Segmented, Progress, Modal, message
} from 'antd';
import {
  ArrowLeftOutlined, BookOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
  PicLeftOutlined, PicRightOutlined, FullscreenExitOutlined, FullscreenOutlined,
  RocketOutlined, CloudDownloadOutlined, DeleteOutlined, PlusOutlined, PlusCircleOutlined,
  SortAscendingOutlined, SortDescendingOutlined, InteractionOutlined, LoadingOutlined,
  HighlightOutlined, RedoOutlined, PlayCircleOutlined, CheckCircleFilled, UserAddOutlined,
  UserDeleteOutlined, EditOutlined, EyeOutlined, SaveOutlined, ReloadOutlined, StopOutlined,
  BranchesOutlined, RobotOutlined, BgColorsOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { Novel, NovelOutline, CharacterRelationship, VectorMemoryItem, PaperTheme, PromptLogItem, StoryArc, CriticReport, AgentNodeState, WildReaderFeedback } from '../types';
import { parseVolumeStructure, getChapterVolume, isPastCharacter } from '../utils/volumeParser';
import { PromptDetailModal } from '../modals/PromptDetailModal';
import { MultiAgentModal } from '../modals/MultiAgentModal';
import VirtualList from 'rc-virtual-list';
import { getGrowthSystemConfig } from '../utils/genreHelper';

const { TextArea } = Input;

interface EditorViewProps {
  isCruising?: boolean;
  cruiseTargetCount?: number;
  completedCount?: number;
  currentCruisingChapter?: number;
  cruiseStatusText?: string;
  openCruiseModal?: () => void;
  emergencyStop?: () => void;
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
  promptLogs: PromptLogItem[];
  setPromptLogs: React.Dispatch<React.SetStateAction<PromptLogItem[]>>;
  currentArc?: StoryArc | null;
  agentNodes?: Record<string, AgentNodeState>;
  criticReport?: CriticReport | null;
  wildReaderFeedback?: WildReaderFeedback | null;
  agentThoughts?: Array<{ agent: string; thought: string; timestamp?: string }>;
  useMultiAgent?: boolean;
  setUseMultiAgent?: (val: boolean) => void;
  isMultiAgentModalOpen?: boolean;
  setIsMultiAgentModalOpen?: (val: boolean) => void;
  novelList?: Novel[];
  loadNovelToEditor?: (novelId: number, chapterNum?: number) => Promise<void>;
  onRefreshNovels?: () => Promise<void>;
}

export const EditorView: React.FC<EditorViewProps> = ({
  isCruising = false,
  cruiseTargetCount = 3,
  completedCount = 0,
  currentCruisingChapter = 1,
  cruiseStatusText = '',
  openCruiseModal,
  emergencyStop,
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
  promptLogs,
  setPromptLogs,
  currentArc = null,
  agentNodes = {},
  criticReport = null,
  wildReaderFeedback = null,
  agentThoughts = [],
  useMultiAgent = true,
  setUseMultiAgent,
  isMultiAgentModalOpen: externalIsMultiAgentModalOpen,
  setIsMultiAgentModalOpen: externalSetIsMultiAgentModalOpen,
  novelList = [],
  loadNovelToEditor,
  onRefreshNovels,
}) => {
  const [activePromptLog, setActivePromptLog] = useState<PromptLogItem | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [promptLogScope, setPromptLogScope] = useState<'current' | 'all'>('current');
  const [localMultiAgentModalOpen, setLocalMultiAgentModalOpen] = useState<boolean>(false);
  const [isDerivingOutline, setIsDerivingOutline] = useState<boolean>(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchNameInput, setBranchNameInput] = useState<string>('重构实验版');
  const [isCloningBranch, setIsCloningBranch] = useState<boolean>(false);

  // 识别当前小说及其派生实验分支
  const novelBranches = useMemo(() => {
    if (!selectedNovel || !novelList || novelList.length === 0) return [];
    const currentBaseTitle = selectedNovel.title.replace(/（[^）]*版[^）]*）/g, '').trim();
    return novelList.filter(n => {
      const base = n.title.replace(/（[^）]*版[^）]*）/g, '').trim();
      return base === currentBaseTitle;
    });
  }, [selectedNovel, novelList]);

  const handleCreateBranch = async () => {
    if (!selectedNovel || !branchNameInput.trim() || isCloningBranch) return;
    setIsCloningBranch(true);
    const hideLoading = message.loading(`🌿 正在派生沙盒实验分支《${branchNameInput.trim()}》...`, 0);
    try {
      const res: any = await httpService.post('/ai-novel/branch-clone', {
        sourceNovelId: selectedNovel.id,
        branchName: branchNameInput.trim(),
        inheritOutlines: false
      });
      hideLoading();
      if (res && res.code === 200 && res.data) {
        message.success(res.msg || '🎉 分支创建成功！');
        setIsBranchModalOpen(false);
        setBranchNameInput('重构实验版');
        if (onRefreshNovels) await onRefreshNovels();
        if (loadNovelToEditor) await loadNovelToEditor(res.data.novelId, 1);
      } else {
        throw new Error(res?.msg || '派生分支失败');
      }
    } catch (e: any) {
      hideLoading();
      console.error(e);
      message.error('创建分支失败: ' + (e.message || e));
    } finally {
      setIsCloningBranch(false);
    }
  };

  const handleDeriveOutline = async () => {
    if (!selectedNovel || !activeChapterNum || isDerivingOutline) return;
    setIsDerivingOutline(true);
    const hideLoading = message.loading(`🔮 正在基于前文真实物理落盘正文动态推导第 ${activeChapterNum} 章大纲...`, 0);
    try {
      const res: any = await httpService.post('/ai-novel/derive-next-outline', {
        novelId: selectedNovel.id,
        targetChapterNumber: activeChapterNum,
        userIntervention: intervention || ''
      });
      hideLoading();
      if (res && res.code === 200 && res.data) {
        const derived = res.data;
        if (selectedOutline) {
          const list = [...selectedOutline.chaptersOutline];
          const idx = list.findIndex(c => Number(c.chapterNumber) === Number(activeChapterNum));
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...derived };
          } else {
            list.push(derived);
            list.sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
          }
          setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
        }
        message.success(res.msg || `🎉 第 ${activeChapterNum} 章细纲动态推导成功！`);
      } else {
        throw new Error(res?.msg || '推导大纲失败');
      }
    } catch (e: any) {
      hideLoading();
      console.error(e);
      message.error('动态推导大纲失败：' + (e.message || e));
    } finally {
      setIsDerivingOutline(false);
    }
  };

  const isMultiAgentModalOpen = externalIsMultiAgentModalOpen !== undefined ? externalIsMultiAgentModalOpen : localMultiAgentModalOpen;
  const setIsMultiAgentModalOpen = externalSetIsMultiAgentModalOpen || setLocalMultiAgentModalOpen;

  // 保持 MultiAgent 模态框默认关闭，仅由用户手动点击相关按钮触发打开

  const fetchPromptLogs = (chapNum?: number) => {
    if (!selectedNovel?.id) return;
    const url = chapNum
      ? `/ai-novel/prompt-logs?novelId=${selectedNovel.id}&chapterNumber=${chapNum}&limit=100`
      : `/ai-novel/prompt-logs?novelId=${selectedNovel.id}&limit=200`;
    httpService.get(url)
      .then((res: any) => {
        if (res.code === 200 && Array.isArray(res.data)) {
          if (chapNum) {
            setPromptLogs(prev => {
              // 替换当前章节的日志为最新从后端获取的列表，保留其他章节日志
              const otherLogs = (prev || []).filter(p => Number(p.chapterNumber) !== Number(chapNum));
              return [...res.data, ...otherLogs].sort((a, b) => (b.id || 0) - (a.id || 0));
            });
          } else {
            setPromptLogs(res.data);
          }
        }
      })
      .catch((err: any) => {
        console.error('获取 Prompt 轨迹失败:', err);
      });
  };

  const handleClearPromptLogs = async () => {
    if (!selectedNovel?.id) return;
    const isCurrent = promptLogScope === 'current' && activeChapterNum;
    try {
      await httpService.post('/ai-novel/clear-prompt-logs', {
        novelId: selectedNovel.id,
        chapterNumber: isCurrent ? activeChapterNum : undefined,
      });
      message.success(isCurrent ? `已清空第 ${activeChapterNum} 章的 Prompt 轨迹` : '已清空全书的 Prompt 轨迹');
      if (isCurrent) {
        setPromptLogs(prev => (prev || []).filter(p => Number(p.chapterNumber) !== Number(activeChapterNum)));
      } else {
        setPromptLogs([]);
      }
    } catch (e: any) {
      message.error('清空 Prompt 轨迹失败: ' + (e.message || e));
    }
  };

  useEffect(() => {
    fetchPromptLogs();
  }, [selectedNovel?.id]);

  const currentChapterPromptLogs = useMemo(() => {
    if (!promptLogs || !Array.isArray(promptLogs)) return [];
    if (!activeChapterNum) return promptLogs;
    return promptLogs.filter((log: PromptLogItem) => Number(log.chapterNumber) === Number(activeChapterNum));
  }, [promptLogs, activeChapterNum]);

  const displayedPromptLogs = useMemo(() => {
    if (promptLogScope === 'current' && activeChapterNum) {
      return currentChapterPromptLogs;
    }
    return promptLogs || [];
  }, [promptLogs, currentChapterPromptLogs, promptLogScope, activeChapterNum]);

  // 🌲 卷结构与章节筛选记忆化，杜绝正文输入时重复正则解析与重排
  const volumeInfo = useMemo(() => {
    return parseVolumeStructure(selectedOutline?.mainLine || '');
  }, [selectedOutline?.mainLine]);

  const filteredChapters = useMemo(() => {
    let list = (selectedOutline?.chaptersOutline || []).filter(chap => {
      if (!volumeInfo.parsed || selectedVolumeNum === null) return true;
      const chapVol = getChapterVolume(chap.chapterNumber, volumeInfo.volumes);
      return chapVol.volumeNumber === selectedVolumeNum;
    });
    if (!chapterSortAsc) {
      list = [...list].reverse();
    }
    return list;
  }, [selectedOutline?.chaptersOutline, volumeInfo, selectedVolumeNum, chapterSortAsc]);

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInputValue, setTitleInputValue] = React.useState('');
  const [popoverRenameNum, setPopoverRenameNum] = React.useState<number | null>(null);
  const [popoverRenameValue, setPopoverRenameValue] = React.useState('');
  const debounceSaveRef = React.useRef<any>(null);
  const isDirtyRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    isDirtyRef.current = false;
  }, [activeChapterNum]);

  const getCleanChapterTitle = (chap: any) => {
    if (!chap || !chap.title) return `第${chap?.chapterNumber || ''}章`;
    const num = chap.chapterNumber;
    const numPattern = new RegExp(`^第\\s*${num}\\s*章[\\s:：·—\\-]*`, 'i');
    const clean = chap.title.replace(numPattern, '').trim();
    return clean || chap.title;
  };

  const handleChapterClick = (targetChNum: number) => {
    if (Number(targetChNum) === Number(activeChapterNum)) return;
    flushSave(false);
    onSelectChapter(targetChNum);
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

  const [localContent, setLocalContent] = React.useState<string>(chapterContent || '');
  const isTypingRef = React.useRef<boolean>(false);
  const typingTimerRef = React.useRef<any>(null);

  // 当外部 chapterContent 变动且用户未在连续打字时（如换章、AI生成流式更新等），同步到本地状态
  React.useEffect(() => {
    if (!isTypingRef.current) {
      setLocalContent(chapterContent || '');
    }
  }, [chapterContent]);

  // 当 activeChapterNum 切换时强制重置本地状态与脏标记
  React.useEffect(() => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    isTypingRef.current = false;
    isDirtyRef.current = false;
    setLocalContent(chapterContent || '');
  }, [activeChapterNum]);

  const flushSave = React.useCallback((showToast: boolean = false) => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    isTypingRef.current = false;
    if (isDirtyRef.current) {
      setChapterContent(localContent);
      if (onSaveChapterContent && !isCruising) {
        onSaveChapterContent(showToast);
      }
      isDirtyRef.current = false;
    } else if (showToast && onSaveChapterContent) {
      onSaveChapterContent(true);
    }
  }, [localContent, setChapterContent, onSaveChapterContent, isCruising]);

  const handleTextChange = (newVal: string) => {
    isDirtyRef.current = true;
    isTypingRef.current = true;
    setLocalContent(newVal);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 1000);

    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    debounceSaveRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        setChapterContent(newVal);
        if (onSaveChapterContent && !isCruising) {
          onSaveChapterContent(false);
          isDirtyRef.current = false;
        }
      }
    }, 1200);
  };

  if (!selectedNovel) return null;

  const safeOutline = {
    ...selectedOutline,
    theme: selectedOutline?.theme || '',
    worldSetting: selectedOutline?.worldSetting || '',
    characterSetting: selectedOutline?.characterSetting || '',
    mainLine: selectedOutline?.mainLine || '',
    chaptersOutline: Array.isArray(selectedOutline?.chaptersOutline) ? selectedOutline!.chaptersOutline : [],
    characterRelationships: Array.isArray(selectedOutline?.characterRelationships) ? selectedOutline!.characterRelationships : [],
    systemAndCultivationState: selectedOutline?.systemAndCultivationState || {},
    storyArcs: Array.isArray(selectedOutline?.storyArcs) ? selectedOutline!.storyArcs : []
  };

  const editorGrowthConfig = getGrowthSystemConfig(
    (selectedNovel as any)?.category || (selectedNovel as any)?.genre || safeOutline.theme || ''
  );

  const currentChapter = (safeOutline.chaptersOutline || []).find((c: any) => parseInt(c.chapterNumber, 10) === parseInt(activeChapterNum as any, 10));

  const handleTextSelect = () => {
    if (textRef.current) {
      const start = textRef.current.selectionStart;
      const end = textRef.current.selectionEnd;
      if (start !== end) {
        const text = localContent.substring(start, end);
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
        <div className="novel-main-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{color: '#d4b106', flexShrink: 0}} />
          <span className="title-text">《{selectedNovel.title.replace(/（[^）]*版[^）]*）/g, '').trim()}》</span>
          <span className="category-tag">{selectedNovel.category}</span>

          {novelBranches.length > 0 && (
            <div style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BranchesOutlined style={{ color: '#10b981', fontSize: 13 }} />
              <Select
                size="small"
                value={selectedNovel.id}
                style={{ minWidth: 170 }}
                onChange={(val) => {
                  if (val === -1) {
                    setIsBranchModalOpen(true);
                  } else if (loadNovelToEditor && val !== selectedNovel.id) {
                    loadNovelToEditor(Number(val));
                  }
                }}
                dropdownMatchSelectWidth={false}
              >
                {novelBranches.map(b => {
                  const match = b.title.match(/（([^）]*版[^）]*)）/);
                  const branchLabel = match ? match[1] : '正式版';
                  const isCurrent = b.id === selectedNovel.id;
                  return (
                    <Select.Option key={b.id} value={b.id}>
                      <Space size={6}>
                        <Tag color={branchLabel.includes('实验') || branchLabel.includes('重构') ? 'purple' : 'green'} style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 4px' }}>
                          {branchLabel}
                        </Tag>
                        <span style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400 }}>
                          ID:{b.id} ({b.totalChapters || b.crawledChapters || 0}章)
                        </span>
                      </Space>
                    </Select.Option>
                  );
                })}
                <Select.Option value={-1}>
                  <span style={{ color: '#1890ff', fontSize: 12 }}>+ 派生新实验分支...</span>
                </Select.Option>
              </Select>
            </div>
          )}
        </div>
        <Space className="top-bar-actions">
          <Popover
            trigger="click"
            placement="bottomRight"
            title={<span style={{ fontWeight: 700, fontSize: 13 }}>🎨 阅读与排版设置</span>}
            content={
              <div style={{ width: 250, padding: '4px 0' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>护眼阅读主题</div>
                  <Radio.Group
                    value={paperTheme}
                    onChange={e => setPaperTheme(e.target.value as any)}
                    size="small"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
                  >
                    <Radio.Button value="light" style={{ textAlign: 'center' }}>极简白</Radio.Button>
                    <Radio.Button value="paper" style={{ textAlign: 'center' }}>羊皮纸</Radio.Button>
                    <Radio.Button value="mint" style={{ textAlign: 'center' }}>薄荷绿</Radio.Button>
                    <Radio.Button value="dark" style={{ textAlign: 'center' }}>🌑 暗夜黑</Radio.Button>
                  </Radio.Group>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>正文字号大小</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6 }}>
                    <Button size="small" onClick={() => setFontSize(prev => Math.max(12, prev - 2))}>A- 缩小</Button>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#d4b106' }}>{fontSize}px</span>
                    <Button size="small" onClick={() => setFontSize(prev => Math.min(28, prev + 2))}>A+ 放大</Button>
                  </div>
                </div>
              </div>
            }
          >
            <Tooltip title="点击展开阅读主题与字号设置">
              <Button
                icon={<BgColorsOutlined />}
                ghost
                style={{ borderColor: 'rgba(212, 177, 6, 0.4)', color: '#d4b106' }}
              >
                排版设置
              </Button>
            </Tooltip>
          </Popover>
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
            <div className="tree-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Button
                  size="small"
                  onClick={() => {
                    if (checkedChapters.length === (safeOutline.chaptersOutline?.length || 0)) {
                      setCheckedChapters([]);
                    } else {
                      setCheckedChapters((safeOutline.chaptersOutline || []).map((c: any) => c.chapterNumber));
                    }
                  }}
                  style={{ fontSize: 11, padding: '0 6px', height: 22, background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#93c5fd' }}
                >
                  {checkedChapters.length === (safeOutline.chaptersOutline?.length || 0) && (safeOutline.chaptersOutline?.length || 0) > 0 ? '取消全选' : '全选'}
                </Button>
                <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>已选 {checkedChapters.length} 章</span>
              </div>
              <Space size={4}>
                <Button
                  size="small"
                  type="primary"
                  danger
                  disabled={checkedChapters.length === 0}
                  onClick={onConfirmBatchDelete}
                  style={{ fontSize: 11, padding: '0 8px', height: 22 }}
                >
                  确认删除
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsDeleteMode(false);
                    setCheckedChapters([]);
                  }}
                  style={{ background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#cbd5e1', fontSize: 11, padding: '0 8px', height: 22 }}
                >
                  取消
                </Button>
              </Space>
            </div>
          ) : (
            <div className="tree-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>章节管理</span>
              <Space size={4}>
                {openCruiseModal && (
                  <Tooltip
                    title={
                      (isCruising || isGenerating)
                        ? '🚀 正在连写创作中，点击查看像素小人协同界面'
                        : '🚀 全自动连写巡航 (AI 无人值守连续撰写多章)'
                    }
                  >
                    <Button
                      size="small"
                      icon={<RocketOutlined spin={isCruising || isGenerating} />}
                      onClick={() => {
                        if (isCruising || isGenerating) {
                          setIsMultiAgentModalOpen(true);
                        } else {
                          openCruiseModal();
                        }
                      }}
                      style={{
                        background: (isCruising || isGenerating) ? 'rgba(82, 196, 26, 0.15)' : 'transparent',
                        color: (isCruising || isGenerating) ? '#52c41a' : '#1890ff',
                        borderColor: (isCruising || isGenerating) ? '#52c41a' : 'rgba(24, 144, 255, 0.4)'
                      }}
                    />
                  </Tooltip>
                )}
                <Tooltip title="🌿 智能剧情批量拆章规划">
                  <Button
                    size="small"
                    icon={<BranchesOutlined />}
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
                    onClick={() => {
                      setChapterSortAsc(v => {
                        const next = !v;
                        localStorage.setItem('novel_chapter_sort_asc', String(next));
                        return next;
                      });
                    }}
                    style={{ background: 'transparent', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}
                  />
                </Tooltip>
              </Space>
            </div>
          )}
          {(() => {
            if (filteredChapters.length === 0) {
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
                    <div style={{ textAlign: 'center', padding: '30px 12px', color: '#94a3b8' }}>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>该分卷下暂无章节</div>
                      <Button size="small" type="dashed" onClick={() => setSelectedVolumeNum(null)}>
                        显示全部章节
                      </Button>
                    </div>
                  </div>
                </>
              );
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
                  {filteredChapters.map(chap => {
                    const chapVol = getChapterVolume(chap.chapterNumber, volumeInfo.volumes);
                    return (
                      <div
                        key={chap.chapterNumber}
                        className={`tree-item ${Number(chap.chapterNumber) === Number(activeChapterNum) ? 'active' : ''}`}
                        onClick={() => {
                          if (isDeleteMode) {
                            toggleCheckChapter(chap.chapterNumber);
                          } else {
                            handleChapterClick(chap.chapterNumber);
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
                              {popoverRenameNum === chap.chapterNumber ? (
                                <Popover
                                  trigger="click"
                                  open={true}
                                  onOpenChange={(visible) => {
                                    if (!visible) setPopoverRenameNum(null);
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
                              ) : (
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
                              )}
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
                  })}
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
                  <span>字数统计: {localContent.length} 字</span>
                  {isGenerating && (
                    <span
                      className="speed-stats"
                      style={{ marginLeft: 15, color: '#389e0d', cursor: 'pointer' }}
                      onClick={() => setIsMultiAgentModalOpen(true)}
                      title="点击查看像素小人协同界面"
                    >
                      <LoadingOutlined /> 生成中: {writingSpeed}字/秒 (👾 点击查看小人)
                    </span>
                  )}
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => flushSave(true)}
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

            {/* 🚀 全自动连写巡航极简磨砂横条 (36px Slim Bar) */}
            {isCruising && (
              <div
                className="cruise-slim-bar"
                style={{
                  height: 38,
                  minHeight: 38,
                  maxHeight: 38,
                  background: 'rgba(30, 41, 59, 0.85)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#e2e8f0',
                  padding: '0 12px',
                  borderRadius: 6,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  flexShrink: 0,
                  width: '100%'
                }}
              >
                {/* 左侧：微标 + 状态信息（单行严格防折行） */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  flexShrink: 1,
                  minWidth: 0
                }}>
                  <Tag
                    color="purple"
                    onClick={() => setIsMultiAgentModalOpen(true)}
                    title="点击查看像素小人协同界面"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 12,
                      lineHeight: '20px',
                      height: 22,
                      padding: '0 7px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}
                  >
                    <RocketOutlined spin />
                    全自动连写 (点击查看)
                  </Tag>

                  <Tag
                    color="blue"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 12,
                      lineHeight: '20px',
                      height: 22,
                      padding: '0 7px',
                      borderRadius: 4,
                      flexShrink: 0
                    }}
                  >
                    第 {currentCruisingChapter} 章
                  </Tag>

                  <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                    进度: <b style={{ color: '#ffd591' }}>{Math.min(cruiseTargetCount || 1, (completedCount || 0) + 1)}</b> / {cruiseTargetCount} 章
                  </span>

                  <span style={{
                    fontSize: 12,
                    color: '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    opacity: 0.9
                  }}>
                    {cruiseStatusText || '流水线处理中...'}
                  </span>

                  {writingSpeed > 0 && (
                    <span style={{ fontSize: 11, color: '#52c41a', flexShrink: 0, fontWeight: 600 }}>
                      ⚡ {writingSpeed} 字/秒
                    </span>
                  )}
                </div>

                {/* 右侧：微型进度条 + 迷你急停按钮 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexShrink: 0,
                  marginLeft: 12
                }}>
                  <Progress
                    percent={Math.round(((completedCount || 0) / Math.max(1, cruiseTargetCount || 1)) * 100)}
                    size="small"
                    style={{ width: 80, margin: 0 }}
                    strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
                    trailColor="rgba(255, 255, 255, 0.15)"
                    showInfo={false}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 28, textAlign: 'right' }}>
                    {Math.round(((completedCount || 0) / Math.max(1, cruiseTargetCount || 1)) * 100)}%
                  </span>
                  <Button
                    size="small"
                    type="link"
                    icon={<RobotOutlined />}
                    onClick={() => setIsMultiAgentModalOpen(true)}
                    style={{ color: '#63b3ed', padding: '0 4px', fontSize: 11, fontWeight: 600 }}
                  >
                    Agent 面板
                  </Button>
                  {emergencyStop && (
                    <Button
                      danger
                      type="primary"
                      size="small"
                      icon={<StopOutlined />}
                      onClick={emergencyStop}
                      style={{
                        height: 24,
                        fontSize: 12,
                        padding: '0 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: '22px'
                      }}
                    >
                      停止
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isGenerating && chapterContent.length === 0 ? (
              <div className="writing-loading-state" style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
                <div style={{ marginTop: 14, color: '#999', fontSize: 13 }}>AI 正在凝神构思，铺展墨水...</div>
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
                    value={localContent}
                    readOnly={isCruising}
                    onChange={e => handleTextChange(e.target.value)}
                    onBlur={() => flushSave(false)}
                    onMouseUp={handleTextSelect}
                    onKeyUp={handleTextSelect}
                    onSelect={handleTextSelect}
                    className="inkwell-textarea"
                    style={{ fontSize: `${fontSize}px` }}
                    placeholder={
                      isCruising
                        ? (activeChapterNum === currentCruisingChapter
                            ? "🚀 全自动连写巡航正在流式撰写中，请勿手动编辑..."
                            : `🚀 正在后台连写巡航第 ${currentCruisingChapter} 章，当前以只读模式查阅第 ${activeChapterNum} 章...`)
                        : "如果您处于[待写]状态，可在此处编写，或在右侧配置突发剧情干预，然后点击下方【召唤 AI 智能撰写章节正文】..."
                    }
                  />
                </Popover>
              </div>
            )}

            <div className="paper-action-bar">
              {currentChapter?.status === 'completed' ? (
                <Space wrap size={[8, 10]} style={{ width: '100%', justifyContent: 'center' }}>
                  <Select
                    value={wordCountLimit}
                    onChange={setWordCountLimit}
                    style={{ minWidth: 160 }}
                    className="word-limit-select"
                    popupClassName="word-limit-popup"
                  >
                    <Select.Option value={0}>不限字数 (剧情自由发挥)</Select.Option>
                    <Select.Option value={1500}>1500 字</Select.Option>
                    <Select.Option value={2000}>2000 字</Select.Option>
                    <Select.Option value={2500}>2500 字</Select.Option>
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
                          const txt = localContent.substring(start, end);
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
                    disabled={isGenerating || !localContent.trim()}
                    onClick={() => onDeslopContent && onDeslopContent()}
                    icon={<span>✨</span>}
                  >
                    深度去 AI 味 (7 Gate)
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (isGenerating || isCruising) {
                        setIsMultiAgentModalOpen(true);
                      } else {
                        onContinueWriting();
                      }
                    }}
                    loading={loading && !isGenerating}
                  >
                    {isGenerating || isCruising ? '👾 写作中 (点击查看小人)' : 'AI 一键续写'}
                  </Button>
                  <Button
                    icon={<RedoOutlined />}
                    danger={!isGenerating && !isCruising}
                    onClick={() => {
                      if (isGenerating || isCruising) {
                        setIsMultiAgentModalOpen(true);
                        return;
                      }
                      onWriteChapterStream(false);
                    }}
                  >
                    {isGenerating || isCruising ? '👾 写作中 (点击查看小人)' : '重写当前章'}
                  </Button>
                </Space>
              ) : (
                <div style={{width: '100%'}}>
                  {isCruising ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '6px 0', gap: 12 }}>
                      <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={() => setIsMultiAgentModalOpen(true)}
                        style={{
                          background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                          borderColor: '#722ed1',
                          fontWeight: 600,
                          borderRadius: 6
                        }}
                      >
                        👾 像素小人协同监控
                      </Button>
                      <Tag
                        color="purple"
                        style={{ fontSize: 13, padding: '4px 12px', margin: 0, borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setIsMultiAgentModalOpen(true)}
                        title="点击查看像素小人协同界面"
                      >
                        <RocketOutlined spin /> 全自动连写巡航中 (第 {currentCruisingChapter} 章)
                      </Tag>
                      {emergencyStop && (
                        <Button
                          type="primary"
                          danger
                          size="middle"
                          icon={<StopOutlined />}
                          onClick={emergencyStop}
                          style={{ borderRadius: 6, fontWeight: 600 }}
                        >
                          🛑 停止巡航
                        </Button>
                      )}
                    </div>
                  ) : isGenerating ? (
                    <div style={{ display: 'flex', gap: 12, width: '100%', flexWrap: 'wrap' }}>
                      <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        style={{
                          background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                          borderColor: '#722ed1',
                          fontWeight: 600,
                          flex: 1
                        }}
                        size="large"
                        onClick={() => setIsMultiAgentModalOpen(true)}
                      >
                        👾 查看像素小人协同界面
                      </Button>
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
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Select
                        value={wordCountLimit}
                        onChange={setWordCountLimit}
                        style={{ width: 170 }}
                        className="word-limit-select"
                        popupClassName="word-limit-popup"
                      >
                        <Select.Option value={0}>不限字数 (剧情自由发挥)</Select.Option>
                        <Select.Option value={1500}>1500 字</Select.Option>
                        <Select.Option value={2000}>2000 字</Select.Option>
                        <Select.Option value={2500}>2500 字(默认)</Select.Option>
                        <Select.Option value={3000}>3000 字</Select.Option>
                        <Select.Option value={4000}>4000 字</Select.Option>
                        <Select.Option value={5000}>5000 字</Select.Option>
                      </Select>
                      {isPaused || (localContent && localContent.trim().length > 30) ? (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            style={{
                              height: 38,
                              padding: '0 18px',
                              borderRadius: 6,
                              background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                              borderColor: '#722ed1',
                              fontWeight: 600
                            }}
                            onClick={() => {
                              if (isGenerating || isCruising) {
                                setIsMultiAgentModalOpen(true);
                                return;
                              }
                              onWriteChapterStream(true);
                            }}
                            className="btn-trigger-ai"
                          >
                            ▶️ 断点继续生成 ({localContent.trim().length}字起)
                          </Button>
                          <Button
                            danger
                            icon={<RedoOutlined />}
                            style={{ height: 38, padding: '0 14px', borderRadius: 6 }}
                            onClick={() => {
                              setIsPaused(false);
                              onWriteChapterStream(false);
                            }}
                          >
                            放弃并从头重写
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          style={{ height: 38, padding: '0 22px', borderRadius: 6 }}
                          onClick={() => {
                            if (isGenerating || isCruising) {
                              setIsMultiAgentModalOpen(true);
                              return;
                            }
                            onWriteChapterStream(false);
                          }}
                          className="btn-trigger-ai"
                        >
                          {isGenerating || isCruising ? '👾 写作中，点击查看像素小人协同界面' : '🖋️ 召唤 AI 智能撰写章节正文'}
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
                  <Space size={4}>
                    <Tooltip title="基于上一章真实落盘结尾与当前人物状态，动态推导/自愈本章细纲">
                      <Button
                        size="small"
                        type="link"
                        icon={<ThunderboltOutlined />}
                        loading={isDerivingOutline}
                        style={{ color: '#1890ff', padding: '0 4px', fontSize: '12px' }}
                        onClick={handleDeriveOutline}
                      >
                        动态推导
                      </Button>
                    </Tooltip>
                    <Button
                      size="small"
                      type="link"
                      icon={<FullscreenOutlined />}
                      style={{ color: '#d4b106', padding: 0 }}
                      onClick={() => onOpenManualEdit('outline', '本章细纲剧情要求', currentChapter?.outline || '')}
                    />
                  </Space>
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
              className="prompt-trajectory-card"
              title={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Space size="small">
                      <span>🧭 AI 调用与 Prompt 轨迹</span>
                      <Badge
                        count={displayedPromptLogs.length}
                        overflowCount={999}
                        style={{ backgroundColor: promptLogScope === 'current' ? '#1890ff' : '#52c41a' }}
                      />
                    </Space>
                    <Space size={4}>
                      <Button
                        size="small"
                        type="link"
                        icon={<ReloadOutlined />}
                        style={{ color: '#d4b106', padding: 0 }}
                        title="刷新 Prompt 轨迹"
                        onClick={() => fetchPromptLogs(promptLogScope === 'current' ? activeChapterNum : undefined)}
                      />
                      <Popconfirm
                        title={promptLogScope === 'current' && activeChapterNum ? `确定清空第 ${activeChapterNum} 章的所有 Prompt 轨迹吗？` : '确定清空全书的所有 Prompt 轨迹吗？'}
                        onConfirm={handleClearPromptLogs}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          size="small"
                          type="link"
                          icon={<DeleteOutlined />}
                          style={{ color: '#ff4d4f', padding: 0 }}
                          title={promptLogScope === 'current' && activeChapterNum ? `清空第 ${activeChapterNum} 章 Prompt 轨迹` : '清空全书 Prompt 轨迹'}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                  <Segmented
                    size="small"
                    value={promptLogScope}
                    onChange={(val) => setPromptLogScope(val as 'current' | 'all')}
                    options={[
                      {
                        label: activeChapterNum ? `第 ${activeChapterNum} 章 (${currentChapterPromptLogs.length})` : '当前章',
                        value: 'current',
                      },
                      {
                        label: `全部 (${promptLogs?.length || 0})`,
                        value: 'all',
                      },
                    ]}
                    block
                  />
                </div>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              {displayedPromptLogs.length === 0 ? (
                <div className="prompt-trail-empty">
                  <div className="prompt-trail-empty-text">
                    {promptLogScope === 'current' && activeChapterNum
                      ? `第 ${activeChapterNum} 章暂无 AI 轨迹`
                      : '暂无 Prompt 轨迹记录'}
                  </div>
                  {promptLogScope === 'current' && activeChapterNum ? (
                    <Space size="small">
                      <Button
                        size="small"
                        type="link"
                        style={{ fontSize: 11, padding: 0 }}
                        onClick={() => setPromptLogScope('all')}
                      >
                        查看全书所有轨迹
                      </Button>
                      <span className="prompt-trail-divider">|</span>
                      <Button
                        size="small"
                        type="link"
                        style={{ fontSize: 11, padding: 0 }}
                        onClick={() => fetchPromptLogs(activeChapterNum)}
                      >
                        检索本章
                      </Button>
                    </Space>
                  ) : null}
                </div>
              ) : (
                <div className="prompt-trail-list-wrapper">
                  <div className="prompt-trail-list-header">
                    <span>步骤名称与时间</span>
                    <span>详情</span>
                  </div>
                  <VirtualList
                    data={displayedPromptLogs}
                    height={320}
                    itemHeight={52}
                    itemKey={(item: PromptLogItem) => String(item.id || Math.random())}
                  >
                    {(record: PromptLogItem) => (
                      <div
                        key={record.id}
                        className="prompt-trail-list-item"
                      >
                        <div className="prompt-trail-item-main">
                          <div className="prompt-trail-item-title-row">
                            <span className={`prompt-trail-item-title ${record.status === 'error' ? 'is-error' : ''}`}>
                              {record.stepName || 'AI 调用'}
                            </span>
                            {record.status === 'error' && (
                              <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, flexShrink: 0 }}>
                                失败
                              </Tag>
                            )}
                            {record.chapterNumber && (
                              <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, flexShrink: 0 }}>
                                第 {record.chapterNumber} 章
                              </Tag>
                            )}
                          </div>
                          <div className="prompt-trail-item-meta">
                            {record.createdAt || ''}
                            {record.durationMs ? ` · ${(record.durationMs / 1000).toFixed(1)}s` : ''}
                          </div>
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          style={{ fontSize: 11, padding: '0 8px', height: 22, flexShrink: 0 }}
                          onClick={() => {
                            setActivePromptLog(record);
                            setIsPromptModalOpen(true);
                          }}
                        >
                          详情
                        </Button>
                      </div>
                    )}
                  </VirtualList>
                </div>
              )}
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
                        <span>👤 主角人设规范</span>
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
                          message.success({ content: '主角人设与言行规范已自动保存！', duration: 1.5 });
                        }}
                        rows={8}
                        placeholder={`在此输入主角核心人设与言行规范（与世界观同等地位）：\n【核心性格】：...\n【对外说话风格与口癖】：（如：极度诚挚直球、不玩现代流行语）\n【战斗获胜/降维打击时】：（如：从容从武道逻辑指出对手负担，绝不油腻装逼）\n【绝对严禁行为与OOC红线】：（如：严禁现代都市网梗口水话）`}
                        style={{ fontSize: 13 }}
                      />
                    )
                  },
                  {
                    key: 'sys',
                    label: editorGrowthConfig.tabLabel,
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1890ff" }}>{editorGrowthConfig.headerTitle}</span>
                          <Space size={4}>
                            <Button
                              size="small"
                              icon={isAnalyzingSys ? <LoadingOutlined /> : <RocketOutlined />}
                              onClick={onAnalyzeSystemAndCultivation}
                              loading={isAnalyzingSys}
                            >
                              {editorGrowthConfig.buttonAnalyzeSingle}
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<CheckCircleFilled />}
                              onClick={() => onOpenBatchAnalyzeModal('sys')}
                            >
                              {editorGrowthConfig.buttonAnalyzeBatch}
                            </Button>
                          </Space>
                        </div>

                        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                          <Card size="small" style={{ background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: 6 }} bodyStyle={{ padding: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#0050b3", fontWeight: 600 }}>{editorGrowthConfig.levelFieldLabel}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#096dd9", marginTop: 2 }}>
                                  {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.currentRealm || editorGrowthConfig.levelDefaultValue}
                                </div>
                              </div>
                              {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.karmaPoints && (
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 11, color: "#d48806", fontWeight: 600 }}>{editorGrowthConfig.pointsLabel}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d46b08", marginTop: 2 }}>
                                    {selectedOutline.systemAndCultivationState.protagonistCultivation.karmaPoints}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>

                          {/* 随身关键道具/战利品/政策抓手 */}
                          {Boolean(safeOutline.systemAndCultivationState?.protagonistCultivation?.inventory && safeOutline.systemAndCultivationState.protagonistCultivation.inventory.length > 0) && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>{editorGrowthConfig.inventoryLabel}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {(safeOutline.systemAndCultivationState?.protagonistCultivation?.inventory || []).map((item, idx) => (
                                  <Tag key={idx} color="gold" style={{ fontSize: 10, margin: 0 }}>
                                    {item}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="section-sub-title">{editorGrowthConfig.featuresCardTitle}：</div>
                          {(!safeOutline.systemAndCultivationState?.systemFeatures || safeOutline.systemAndCultivationState.systemFeatures.length === 0) ? (
                            <div className="empty-sub-tip">
                              {editorGrowthConfig.featuresEmptyTip}
                            </div>
                          ) : (
                            (safeOutline.systemAndCultivationState.systemFeatures || []).map((feat, idx) => (
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
                          {Boolean(safeOutline.systemAndCultivationState?.foreshadowingNotes && safeOutline.systemAndCultivationState.foreshadowingNotes.length > 0) && (
                            <div style={{ marginTop: 6 }}>
                              <div className="section-foreshadow-title">🔍 活跃伏笔与悬念线索库：</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(safeOutline.systemAndCultivationState.foreshadowingNotes || []).map((note, idx) => (
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
                          {safeOutline.characterRelationships.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#ccc', fontSize: 12 }}>
                              暂无人物关系记录，可在正文生成后自动提取，或点击上方按钮手动录入。
                            </div>
                          ) : (() => {
                            const relList = safeOutline.characterRelationships;
                            const sortedAll = [...relList].sort((a, b) => {
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
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                              <Spin size="small" />
                              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>正在检索记忆库...</div>
                            </div>
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
      <PromptDetailModal
        open={isPromptModalOpen}
        onCancel={() => {
          setIsPromptModalOpen(false);
          setActivePromptLog(null);
        }}
        log={activePromptLog}
        paperTheme={paperTheme}
      />
      <MultiAgentModal
        open={isMultiAgentModalOpen}
        onCancel={() => setIsMultiAgentModalOpen(false)}
        currentArc={currentArc}
        currentChapterNum={activeChapterNum}
        agentNodes={agentNodes}
        criticReport={criticReport}
        wildReaderFeedback={wildReaderFeedback}
        agentThoughts={agentThoughts}
        isGenerating={isGenerating || !!isCruising}
        onStartWrite={() => onWriteChapterStream(false)}
      />
      <Modal
        title={<span>🌿 派生沙盒实验分支</span>}
        open={isBranchModalOpen}
        onOk={handleCreateBranch}
        onCancel={() => setIsBranchModalOpen(false)}
        confirmLoading={isCloningBranch}
        okText="创建沙盒分支"
        cancelText="取消"
        width={460}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            将基于《{selectedNovel.title.replace(/（[^）]*版[^）]*）/g, '').trim()}》当前设定克隆一个独立的沙盒副本。500章宏观主线与世界观人设完整继承，原版正文不受任何影响。
          </p>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>实验分支名称：</div>
          <Input
            value={branchNameInput}
            onChange={e => setBranchNameInput(e.target.value)}
            placeholder="例如：重构实验版、去AI味精炼版"
            maxLength={30}
          />
        </div>
      </Modal>
    </div>
  );
};

export default EditorView;
