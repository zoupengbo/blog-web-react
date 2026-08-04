import React, { useState, useEffect, useRef } from 'react';
import { Spin, Modal, message, notification } from 'antd';
import httpService from '../../common/request';
import './styles.scss';

// 导入类型与工具
import { Idea, ChapterOutline, CharacterRelationship, NovelOutline, Novel } from './types';
import { parseVolumeStructure, getChapterVolume, isPastCharacter } from './utils/volumeParser';

// 导入 View 视图组件
import { NovelListView } from './components/NovelListView';
import { IdeaView } from './components/IdeaView';
import { OutlineView } from './components/OutlineView';
import { EditorView } from './components/EditorView';

// 导入 Modal / Drawer 弹窗组件
import { ConfigDrawer } from './modals/ConfigDrawer';
import { BatchChaptersModal } from './modals/BatchChaptersModal';
import { SuggestPlotModal } from './modals/SuggestPlotModal';
import { FanqiePublishModal } from './modals/FanqiePublishModal';
import { AiModifyModal } from './modals/AiModifyModal';
import { RelationshipModal } from './modals/RelationshipModal';
import { ManualEditModal } from './modals/ManualEditModal';
import { BackgroundSettingsModal } from './modals/BackgroundSettingsModal';
import { BatchAnalyzeModal } from './modals/BatchAnalyzeModal';
import { InsertChapterModal } from './modals/InsertChapterModal';

const AiNovelDashboard: React.FC = () => {
  const getProtagonistName = () => {
    if (!selectedOutline?.characterSetting) return '主角';
    const match = selectedOutline.characterSetting.match(/(?:主角|男主|女主)\s*[:：]\s*([^\s,，。;；()（）]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '主角';
  };

  // 全局视图状态: 'list' | 'idea' | 'outline' | 'editor'
  const [view, setView] = useState<'list' | 'idea' | 'outline' | 'editor'>('list');
  const [loading, setLoading] = useState<boolean>(false);
  const [novels, setNovels] = useState<Novel[]>([]);

  // 选中的小说信息
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const EMPTY_OUTLINE: NovelOutline = { chaptersOutline: [], characterRelationships: [], systemAndCultivationState: {}, theme: '', worldSetting: '', characterSetting: '', mainLine: '' };
  const [selectedOutline, setSelectedOutline] = useState<NovelOutline>(EMPTY_OUTLINE);

  // 1. 灵感广场状态
  const [category, setCategory] = useState<string>('修真玄幻');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [tone, setTone] = useState<string[]>(['热血爽文']);
  const [keywords, setKeywords] = useState<string>('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [chosenIdea, setChosenIdea] = useState<Idea | null>(null);

  // 2. 大纲架构状态
  const [draftOutline, setDraftOutline] = useState<NovelOutline | null>(null);

  // 3. 沉浸写作工坊状态
  const [activeChapterNum, setActiveChapterNum] = useState<number>(1);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [intervention, setIntervention] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [writingSpeed, setWritingSpeed] = useState<number>(0); // token/s
  const [fontSize, setFontSize] = useState<number>(16);
  const [paperTheme, setPaperTheme] = useState<'light' | 'paper' | 'mint'>('light');
  const [suggestingPlot, setSuggestingPlot] = useState<boolean>(false);

  // 番茄小说发布状态
  const [fanqieModalOpen, setFanqieModalOpen] = useState<boolean>(false);
  const [fanqieBookId, setFanqieBookId] = useState<string>('');
  const [fanqieBookName, setFanqieBookName] = useState<string>('');
  const [isPublishingToFanqie, setIsPublishingToFanqie] = useState<boolean>(false);
  const [selectedPublishChapters, setSelectedPublishChapters] = useState<number[]>([]);
  const [syncSelectMode, setSyncSelectMode] = useState<'manual' | 'range'>('manual');
  const [syncRangeStart, setSyncRangeStart] = useState<number | null>(null);
  const [syncRangeEnd, setSyncRangeEnd] = useState<number | null>(null);
  const publishPollRef = useRef<any>(null);

  // 创意卡片在线编辑状态
  const [editingIdeaIndex, setEditingIdeaIndex] = useState<number | null>(null);

  // AI 修改设定及主线沙盘状态
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(false);
  const [modifyField, setModifyField] = useState<'worldSetting' | 'mainLine' | 'characterSetting'>('worldSetting');
  const [modifyReqs, setModifyReqs] = useState<string>('');
  const [modifyLoading, setModifyLoading] = useState<boolean>(false);
  const [modifyResult, setModifyResult] = useState<string>('');

  // 分卷选择状态
  const [selectedVolumeNum, setSelectedVolumeNum] = useState<number | null>(null);
  // 章节列表排序：true=正序，false=倒序
  const [chapterSortAsc, setChapterSortAsc] = useState<boolean>(true);
  // 关系网列表排序：true=正序，false=倒序
  const [relSortAsc, setRelSortAsc] = useState<boolean>(true);

  // 放大手动修改设定/大纲状态
  const [isManualEditModalOpen, setIsManualEditModalOpen] = useState<boolean>(false);
  const [manualEditField, setManualEditField] = useState<string>('worldSetting');
  const [manualEditTitle, setManualEditTitle] = useState<string>('');
  const [manualEditValue, setManualEditValue] = useState<string>('');

  // 整体放大背景设定 Modal 状态
  const [isBackgroundSettingsModalOpen, setIsBackgroundSettingsModalOpen] = useState<boolean>(false);

  // 人物关系状态
  const [isAnalyzingRel, setIsAnalyzingRel] = useState<boolean>(false);
  const [isAnalyzingSys, setIsAnalyzingSys] = useState<boolean>(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState<boolean>(false);
  const [editingRel, setEditingRel] = useState<CharacterRelationship | null>(null);
  const [newRelName, setNewRelName] = useState<string>('');
  const [newRelRelationship, setNewRelRelationship] = useState<string>('');
  const [newRelDescription, setNewRelDescription] = useState<string>('');
  const [newRelAppearance, setNewRelAppearance] = useState<string>('');
  const [newRelIsPast, setNewRelIsPast] = useState<boolean>(false);
  const [activeRelNode, setActiveRelNode] = useState<CharacterRelationship | null>(null);

  // 全屏专注、字数限制与智能批量拆章状态
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [wordCountLimit, setWordCountLimit] = useState<number>(2500);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [checkedChapters, setCheckedChapters] = useState<number[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState<boolean>(false);
  const [plotDirection, setPlotDirection] = useState<string>('');
  const [batchChapterCount, setBatchChapterCount] = useState<number>(1);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchGenerateMode, setBatchGenerateMode] = useState<'append' | 'overwrite'>('append');
  const [rightWidth, setRightWidth] = useState<number>(380);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [renamingChapter, setRenamingChapter] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // AI 剧情建议与审核报告 Modal 状态
  const [suggestPlotModalOpen, setSuggestPlotModalOpen] = useState<boolean>(false);
  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [suggestedPlotData, setSuggestedPlotData] = useState<{
    suggestion: string;
    auditMessage: string;
    hasCorrected?: boolean;
  }>({ suggestion: '', auditMessage: '', hasCorrected: false });

  // 批量勾选章节分析 Modal 状态
  const [isBatchAnalyzeModalVisible, setIsBatchAnalyzeModalVisible] = useState<boolean>(false);
  const [batchAnalyzeSelectedChapters, setBatchAnalyzeSelectedChapters] = useState<number[]>([]);
  const [batchAnalyzeTypes, setBatchAnalyzeTypes] = useState<string[]>(['sys', 'rel']);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  // 智能插章 Modal 状态
  const [isInsertModalOpen, setIsInsertModalOpen] = useState<boolean>(false);
  const [insertAfterChapterNum, setInsertAfterChapterNum] = useState<number>(0);
  const [insertUserInstruction, setInsertUserInstruction] = useState<string>('');
  const [isInsertingChapter, setIsInsertingChapter] = useState<boolean>(false);

  // 协同创作高级功能状态
  const [selectedText, setSelectedText] = useState<string>('');
  const [polishInstruction, setPolishInstruction] = useState<string>('');
  const [polishedResult, setPolishedResult] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [polishing, setPolishing] = useState<boolean>(false);
  const [showPolishPop, setShowPolishPop] = useState<boolean>(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // 模型配置 Drawer 状态
  const [configDrawerOpen, setConfigDrawerOpen] = useState<boolean>(false);
  const [apiConfig, setApiConfig] = useState<any>({
    apiKey: '',
    baseUrl: '',
    modelName: '',
    temperature: 0.7,
    maxTokens: 8192
  });
  const [testingConfig, setTestingConfig] = useState<boolean>(false);

  // SSE 流生成章节 Reader
  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  const extractChapterContent = (value: any): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    if (typeof value.content === 'string') return value.content;
    if (typeof value.data?.content === 'string') return value.data.content;
    return '';
  };

  useEffect(() => {
    fetchNovels();
    fetchConfig();

    const lastNovelId = localStorage.getItem('last_selected_novel_id');
    const lastChNum = localStorage.getItem('last_active_chapter_num');
    if (lastNovelId) {
      const nid = parseInt(lastNovelId);
      const ch = lastChNum ? parseInt(lastChNum) : undefined;
      loadNovelToEditor(nid, ch);
    }

    return () => {
      if (publishPollRef.current) {
        clearInterval(publishPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (selectedOutline) {
      const volInfo = parseVolumeStructure(selectedOutline.mainLine || '');
      if (volInfo.parsed && volInfo.volumes.length > 0) {
        const activeVol = getChapterVolume(activeChapterNum, volInfo.volumes);
        setSelectedVolumeNum(activeVol.volumeNumber);
      } else {
        setSelectedVolumeNum(1);
      }
    }
  }, [activeChapterNum, selectedOutline]);

  // AI 设定智能修改
  const handleAiModifySetting = async () => {
    if (!modifyReqs.trim()) {
      message.warning('请输入您的修改期望');
      return;
    }
    setModifyLoading(true);
    try {
      const currentContent = view === 'outline'
        ? (draftOutline ? draftOutline[modifyField] : '')
        : (selectedOutline ? selectedOutline[modifyField] : '');

      const res: any = await httpService.post('/ai-novel/modify-setting', {
        fieldType: modifyField,
        currentContent,
        requirements: modifyReqs,
        novelId: selectedNovel?.id
      });

      const modifiedText = typeof res.data === 'string'
        ? res.data
        : (res.data?.modifiedContent || res.data?.[modifyField] || '');

      if (res.code === 200 && modifiedText) {
        setModifyResult(modifiedText);
        message.success('AI 修改生成成功，请预览并确认！');
      } else {
        message.error(res.msg || '修改生成失败');
      }
    } catch (err: any) {
      message.error('智能修改设定发生异常: ' + (err.message || '网络或接口故障'));
    } finally {
      setModifyLoading(false);
    }
  };

  const handleApplyModifySetting = async () => {
    if (view === 'outline' && draftOutline) {
      const updated = { ...draftOutline, [modifyField]: modifyResult };
      setDraftOutline(updated);
      message.success('已采用 AI 修改设定（建档确认后将正式保存）');
    } else if (view === 'editor' && selectedOutline && selectedNovel) {
      const updated = { ...selectedOutline, [modifyField]: modifyResult };
      setSelectedOutline(updated);
      try {
        await httpService.post('/ai-novel/save-outline', {
          novelId: selectedNovel.id,
          [modifyField]: modifyResult
        });
        message.success('已采用 AI 修改并自动保存成功！');
      } catch (err: any) {
        message.error('保存设定失败: ' + err.message);
      }
    }
    setIsModifyModalOpen(false);
    setModifyReqs('');
    setModifyResult('');
  };

  const handleOpenManualEdit = (field: string, title: string, value: string) => {
    setManualEditField(field);
    setManualEditTitle(title);
    setManualEditValue(value || '');
    setIsManualEditModalOpen(true);
  };

  const handleSaveManualEdit = async () => {
    if (manualEditField.startsWith('outline_')) {
      const idx = parseInt(manualEditField.split('_')[1], 10);
      if (view === 'outline' && draftOutline) {
        const list = [...draftOutline.chaptersOutline];
        if (list[idx]) {
          list[idx].outline = manualEditValue;
          setDraftOutline({ ...draftOutline, chaptersOutline: list });
          message.success('已保存章节细纲');
        }
      }
      setIsManualEditModalOpen(false);
      return;
    }

    const typedField = manualEditField as 'worldSetting' | 'mainLine' | 'characterSetting' | 'outline' | 'intervention';

    if (view === 'outline' && draftOutline) {
      if (typedField === 'worldSetting' || typedField === 'mainLine' || typedField === 'characterSetting') {
        const updated = { ...draftOutline, [typedField]: manualEditValue };
        setDraftOutline(updated);
        message.success(`已保存${manualEditTitle}（建档确认后将正式保存）`);
      }
    } else if (view === 'editor' && selectedOutline && selectedNovel) {
      if (typedField === 'intervention') {
        setIntervention(manualEditValue);
        const list = [...selectedOutline.chaptersOutline];
        const current = list.find(c => c.chapterNumber === activeChapterNum);
        if (current) {
          current.interventionPrompt = manualEditValue;
          setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
          try {
            await httpService.post('/ai-novel/save-outline', {
              novelId: selectedNovel.id,
              chaptersOutline: list
            });
            message.success('情节插手/突发干预内容修改并自动保存成功！');
          } catch (err: any) {
            message.error('自动保存情节插手失败: ' + err.message);
          }
        }
      } else if (typedField === 'outline') {
        const list = [...selectedOutline.chaptersOutline];
        const current = list.find(c => c.chapterNumber === activeChapterNum);
        if (current) {
          current.outline = manualEditValue;
          setSelectedOutline({ ...selectedOutline, chaptersOutline: list });
          try {
            await httpService.post('/ai-novel/save-outline', {
              novelId: selectedNovel.id,
              chaptersOutline: list
            });
            message.success('本章细纲内容修改并自动保存成功！');
          } catch (err: any) {
            message.error('保存细纲失败: ' + err.message);
          }
        }
      } else {
        const updated = { ...selectedOutline, [typedField]: manualEditValue };
        setSelectedOutline(updated);
        try {
          await httpService.post('/ai-novel/save-outline', {
            novelId: selectedNovel.id,
            [typedField]: manualEditValue
          });
          message.success(`${manualEditTitle}修改并自动保存成功！`);
        } catch (err: any) {
          message.error('保存设定失败: ' + err.message);
        }
      }
    }
    setIsManualEditModalOpen(false);
  };

  const handleAnalyzeSystemAndCultivation = async () => {
    if (!selectedNovel || !activeChapterNum || !chapterContent.trim()) {
      message.warning("当前章节正文内容为空，无法提取修仙/系统状态");
      return;
    }
    setIsAnalyzingSys(true);
    try {
      const res: any = await httpService.post("/ai-novel/analyze-system-cultivation", {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum,
        chapterContent
      });
      if (res.code === 200 && res.data) {
        const newState = res.data.systemAndCultivationState || res.data;
        if (selectedOutline) {
          setSelectedOutline({
            ...selectedOutline,
            systemAndCultivationState: newState
          });
        }
        message.success("修仙境界与金手指功能分析成功并已自动更新！");
      } else {
        message.error(res.msg || "分析提取修仙/系统状态失败");
      }
    } catch (err: any) {
      message.error("分析修仙/系统状态发生异常: " + err.message);
    } finally {
      setIsAnalyzingSys(false);
    }
  };

  const handleAnalyzeRelationships = async () => {
    if (!selectedNovel || !activeChapterNum || !chapterContent.trim()) {
      message.warning('当前章节正文内容为空，无法提取人物关系');
      return;
    }
    setIsAnalyzingRel(true);
    try {
      const res: any = await httpService.post('/ai-novel/analyze-relationships', {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum,
        chapterContent
      });
      if (res.code === 200 && res.data?.characterRelationships) {
        if (selectedOutline) {
          setSelectedOutline({
            ...selectedOutline,
            characterRelationships: res.data.characterRelationships
          });
        }
        message.success('人物关系分析提取成功并已自动更新！');
      } else {
        message.error(res.msg || '分析提取人物关系失败');
      }
    } catch (err: any) {
      message.error('分析人物关系发生异常: ' + err.message);
    } finally {
      setIsAnalyzingRel(false);
    }
  };

  const handleTogglePastStatus = async (relName: string) => {
    if (!selectedOutline || !selectedOutline.characterRelationships) return;
    const updatedList = selectedOutline.characterRelationships.map(r => {
      if (r.name === relName) {
        const currentPast = isPastCharacter(r);
        return { ...r, isPast: !currentPast };
      }
      return r;
    });
    await handleSaveRelationships(updatedList);
  };

  const handleSaveRelationships = async (updatedList: CharacterRelationship[]) => {
    if (!selectedNovel || !selectedOutline) return;
    try {
      setSelectedOutline({
        ...selectedOutline,
        characterRelationships: updatedList
      });
      await httpService.post('/ai-novel/save-outline', {
        novelId: selectedNovel.id,
        characterRelationships: updatedList
      });
      message.success('人物关系网保存成功');
    } catch (err: any) {
      message.error('保存人物关系失败: ' + err.message);
    }
  };

  const handleDeleteRelationship = (name: string) => {
    const list = (selectedOutline?.characterRelationships || []).filter(r => r.name !== name);
    handleSaveRelationships(list);
    if (activeRelNode?.name === name) {
      setActiveRelNode(null);
    }
  };

  const handleStartEditRelationship = (rel: CharacterRelationship) => {
    setEditingRel(rel);
    setNewRelName(rel.name);
    setNewRelRelationship(rel.relationship);
    setNewRelDescription(rel.description);
    setNewRelAppearance(rel.appearanceChapters.join(', '));
    setNewRelIsPast(isPastCharacter(rel));
    setIsRelModalOpen(true);
  };

  const handleStartAddRelationship = () => {
    setEditingRel(null);
    setNewRelName('');
    setNewRelRelationship('');
    setNewRelDescription('');
    setNewRelAppearance(`${activeChapterNum}`);
    setNewRelIsPast(false);
    setIsRelModalOpen(true);
  };

  const handleAddOrEditRelationshipSubmit = () => {
    if (!newRelName.trim() || !newRelRelationship.trim()) {
      message.warning('人物姓名与人物关系不能为空');
      return;
    }

    const chaps = newRelAppearance
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    const newEntry: CharacterRelationship = {
      name: newRelName.trim(),
      relationship: newRelRelationship.trim(),
      description: newRelDescription.trim(),
      appearanceChapters: chaps.length > 0 ? chaps : [activeChapterNum],
      isPast: newRelIsPast
    };

    let list = [...(selectedOutline?.characterRelationships || [])];
    if (editingRel) {
      list = list.map(r => r.name === editingRel.name ? newEntry : r);
      if (activeRelNode?.name === editingRel.name) {
        setActiveRelNode(newEntry);
      }
    } else {
      if (list.some(r => r.name === newEntry.name)) {
        message.error('该人物已存在关系记录，请选择编辑！');
        return;
      }
      list.push(newEntry);
    }

    handleSaveRelationships(list);
    setIsRelModalOpen(false);
    setEditingRel(null);
    setNewRelName('');
    setNewRelRelationship('');
    setNewRelDescription('');
    setNewRelAppearance('');
  };

  const toggleFullScreen = () => {
    const nextVal = !isFullScreen;
    setIsFullScreen(nextVal);
    if (nextVal) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => {
          console.warn("请求网页全屏被拒绝或失败:", err);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn("退出网页全屏失败:", err);
        });
      }
    }
  };

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const res: any = await httpService.get(`/ai-novel/list?_t=${Date.now()}`);
      if (res.code === 200) {
        const rawData = res.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.data || []);
        setNovels(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res: any = await httpService.get('/ai-novel/config');
      if (res.code === 200 && res.data) {
        setApiConfig(res.data);
      }
    } catch (e) {}
  };

  const handleGenerateIdeas = async () => {
    setLoading(true);
    setIdeas([]);
    try {
      const activeCategory = category === 'custom' ? customCategory : category;
      if (!activeCategory.trim()) {
        message.warning('请提供小说类型！');
        setLoading(false);
        return;
      }
      if (!tone || tone.length === 0) {
        message.warning('请选择或输入至少一个整体故事基调！');
        setLoading(false);
        return;
      }
      const res: any = await httpService.post('/ai-novel/generate-idea', {
        category: activeCategory,
        tone: tone.join('、'),
        keywords
      });
      if (res.code === 200) {
        const mapped = (res.data || []).map((item: any) => ({
          title: item.title || '',
          concept: item.logline || item.concept || '',
          protagonist: item.protagonist || '',
          goldLine: item.coreGoldenFinger || item.goldLine || '',
          summary: Array.isArray(item.mainSellingPoints)
            ? item.mainSellingPoints.join('；')
            : (item.mainSellingPoints || item.summary || ''),
        }));
        setIdeas(mapped);
        message.success('灵感捕捉成功！');
      } else {
        message.error(res.msg || '灵感生成失败');
      }
    } catch (e: any) {
      message.error(e.message || '网络连接故障');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEditIdea = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (editingIdeaIndex === index) {
      setEditingIdeaIndex(null);
      message.success('脑洞创意修改已暂存！可随时架构大纲。');
    } else {
      setEditingIdeaIndex(index);
    }
  };

  const handleBuildOutline = async (idea: Idea) => {
    setChosenIdea(idea);
    setLoading(true);
    try {
      const activeCategory = category === 'custom' ? customCategory : category;
      const resOutline: any = await httpService.post('/ai-novel/generate-outline', {
        title: idea.title,
        category: activeCategory,
        logline: idea.concept,
        coreGoldenFinger: idea.goldLine,
        mainSellingPoints: idea.summary,
      });

      if (resOutline.code !== 200) {
        message.error('生成大纲设定失败');
        return;
      }

      const rawOutline = resOutline.data;

      const worldSettingStr = (() => {
        const w = rawOutline.worldSetting;
        if (!w) return '';
        if (typeof w === 'string') return w;
        const labelMap: Record<string, string> = { background: '世界背景', realmSystem: '境界体系', coreRules: '核心规则' };
        return Object.entries(w)
          .map(([k, v]) => `【${labelMap[k] || k}】${v}`)
          .join('\n\n');
      })();

      const characterSettingStr = (() => {
        const c = rawOutline.characterSetting;
        if (!c) return '';
        if (typeof c === 'string') return c;
        const lines: string[] = [];
        if (c.protagonist) {
          const p = c.protagonist;
          lines.push(`【主角】${p.name || ''}`);
          if (p.identity) lines.push(`身份：${p.identity}`);
          if (p.personality) lines.push(`性格：${p.personality}`);
          if (p.goldenFinger) lines.push(`金手指：${p.goldenFinger}`);
        }
        if (Array.isArray(c.keySupporting) && c.keySupporting.length > 0) {
          lines.push('');
          lines.push('【重要配角/反派】');
          c.keySupporting.forEach((s: any) => {
            lines.push(`${s.name || ''}（${s.roleType || s.identity || ''}）：${s.description || ''}`);
          });
        }
        return lines.join('\n');
      })();

      const mainLineStr = (() => {
        const m = rawOutline.mainPlot || rawOutline.mainLine;
        if (!m) return '';
        if (typeof m === 'string') return m;
        const labelMap: Record<string, string> = { openingHook: '开局爆点', mainConflict: '核心矛盾', climaxEvents: '高潮大事件' };
        return Object.entries(m)
          .map(([k, v]) => `【${labelMap[k] || k}】${Array.isArray(v) ? '\n' + (v as string[]).map((e, i) => `${i + 1}. ${e}`).join('\n') : v}`)
          .join('\n\n');
      })();

      const fullOutline: NovelOutline = {
        theme: rawOutline.theme || '',
        worldSetting: worldSettingStr,
        characterSetting: characterSettingStr,
        mainLine: mainLineStr,
        chaptersOutline: []
      };
      setDraftOutline(fullOutline);
      setView('outline');
      message.success('小说设定大纲架构完毕！您可以在正式建档后自由创建和规划章节。');
    } catch (e: any) {
      message.error(e.message || '网络请求错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndCreateNovel = async () => {
    if (!draftOutline || !chosenIdea) return;
    setLoading(true);
    try {
      const activeCategory = category === 'custom' ? customCategory : category;
      const res: any = await httpService.post('/ai-novel/create', {
        title: chosenIdea.title,
        author: 'AI 笔墨工坊',
        category: activeCategory,
        logline: chosenIdea.concept,
        description: chosenIdea.concept,
        theme: draftOutline.theme,
        worldSetting: draftOutline.worldSetting,
        characterSetting: draftOutline.characterSetting,
        mainLine: draftOutline.mainLine,
        chaptersOutline: draftOutline.chaptersOutline,
        chapters: draftOutline.chaptersOutline
      });

      if (res.code === 200 && res.data) {
        message.success(`《${chosenIdea.title}》已成功建档并列入创作库！`);
        fetchNovels();
        const targetId = res.data.novelId || res.data.id;
        loadNovelToEditor(targetId);
      } else {
        message.error('建档失败');
      }
    } catch (e: any) {
      message.error(e.message || '数据入库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExitEditor = () => {
    localStorage.removeItem('last_selected_novel_id');
    localStorage.removeItem('last_active_chapter_num');
    setSelectedNovel(null);
    setSelectedOutline(EMPTY_OUTLINE);
    setView('list');
  };

  const loadNovelToEditor = async (novelId: number, targetChapterNum?: number) => {
    setLoading(true);
    try {
      const res: any = await httpService.get(`/ai-novel/detail/${novelId}?_t=${Date.now()}`);
      if (res.code === 200 && res.data && res.data.novel) {
        setSelectedNovel(res.data.novel);
        setSelectedOutline(res.data.outline || EMPTY_OUTLINE);
        localStorage.setItem('last_selected_novel_id', String(novelId));

        const chOutline = res.data.outline?.chaptersOutline || [];
        const firstPending = chOutline.find((c: any) => c.status === 'pending');
        const activeNum = targetChapterNum || (firstPending ? firstPending.chapterNumber : 1);

        setActiveChapterNum(activeNum);
        localStorage.setItem('last_active_chapter_num', String(activeNum));

        const activeChapter = chOutline.find((c: any) => c.chapterNumber === activeNum);
        setIntervention(activeChapter?.interventionPrompt || '');

        await loadChapterContent(novelId, activeNum);

        const savedBookId = localStorage.getItem(`fanqie_book_id_${novelId}`) || '';
        const savedBookName = localStorage.getItem(`fanqie_book_name_${novelId}`) || '';
        setFanqieBookId(savedBookId);
        setFanqieBookName(savedBookName || res.data.novel.title);

        setView('editor');
      } else {
        localStorage.removeItem('last_selected_novel_id');
        localStorage.removeItem('last_active_chapter_num');
        setSelectedNovel(null);
        setSelectedOutline(EMPTY_OUTLINE);
        setView('list');
        message.error('该小说不存在或已被删除，已为您返回创作列表');
      }
    } catch (e: any) {
      localStorage.removeItem('last_selected_novel_id');
      localStorage.removeItem('last_active_chapter_num');
      setSelectedNovel(null);
      setSelectedOutline(EMPTY_OUTLINE);
      setView('list');
      message.error('获取小说详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadChapterContent = async (novelId: number, chNum: number) => {
    setChapterContent('');
    try {
      const resContent: any = await httpService.get(`/ai-novel/chapter-content?novelId=${novelId}&chapterNumber=${chNum}&_t=${Date.now()}`);
      if (resContent.code === 200 && resContent.data) {
        const text = extractChapterContent(resContent.data);
        setChapterContent(text);
        if (text && text.trim()) {
          setSelectedOutline((prev: any) => {
            if (!prev || !prev.chaptersOutline) return prev;
            return {
              ...prev,
              chaptersOutline: prev.chaptersOutline.map((c: any) =>
                parseInt(c.chapterNumber, 10) === parseInt(chNum as any, 10)
                  ? { ...c, status: 'completed', wordCount: text.length }
                  : c
              )
            };
          });
        }
      } else {
        setChapterContent('');
      }
    } catch (e) {
      setChapterContent('');
    }
  };

  const handleSelectChapter = async (chNum: number) => {
    if (isGenerating) {
      message.warning('大模型正在书写中，请勿切换章节！');
      return;
    }
    setActiveChapterNum(chNum);
    localStorage.setItem('last_active_chapter_num', String(chNum));

    if (selectedOutline) {
      const currentChapter = selectedOutline.chaptersOutline.find(c => c.chapterNumber === chNum);
      setIntervention(currentChapter?.interventionPrompt || '');
    }
    if (selectedNovel) {
      await loadChapterContent(selectedNovel.id, chNum);
    }
  };

  const handleWriteChapterStream = async (isResume = false) => {
    if (!selectedNovel || isGenerating) return;
    const shouldResume = isResume === true;

    setIsGenerating(true);
    setIsPaused(false);
    if (!shouldResume) {
      setChapterContent('');
    }
    setWritingSpeed(0);
    const startTime = Date.now();
    let tokenCount = 0;
    let hasStreamError = false;

    try {
      const response = await fetch('/api/ai-novel/generate-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          novelId: selectedNovel.id,
          chapterNumber: activeChapterNum,
          interventionPrompt: intervention,
          wordCountLimit: wordCountLimit,
          existingContent: shouldResume ? chapterContent : ''
        })
      });

      if (!response.ok) {
        try {
          const errData = await response.json();
          throw new Error(errData.msg || errData.error || '启动流式写入失败，请检查 API 配置');
        } catch (e: any) {
          throw new Error(e.message || '启动流式写入失败，请检查网络或配置');
        }
      }

      const reader = response.body?.getReader();
      if (!reader) return;
      streamReaderRef.current = reader;
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let currentEvent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { currentEvent = ''; continue; }

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.substring(7).trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              if (data.error) {
                message.error({
                  content: data.error,
                  key: 'auditor_status',
                  duration: 5
                });
                hasStreamError = true;
                setIsGenerating(false);
                return;
              }

              if (data.statusType === 'llm_fail_query') {
                try {
                  message.destroy('auditor_status');
                } catch (e) {}

                Modal.confirm({
                  title: '🤖 自动审核异常拦截',
                  content: (
                    <div>
                      <p style={{ fontWeight: 'bold', color: '#fa8c16' }}>{data.statusMsg}</p>
                      <p style={{ marginTop: 8 }}>您可以选择：</p>
                      <p>1. <b>继续审核 (重试)</b>：尝试重新调用大模型继续完成审核与纠偏。</p>
                      <p>2. <b>跳过审核 (直接保存)</b>：不再进行审核，直接将当前已写好的正文保存入库。</p>
                    </div>
                  ),
                  okText: '继续审核 (重试)',
                  cancelText: '跳过审核 (直接保存)',
                  onOk: async () => {
                    try {
                      await httpService.post('/ai-novel/audit-decision', {
                        novelId: data.novelId,
                        chapterNumber: data.chapterNumber,
                        action: 'retry'
                      });
                      message.loading({
                        content: '已发送指令，正在重新尝试调用大模型审核...',
                        key: 'auditor_status',
                        duration: 0
                      });
                    } catch (e: any) {
                      message.error('发送决策指令失败: ' + (e.message || e));
                    }
                  },
                  onCancel: async () => {
                    try {
                      await httpService.post('/ai-novel/audit-decision', {
                        novelId: data.novelId,
                        chapterNumber: data.chapterNumber,
                        action: 'skip'
                      });
                      message.loading({
                        content: '已跳过本次审核，正在安全保存章节...',
                        key: 'auditor_status',
                        duration: 2
                      });
                    } catch (e: any) {
                      message.error('发送决策指令失败: ' + (e.message || e));
                    }
                  }
                });
                continue;
              }

              if ((currentEvent === 'chunk' || (!currentEvent && data.text)) && (data.text || data.content)) {
                const textChunk = data.text || data.content;
                setChapterContent(prev => prev + textChunk);
                tokenCount += textChunk.length;
                const duration = (Date.now() - startTime) / 1000;
                if (duration > 0.5) {
                  setWritingSpeed(Math.round(tokenCount / duration));
                }
              } else if (!currentEvent && data.content) {
                setChapterContent(prev => prev + data.content);
                tokenCount += data.content.length;
                const duration = (Date.now() - startTime) / 1000;
                if (duration > 0.5) {
                  setWritingSpeed(Math.round(tokenCount / duration));
                }
              }

              if (data.message || data.statusMsg) {
                const statusText = (data.message || data.statusMsg) as string;
                console.log('[🤖 Auditor Status]', statusText);
                const isSuccess = statusText.includes('✅') || statusText.includes('🎉');
                const isWarning = statusText.includes('⚠️');

                const safeCloseNotification = (key: string) => {
                  try {
                    if (typeof (notification as any).destroy === 'function') {
                      (notification as any).destroy(key);
                    } else if (typeof (notification as any).close === 'function') {
                      (notification as any).close(key);
                    }
                  } catch (e) {
                    console.warn('Close notification failed:', e);
                  }
                };

                const isAuditRound = statusText.includes('第') && statusText.includes('轮');

                if (isSuccess) {
                  safeCloseNotification('auditor_warning_report');
                  safeCloseNotification('auditor_round_progress');
                  message.success({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 5
                  });
                  notification.success({
                    key: 'auditor_round_progress',
                    message: '✅ 章节审核通过',
                    description: statusText,
                    duration: 4,
                    placement: 'topRight'
                  });
                } else if (isWarning) {
                  message.warning({
                    content: '⚠️ 发现问题，正在自动精修...',
                    key: 'auditor_status',
                    duration: 5
                  });
                  notification.warning({
                    key: 'auditor_warning_report',
                    message: '🤖 审核未通过 · 正在自动精修',
                    description: statusText,
                    duration: 0,
                    placement: 'topRight',
                    style: { width: 550, whiteSpace: 'pre-wrap' }
                  });
                } else if (isAuditRound) {
                  message.loading({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 0
                  });
                  notification.open({
                    key: 'auditor_round_progress',
                    message: '🔍 AI 总编辑审核进行中',
                    description: statusText,
                    duration: 0,
                    placement: 'topRight',
                    style: { whiteSpace: 'pre-wrap' }
                  });
                } else {
                  message.loading({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 0
                  });
                }
              }
            } catch (e) {
              console.error('Error processing SSE data chunk:', e);
            }
          }
        }
      }

      if (hasStreamError) {
        return;
      }

      try {
        (notification as any).destroy?.('auditor_round_progress');
        (notification as any).destroy?.('auditor_warning_report');
      } catch (e) {}
      message.success({
        content: '✅ 章节审核通过并已安全存入数据库！',
        key: 'auditor_status',
        duration: 4
      });

      const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
      if (resDetail.code === 200) {
        setSelectedOutline(resDetail.data.outline);
        setSelectedNovel(resDetail.data.novel);
        await loadChapterContent(selectedNovel.id, activeChapterNum);
      }
    } catch (err: any) {
      message.error({
        content: err.message || '正文生成中断',
        key: 'auditor_status',
        duration: 4
      });
    } finally {
      setIsGenerating(false);
      streamReaderRef.current = null;
    }
  };

  const handleAiRenameChapter = async () => {
    if (!selectedNovel || !activeChapterNum || !selectedOutline) return;
    setRenamingChapter(true);
    message.loading({ content: 'AI 正在分析剧情为章节起名...', key: 'ai_rename', duration: 0 });
    try {
      const res: any = await httpService.post('/ai-novel/rename-chapter', {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum
      });
      if (res && res.code === 200 && res.data) {
        const newTitle = res.data;
        const updatedChapters = selectedOutline.chaptersOutline.map(c => {
          if (c.chapterNumber === activeChapterNum) {
            return { ...c, title: newTitle };
          }
          return c;
        });

        await httpService.post('/ai-novel/save-outline', {
          novelId: selectedNovel.id,
          chaptersOutline: updatedChapters
        });

        setSelectedOutline({
          ...selectedOutline,
          chaptersOutline: updatedChapters
        });
        message.success({ content: `AI 成功重新起名：${newTitle}`, key: 'ai_rename', duration: 3 });
      } else {
        throw new Error(res.msg || 'AI 起名未返回有效章节名称');
      }
    } catch (err: any) {
      console.error(err);
      message.error({ content: err.message || err || 'AI 起名失败，请重试', key: 'ai_rename', duration: 3 });
    } finally {
      setRenamingChapter(false);
    }
  };

  const handlePauseGeneration = async () => {
    if (streamReaderRef.current && selectedNovel) {
      try {
        await streamReaderRef.current.cancel();
      } catch (e) {}
      setIsGenerating(false);
      setIsPaused(true);
      message.loading({ content: '正在为您自动保存当前进度...', key: 'ai_pause', duration: 0 });
      try {
        await httpService.post('/ai-novel/save-chapter-content', {
          novelId: selectedNovel.id,
          chapterNumber: activeChapterNum,
          content: chapterContent
        });
        message.success({ content: '⏸️ 生成已暂停，当前进度已安全保存！', key: 'ai_pause', duration: 4 });
      } catch (err: any) {
        message.error({ content: '进度保存失败：' + (err.message || err), key: 'ai_pause', duration: 4 });
      }
    }
  };

  const handleStopGeneration = async () => {
    if (streamReaderRef.current) {
      await streamReaderRef.current.cancel();
      setIsGenerating(false);
      setIsPaused(false);
      message.warning({
        content: '大模型书写已由作者手动中断。',
        key: 'auditor_status',
        duration: 4
      });
      if (selectedNovel) {
        loadNovelToEditor(selectedNovel.id);
      }
    }
  };

  const handleContinueWriting = async () => {
    if (!selectedNovel || isGenerating) return;
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/continue-writing', {
        novelId: selectedNovel.id,
        currentText: chapterContent
      });
      if (res.code === 200 && res.data) {
        setChapterContent(prev => prev + '\n' + res.data);
        message.success('AI 灵感续写拼接成功！');
      } else {
        message.error('AI 续写失败');
      }
    } catch (e: any) {
      message.error(e.message || '续写连接失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePolishText = async () => {
    if (!selectedText) {
      message.warning('请先使用鼠标选中编辑器中需要修复重写的文字段落！');
      return;
    }
    setPolishing(true);
    setPolishedResult('');
    try {
      const res: any = await httpService.post('/ai-novel/polish-content', {
        novelId: selectedNovel ? selectedNovel.id : null,
        selectedText,
        instruction: polishInstruction,
        customInstruction: polishInstruction,
        userInstruction: polishInstruction,
        beforeText: selectedRange ? chapterContent.slice(0, selectedRange.start) : '',
        afterText: selectedRange ? chapterContent.slice(selectedRange.end) : ''
      });
      if (res.code === 200 && res.data) {
        const textStr = typeof res.data === 'string'
          ? res.data
          : (res.data.polishedText || JSON.stringify(res.data));
        setPolishedResult(textStr);
      } else {
        message.error('修复重写失败');
      }
    } catch (e: any) {
      message.error(e.message || '大模型修复重写接口异常');
    } finally {
      setPolishing(false);
    }
  };

  const handleReplacePolishedText = () => {
    if (!polishedResult || !selectedNovel || !selectedRange) return;
    const newContent = `${chapterContent.slice(0, selectedRange.start)}${polishedResult}${chapterContent.slice(selectedRange.end)}`;
    setChapterContent(newContent);
    setSelectedText('');
    setSelectedRange(null);
    setPolishedResult('');
    setPolishInstruction('');
    setShowPolishPop(false);
    message.success('已替换修复后的段落！');
    saveManualEdits(newContent);
  };

  const saveManualEdits = async (contentToSave: string) => {
    if (!selectedNovel) return;
    try {
      await httpService.post('/ai-novel/save-outline', {
        novelId: selectedNovel.id,
        chaptersOutline: selectedOutline?.chaptersOutline.map(c => {
          if (c.chapterNumber === activeChapterNum) {
            return { ...c, status: 'completed', wordCount: contentToSave.length };
          }
          return c;
        })
      });
      await httpService.post('/ai-novel/save-chapter-content', {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum,
        content: contentToSave
      });
    } catch (e) {}
  };

  const handleFetchPlotSuggestion = async (userFeedbackInstruction?: string) => {
    if (!selectedNovel || suggestingPlot) return;
    const isNewFetch = typeof userFeedbackInstruction === 'undefined';
    if (isNewFetch) {
      setRefineInstruction('');
    }
    const previousDirection = plotDirection.trim();
    const effectiveInstruction = (typeof userFeedbackInstruction === 'string'
      ? userFeedbackInstruction
      : (isNewFetch ? '' : refineInstruction)).trim();

    setSuggestingPlot(true);
    try {
      const res: any = await httpService.post('/ai-novel/suggest-next-plot', {
        novelId: selectedNovel.id,
        currentDirection: previousDirection,
        userInstruction: effectiveInstruction,
        chapterCount: batchChapterCount,
        refineDirection: !!effectiveInstruction
      }, { timeout: 300000 });
      const suggestionText = typeof res.data === 'string'
        ? res.data
        : (res.data?.suggestion || res.data?.plot || '');
      if (res.code === 200 && suggestionText) {
        setSuggestedPlotData({
          suggestion: suggestionText,
          auditMessage: res.msg || '已通过 AI 总编辑因果链与逻辑一致性深度审核！前文无断层、无凭空空降结论，角色关系自洽。',
          hasCorrected: !!res.hasCorrected
        });
        setPlotDirection(suggestionText);
        setSuggestPlotModalOpen(true);
        message.success(effectiveInstruction ? '已根据您的最高指导要求，重构完成新版剧情建议！' : 'AI 剧情建议已生成并自动填入规划说明框！');
      } else {
        message.error(res.msg || '获取 AI 建议失败');
      }
    } catch (e: any) {
      message.error(e.message || '请求 AI 建议失败，请检查网络');
    } finally {
      setSuggestingPlot(false);
    }
  };

  const handleBatchGenerateChapters = async () => {
    if (!selectedNovel || !plotDirection.trim()) {
      message.warning('请输入接下来的剧情发展大方向！');
      return;
    }
    setIsBatchGenerating(true);
    try {
      const res: any = await httpService.post('/ai-novel/batch-generate-chapters', {
        novelId: selectedNovel.id,
        plotDirection: plotDirection,
        chapterCount: batchChapterCount,
        mode: batchGenerateMode
      });
      if (res.code === 200) {
        message.success(res.msg || '智能批量章节规划成功！');
        setPlotDirection('');
        setBatchModalOpen(false);

        const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
        if (resDetail.code === 200 && resDetail.data) {
          setSelectedOutline(resDetail.data.outline);
          setSelectedNovel(resDetail.data.novel);

          const addedCh = res.data?.[0];
          if (addedCh) {
            handleSelectChapter(addedCh.chapterNumber);
          }
        }
      } else {
        message.error(res.msg || '批量生成章节失败');
      }
    } catch (e: any) {
      message.error(e.message || '网络请求错误');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleDeleteChapter = async (e: React.MouseEvent, chapterNum: number) => {
    e.stopPropagation();
    if (!selectedNovel || !selectedOutline) return;

    Modal.confirm({
      title: '确认删除章节',
      content: `您确定要删除“第 ${chapterNum} 章”吗？删除后，该章大纲将被移除，后续所有章节的序号及标题数字也会自动重新整理编排，以保持书写连贯。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const filtered = selectedOutline.chaptersOutline.filter(c => c.chapterNumber !== chapterNum);
          const reIndexed = filtered.map((c, idx) => {
            const nextNum = idx + 1;
            let newTitle = c.title;
            const regex = /^第\s*(\d+)\s*章/;
            if (regex.test(newTitle)) {
              newTitle = newTitle.replace(regex, `第 ${nextNum} 章`);
            }
            return {
              ...c,
              chapterNumber: nextNum,
              title: newTitle
            };
          });

          setSelectedOutline({ ...selectedOutline, chaptersOutline: reIndexed });

          let nextActiveNum = activeChapterNum;
          if (activeChapterNum === chapterNum) {
            nextActiveNum = reIndexed.length > 0 ? reIndexed[0].chapterNumber : 1;
            setActiveChapterNum(nextActiveNum);
            if (reIndexed.length > 0) {
              await loadChapterContent(selectedNovel.id, nextActiveNum);
            } else {
              setChapterContent('');
            }
          } else {
            if (activeChapterNum > chapterNum) {
              nextActiveNum = activeChapterNum - 1;
              setActiveChapterNum(nextActiveNum);
            }
          }

          const newActiveChapter = reIndexed.find(c => c.chapterNumber === nextActiveNum);
          setIntervention(newActiveChapter?.interventionPrompt || '');

          await httpService.post('/ai-novel/save-outline', {
            novelId: selectedNovel.id,
            chaptersOutline: reIndexed
          });

          message.success('章节已成功删除，后续章节数据已重新整理！');
        } catch (err: any) {
          message.error('删除章节失败，请重试');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const toggleCheckChapter = (chapterNum: number) => {
    setCheckedChapters(prev =>
      prev.includes(chapterNum)
        ? prev.filter(num => num !== chapterNum)
        : [...prev, chapterNum]
    );
  };

  const handleConfirmBatchDelete = () => {
    if (checkedChapters.length === 0 || !selectedNovel || !selectedOutline) return;

    Modal.confirm({
      title: '确认批量删除章节',
      content: `您确定要批量删除已选中的这 ${checkedChapters.length} 个章节吗？删除后对应大纲及正文将被清空，后续章节的序号和标题也将自动向前重新整理编排。`,
      okText: '确认批量删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const filtered = selectedOutline.chaptersOutline.filter(c => !checkedChapters.includes(c.chapterNumber));
          const reIndexed = filtered.map((c, idx) => {
            const nextNum = idx + 1;
            let newTitle = c.title;
            const regex = /^第\s*(\d+)\s*章/;
            if (regex.test(newTitle)) {
              newTitle = newTitle.replace(regex, `第 ${nextNum} 章`);
            }
            return {
              ...c,
              chapterNumber: nextNum,
              title: newTitle
            };
          });

          setSelectedOutline({ ...selectedOutline, chaptersOutline: reIndexed });

          let nextActiveNum = activeChapterNum;
          const wasActiveChapterDeleted = checkedChapters.includes(activeChapterNum);
          if (wasActiveChapterDeleted) {
            nextActiveNum = reIndexed.length > 0 ? reIndexed[0].chapterNumber : 1;
            setActiveChapterNum(nextActiveNum);
            if (reIndexed.length > 0) {
              await loadChapterContent(selectedNovel.id, nextActiveNum);
            } else {
              setChapterContent('');
            }
          } else {
            const remainingBeforeActive = selectedOutline.chaptersOutline.filter(
              c => c.chapterNumber < activeChapterNum && !checkedChapters.includes(c.chapterNumber)
            ).length;
            nextActiveNum = remainingBeforeActive + 1;
            setActiveChapterNum(nextActiveNum);
          }

          const newActiveChapter = reIndexed.find(c => c.chapterNumber === nextActiveNum);
          setIntervention(newActiveChapter?.interventionPrompt || '');

          await httpService.post('/ai-novel/save-outline', {
            novelId: selectedNovel.id,
            chaptersOutline: reIndexed
          });

          setIsDeleteMode(false);
          setCheckedChapters([]);

          message.success(`已成功批量删除 ${checkedChapters.length} 个章节，目录已自动重排！`);
        } catch (err: any) {
          message.error('批量删除失败，请重试');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/config', apiConfig);
      if (res.code === 200) {
        message.success('API 配置全局保存成功！');
        setConfigDrawerOpen(false);
      }
    } catch (e: any) {
      message.error('配置保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async () => {
    setTestingConfig(true);
    try {
      const res: any = await httpService.post('/ai-novel/config/test', apiConfig);
      const isSuccess = res.code === 200 && (res.data?.success !== false);
      const msg = res.data?.message || res.msg || '连接测试成功！';
      if (isSuccess) {
        message.success(msg);
      } else {
        message.error(res.data?.message || res.msg || '连接测试失败');
      }
    } catch (e: any) {
      message.error(e.message || '连接失败，请检查网络或密钥格式');
    } finally {
      setTestingConfig(false);
    }
  };

  const handleDeleteNovel = (id: number, title: string) => {
    Modal.confirm({
      title: '您确定要销毁这本小说吗？',
      content: `这将会永久清除《${title}》的全部世界观大纲设定和全部已创作的正文，此操作无法撤销！`,
      okText: '确认销毁',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await httpService.delete(`/ai-novel/${id}`);
          if (res.code === 200) {
            message.success('小说已成功从工坊中清理。');
            fetchNovels();
          }
        } catch (e) {
          message.error('清理失败');
        }
      }
    });
  };

  const handleExportTxt = () => {
    if (!selectedNovel || !selectedOutline) return;
    Modal.confirm({
      title: '导出作品',
      content: '确定要将当前小说已完成的章节打包导出为 TXT 文件吗？',
      onOk: async () => {
        try {
          const activeChaps = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
          let finalTxt = `《${selectedNovel.title}》\n作者：${selectedNovel.author}\n\n【世界观设定】\n${selectedOutline.worldSetting}\n\n【核心人物】\n${selectedOutline.characterSetting}\n\n`;

          setLoading(true);
          for (const chap of activeChaps) {
            const resContent: any = await httpService.get(`/ai-novel/chapter-content?novelId=${selectedNovel.id}&chapterNumber=${chap.chapterNumber}`);
            if (resContent.code === 200 && resContent.data) {
              finalTxt += `\n\n${chap.title}\n\n${extractChapterContent(resContent.data)}\n\n--------------------\n`;
            }
          }

          const blob = new Blob([finalTxt], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${selectedNovel.title}_AI全集.txt`;
          link.click();
          URL.revokeObjectURL(url);
          message.success('作品打包导出成功！');
        } catch (e) {
          message.error('导出失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handlePublishToFanqie = async () => {
    if (!selectedNovel || !selectedOutline) return;
    if (!fanqieBookName.trim()) {
      message.warning('请输入番茄作品名称！');
      return;
    }

    let chapterNumbersToSync: number[] = [];
    if (syncSelectMode === 'manual') {
      chapterNumbersToSync = selectedPublishChapters;
    } else {
      if (syncRangeStart === null || syncRangeEnd === null) {
        message.warning('请选择有效的范围！');
        return;
      }
      const start = Math.min(syncRangeStart, syncRangeEnd);
      const end = Math.max(syncRangeStart, syncRangeEnd);
      chapterNumbersToSync = selectedOutline.chaptersOutline
        .filter(c => c.chapterNumber >= start && c.chapterNumber <= end && c.status === 'completed')
        .map(c => c.chapterNumber);
    }

    if (!chapterNumbersToSync || chapterNumbersToSync.length === 0) {
      message.warning(syncSelectMode === 'manual' ? '请选择至少一个要同步的章节！' : '该范围内没有已完成创作的章节可供同步！');
      return;
    }

    setIsPublishingToFanqie(true);
    localStorage.setItem(`fanqie_book_id_${selectedNovel.id}`, fanqieBookId);
    localStorage.setItem(`fanqie_book_name_${selectedNovel.id}`, fanqieBookName);

    if (publishPollRef.current) {
      clearInterval(publishPollRef.current);
    }

    try {
      message.loading({ content: '正在启动番茄同步草稿箱程序，请注意查看弹出的浏览器窗口...', key: 'fanqie_pub', duration: 0 });
      const startRes: any = await httpService.post('/ai-novel/publish-to-fanqie', {
        novelId: selectedNovel.id,
        chapterNumbers: chapterNumbersToSync,
        fanqieBookId,
        fanqieBookName
      });

      if (startRes.code !== 200) {
        message.error({ content: startRes.msg || '启动同步草稿箱程序失败！', key: 'fanqie_pub', duration: 4 });
        setIsPublishingToFanqie(false);
        return;
      }

      const taskId = startRes.data?.taskId || `${selectedNovel.id}_${chapterNumbersToSync.join('_')}`;

      publishPollRef.current = setInterval(async () => {
        try {
          const statusRes: any = await httpService.get(`/ai-novel/publish-status?taskId=${taskId}`);
          if (statusRes.code === 200 && statusRes.data) {
            const task = statusRes.data;
            if (task.status === 'success') {
              if (publishPollRef.current) {
                clearInterval(publishPollRef.current);
                publishPollRef.current = null;
              }
              message.success({ content: task.msg || '章节同步至番茄草稿箱成功！', key: 'fanqie_pub', duration: 5 });
              setFanqieModalOpen(false);
              setIsPublishingToFanqie(false);
              loadNovelToEditor(selectedNovel.id);
            } else if (task.status === 'failed') {
              if (publishPollRef.current) {
                clearInterval(publishPollRef.current);
                publishPollRef.current = null;
              }
              message.error({ content: task.msg || '同步至草稿箱失败！', key: 'fanqie_pub', duration: 5 });
              setIsPublishingToFanqie(false);
            } else {
              message.loading({ content: task.msg || '番茄草稿同步程序运行中...', key: 'fanqie_pub', duration: 0 });
            }
          }
        } catch (pollErr: any) {
          console.error('Polling status error:', pollErr);
        }
      }, 1500);

    } catch (e: any) {
      message.error({ content: e.message || '网络或接口异常，同步草稿箱失败', key: 'fanqie_pub', duration: 4 });
      setIsPublishingToFanqie(false);
    }
  };

  const handleOpenFanqieModal = () => {
    if (!selectedOutline) return;
    const completedChapters = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
    const currentChapter = selectedOutline.chaptersOutline.find(c => c.chapterNumber === activeChapterNum);

    const firstCompleted = completedChapters[0];
    const lastCompleted = completedChapters[completedChapters.length - 1];

    if (currentChapter && currentChapter.status === 'completed') {
      setSelectedPublishChapters([activeChapterNum]);
      setSyncRangeStart(activeChapterNum);
      setSyncRangeEnd(activeChapterNum);
    } else {
      if (firstCompleted) {
        setSelectedPublishChapters([firstCompleted.chapterNumber]);
        setSyncRangeStart(firstCompleted.chapterNumber);
        setSyncRangeEnd(lastCompleted ? lastCompleted.chapterNumber : firstCompleted.chapterNumber);
      } else {
        setSelectedPublishChapters([]);
        setSyncRangeStart(null);
        setSyncRangeEnd(null);
      }
    }
    setSyncSelectMode('manual');
    setFanqieModalOpen(true);
  };

  const handleSelectAllUnsynced = () => {
    if (!selectedOutline) return;
    const unsyncedChapters = selectedOutline.chaptersOutline
      .filter(c => c.status === 'completed' && c.crawlStatus !== 'published');

    if (unsyncedChapters.length === 0) {
      message.info('当前所有已完成的章节均已同步番茄！');
      return;
    }

    if (syncSelectMode === 'manual') {
      setSelectedPublishChapters(unsyncedChapters.map(c => c.chapterNumber));
    } else {
      const minNum = Math.min(...unsyncedChapters.map(c => c.chapterNumber));
      const maxNum = Math.max(...unsyncedChapters.map(c => c.chapterNumber));
      setSyncRangeStart(minNum);
      setSyncRangeEnd(maxNum);
    }
    message.success(`已自动选择 ${unsyncedChapters.length} 个未同步章节！`);
  };

  const getSyncSummary = () => {
    if (!selectedOutline) return null;
    const completed = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
    if (syncSelectMode === 'manual') {
      const totalSelected = selectedPublishChapters.length;
      const unsyncedSelected = selectedOutline.chaptersOutline.filter(
        c => selectedPublishChapters.includes(c.chapterNumber) && c.crawlStatus !== 'published'
      ).length;
      return `已手动选择 ${totalSelected} 个章节，其中 ${unsyncedSelected} 个未同步。`;
    } else {
      if (syncRangeStart === null || syncRangeEnd === null) return '请输入同步章节范围。';
      const start = Math.min(syncRangeStart, syncRangeEnd);
      const end = Math.max(syncRangeStart, syncRangeEnd);
      const inRange = completed.filter(c => c.chapterNumber >= start && c.chapterNumber <= end);
      const unsyncedInRange = inRange.filter(c => c.crawlStatus !== 'published');
      return `指定范围第 ${start} - ${end} 章内共有 ${inRange.length} 个已完成章节，其中 ${unsyncedInRange.length} 个未同步。`;
    }
  };

  const handleToggleSyncStatus = async (chapterNumber: number, currentIsSynced: boolean) => {
    if (!selectedNovel) return;
    const targetStatus = currentIsSynced ? 'completed' : 'published';
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/update-chapter-status', {
        novelId: selectedNovel.id,
        chapterNumber,
        crawlStatus: targetStatus
      });
      if (res.code === 200) {
        message.success(res.msg || '修改同步状态成功！');
        loadNovelToEditor(selectedNovel.id);
      } else {
        message.error(res.msg || '修改状态失败');
      }
    } catch (e: any) {
      message.error(e.message || '修改状态接口异常');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBatchAnalyzeModal = (defaultType?: 'sys' | 'rel') => {
    if (defaultType) {
      setBatchAnalyzeTypes([defaultType]);
    }
    if (selectedOutline?.chaptersOutline) {
      try {
        const rawChs = selectedOutline.chaptersOutline as any;
        const chs: ChapterOutline[] = typeof rawChs === 'string' ? JSON.parse(rawChs) : (Array.isArray(rawChs) ? rawChs : []);
        const completedNums = chs.filter(c => c.status === 'completed').map(c => c.chapterNumber);
        setBatchAnalyzeSelectedChapters(completedNums.length > 0 ? completedNums : chs.map(c => c.chapterNumber));
      } catch (e) {
        setBatchAnalyzeSelectedChapters([]);
      }
    }
    setIsBatchAnalyzeModalVisible(true);
  };

  const handleRunBatchAnalyze = async () => {
    if (!selectedNovel) return;
    if (batchAnalyzeSelectedChapters.length === 0) {
      message.warning('请至少勾选一个章节进行分析');
      return;
    }
    if (batchAnalyzeTypes.length === 0) {
      message.warning('请至少勾选一种分析类型（修仙/系统状态 或 人物关系）');
      return;
    }

    setIsBatchAnalyzing(true);
    message.loading({ content: `AI 正在对勾选的 ${batchAnalyzeSelectedChapters.length} 个章节进行深度分析，请稍候...`, key: 'batch_analyze', duration: 0 });

    try {
      const res: any = await httpService.post('/ai-novel/batch-analyze-chapters', {
        novelId: selectedNovel.id,
        chapterNumbers: batchAnalyzeSelectedChapters,
        analysisTypes: batchAnalyzeTypes
      });

      if (res.code === 200 && res.data) {
        if (selectedOutline) {
          setSelectedOutline({
            ...selectedOutline,
            systemAndCultivationState: res.data.systemAndCultivationState || selectedOutline.systemAndCultivationState,
            characterRelationships: res.data.characterRelationships || selectedOutline.characterRelationships
          });
        }
        message.success({ content: res.msg || '批量章节 AI 深度分析成功并已存库！', key: 'batch_analyze', duration: 3 });
        setIsBatchAnalyzeModalVisible(false);
      } else {
        message.error({ content: res.msg || '批量分析章节失败', key: 'batch_analyze', duration: 3 });
      }
    } catch (err: any) {
      message.error({ content: '批量分析章节发生异常: ' + err.message, key: 'batch_analyze', duration: 3 });
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const handleOpenInsertModal = (defaultAfterNum?: number) => {
    if (typeof defaultAfterNum === 'number') {
      setInsertAfterChapterNum(defaultAfterNum);
    } else {
      setInsertAfterChapterNum(activeChapterNum ? activeChapterNum - 1 : 0);
    }
    setInsertUserInstruction('');
    setIsInsertModalOpen(true);
  };

  const handleRunInsertChapter = async () => {
    if (!selectedNovel) return;
    setIsInsertingChapter(true);
    const targetNum = insertAfterChapterNum + 1;
    message.loading({
      content: `AI 正在结合前文与后文上下文，为您智能构思第 ${targetNum} 章细纲并顺延后续章节...`,
      key: 'insert_chap',
      duration: 0
    });

    try {
      const res: any = await httpService.post('/ai-novel/insert-chapter', {
        novelId: selectedNovel.id,
        afterChapterNumber: insertAfterChapterNum,
        userInstruction: insertUserInstruction,
        generateWithAi: true
      });

      if (res.code === 200 && res.data) {
        message.success({
          content: res.msg || `成功在第 ${insertAfterChapterNum} 章后插入第 ${targetNum} 章《${res.data.title || ''}》！`,
          key: 'insert_chap',
          duration: 3
        });
        setIsInsertModalOpen(false);
        await loadNovelToEditor(selectedNovel.id, targetNum);
      } else {
        message.error({ content: res.msg || '插入章节失败', key: 'insert_chap', duration: 3 });
      }
    } catch (e: any) {
      message.error({ content: '插入章节发生异常: ' + e.message, key: 'insert_chap', duration: 3 });
    } finally {
      setIsInsertingChapter(false);
    }
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      if (newWidth > 280 && newWidth < 800) {
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="ai-novel-studio">
      <Spin spinning={loading} size="large" tip="系统全力运转中，请稍候...">
        {view === 'list' && (
          <NovelListView
            loading={loading}
            novels={novels}
            onOpenCreate={() => setView('idea')}
            onOpenConfig={() => setConfigDrawerOpen(true)}
            onLoadNovelToEditor={loadNovelToEditor}
            onDeleteNovel={handleDeleteNovel}
          />
        )}
        {view === 'idea' && (
          <IdeaView
            onBackToList={() => setView('list')}
            category={category}
            setCategory={setCategory}
            customCategory={customCategory}
            setCustomCategory={setCustomCategory}
            tone={tone}
            setTone={setTone}
            keywords={keywords}
            setKeywords={setKeywords}
            ideas={ideas}
            setIdeas={setIdeas}
            loading={loading}
            editingIdeaIndex={editingIdeaIndex}
            onGenerateIdeas={handleGenerateIdeas}
            onToggleEditIdea={handleToggleEditIdea}
            onBuildOutline={handleBuildOutline}
          />
        )}
        {view === 'outline' && (
          <OutlineView
            draftOutline={draftOutline}
            setDraftOutline={setDraftOutline}
            chosenIdea={chosenIdea}
            onBackToIdea={() => setView('idea')}
            onSaveAndCreateNovel={handleSaveAndCreateNovel}
            loading={loading}
            onOpenManualEdit={handleOpenManualEdit}
            setModifyField={setModifyField}
            setIsModifyModalOpen={setIsModifyModalOpen}
          />
        )}
        {view === 'editor' && (
          <EditorView
            selectedNovel={selectedNovel}
            selectedOutline={selectedOutline}
            setSelectedOutline={setSelectedOutline}
            activeChapterNum={activeChapterNum}
            onExitEditor={handleExitEditor}
            paperTheme={paperTheme}
            setPaperTheme={setPaperTheme}
            fontSize={fontSize}
            setFontSize={setFontSize}
            leftCollapsed={leftCollapsed}
            setLeftCollapsed={setLeftCollapsed}
            rightCollapsed={rightCollapsed}
            setRightCollapsed={setRightCollapsed}
            isFullScreen={isFullScreen}
            toggleFullScreen={toggleFullScreen}
            onOpenFanqieModal={handleOpenFanqieModal}
            onExportTxt={handleExportTxt}
            isDeleteMode={isDeleteMode}
            setIsDeleteMode={setIsDeleteMode}
            checkedChapters={checkedChapters}
            setCheckedChapters={setCheckedChapters}
            onConfirmBatchDelete={handleConfirmBatchDelete}
            onOpenBatchModal={() => setBatchModalOpen(true)}
            onOpenInsertModal={handleOpenInsertModal}
            chapterSortAsc={chapterSortAsc}
            setChapterSortAsc={setChapterSortAsc}
            selectedVolumeNum={selectedVolumeNum}
            setSelectedVolumeNum={setSelectedVolumeNum}
            onSelectChapter={handleSelectChapter}
            toggleCheckChapter={toggleCheckChapter}
            onToggleSyncStatus={handleToggleSyncStatus}
            onDeleteChapter={handleDeleteChapter}
            onAiRenameChapter={handleAiRenameChapter}
            renamingChapter={renamingChapter}
            chapterContent={chapterContent}
            setChapterContent={setChapterContent}
            isGenerating={isGenerating}
            writingSpeed={writingSpeed}
            showPolishPop={showPolishPop}
            setShowPolishPop={setShowPolishPop}
            selectedText={selectedText}
            setSelectedText={setSelectedText}
            selectedRange={selectedRange}
            setSelectedRange={setSelectedRange}
            polishInstruction={polishInstruction}
            setPolishInstruction={setPolishInstruction}
            polishing={polishing}
            onPolishText={handlePolishText}
            polishedResult={polishedResult}
            onReplacePolishedText={handleReplacePolishedText}
            textRef={textRef}
            saveManualEdits={saveManualEdits}
            wordCountLimit={wordCountLimit}
            setWordCountLimit={setWordCountLimit}
            onContinueWriting={handleContinueWriting}
            onWriteChapterStream={handleWriteChapterStream}
            loading={loading}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onPauseGeneration={handlePauseGeneration}
            onStopGeneration={handleStopGeneration}
            rightWidth={rightWidth}
            isResizingRight={isResizingRight}
            startResizeRight={startResizeRight}
            onOpenManualEdit={handleOpenManualEdit}
            intervention={intervention}
            setIntervention={setIntervention}
            httpService={httpService}
            message={message}
            setModifyField={setModifyField}
            setIsModifyModalOpen={setIsModifyModalOpen}
            setIsBackgroundSettingsModalOpen={setIsBackgroundSettingsModalOpen}
            isAnalyzingSys={isAnalyzingSys}
            onAnalyzeSystemAndCultivation={handleAnalyzeSystemAndCultivation}
            onOpenBatchAnalyzeModal={handleOpenBatchAnalyzeModal}
            onStartAddRelationship={handleStartAddRelationship}
            relSortAsc={relSortAsc}
            setRelSortAsc={setRelSortAsc}
            isAnalyzingRel={isAnalyzingRel}
            onAnalyzeRelationships={handleAnalyzeRelationships}
            activeRelNode={activeRelNode}
            setActiveRelNode={setActiveRelNode}
            onTogglePastStatus={handleTogglePastStatus}
            onStartEditRelationship={handleStartEditRelationship}
            onDeleteRelationship={handleDeleteRelationship}
          />
        )}
      </Spin>

      {/* 弹窗抽屉统一声明 */}
      <ConfigDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
        onSave={handleSaveConfig}
        onTest={handleTestConfig}
        loading={loading}
        testingConfig={testingConfig}
      />

      <BatchChaptersModal
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        batchChapterCount={batchChapterCount}
        setBatchChapterCount={setBatchChapterCount}
        batchGenerateMode={batchGenerateMode}
        setBatchGenerateMode={setBatchGenerateMode}
        plotDirection={plotDirection}
        setPlotDirection={setPlotDirection}
        suggestingPlot={suggestingPlot}
        onFetchPlotSuggestion={handleFetchPlotSuggestion}
        isBatchGenerating={isBatchGenerating}
        onBatchGenerateChapters={handleBatchGenerateChapters}
      />

      <SuggestPlotModal
        open={suggestPlotModalOpen}
        onCancel={() => setSuggestPlotModalOpen(false)}
        suggestedPlotData={suggestedPlotData}
        suggestingPlot={suggestingPlot}
        refineInstruction={refineInstruction}
        setRefineInstruction={setRefineInstruction}
        onFetchPlotSuggestion={handleFetchPlotSuggestion}
        onAdoptSuggestion={(suggestion) => {
          setPlotDirection(suggestion);
          setSuggestPlotModalOpen(false);
          setRefineInstruction('');
          message.success('已成功采纳 AI 剧情建议并填入规划说明框！');
        }}
      />

      <FanqiePublishModal
        open={fanqieModalOpen}
        onCancel={() => setFanqieModalOpen(false)}
        isPublishingToFanqie={isPublishingToFanqie}
        syncSelectMode={syncSelectMode}
        setSyncSelectMode={setSyncSelectMode}
        selectedPublishChapters={selectedPublishChapters}
        setSelectedPublishChapters={setSelectedPublishChapters}
        syncRangeStart={syncRangeStart}
        setSyncRangeStart={setSyncRangeStart}
        syncRangeEnd={syncRangeEnd}
        setSyncRangeEnd={setSyncRangeEnd}
        selectedOutline={selectedOutline}
        fanqieBookName={fanqieBookName}
        setFanqieBookName={setFanqieBookName}
        fanqieBookId={fanqieBookId}
        setFanqieBookId={setFanqieBookId}
        onSelectAllUnsynced={handleSelectAllUnsynced}
        onPublishToFanqie={handlePublishToFanqie}
        getSyncSummary={getSyncSummary}
      />

      <AiModifyModal
        open={isModifyModalOpen}
        onCancel={() => {
          setIsModifyModalOpen(false);
          setModifyReqs('');
          setModifyResult('');
        }}
        modifyField={modifyField}
        modifyReqs={modifyReqs}
        setModifyReqs={setModifyReqs}
        modifyResult={modifyResult}
        setModifyResult={setModifyResult}
        modifyLoading={modifyLoading}
        onAiModifySetting={handleAiModifySetting}
        onApplyModifySetting={handleApplyModifySetting}
        view={view}
        draftOutline={draftOutline}
        selectedOutline={selectedOutline}
      />

      <RelationshipModal
        open={isRelModalOpen}
        onCancel={() => setIsRelModalOpen(false)}
        editingRel={editingRel}
        newRelName={newRelName}
        setNewRelName={setNewRelName}
        newRelRelationship={newRelRelationship}
        setNewRelRelationship={setNewRelRelationship}
        newRelAppearance={newRelAppearance}
        setNewRelAppearance={setNewRelAppearance}
        newRelDescription={newRelDescription}
        setNewRelDescription={setNewRelDescription}
        newRelIsPast={newRelIsPast}
        setNewRelIsPast={setNewRelIsPast}
        onSubmit={handleAddOrEditRelationshipSubmit}
      />

      <ManualEditModal
        open={isManualEditModalOpen}
        onCancel={() => setIsManualEditModalOpen(false)}
        title={manualEditTitle}
        value={manualEditValue}
        setValue={setManualEditValue}
        onSave={handleSaveManualEdit}
      />

      <BackgroundSettingsModal
        open={isBackgroundSettingsModalOpen}
        onCancel={() => setIsBackgroundSettingsModalOpen(false)}
        selectedOutline={selectedOutline}
        setSelectedOutline={setSelectedOutline}
        selectedNovel={selectedNovel}
        httpService={httpService}
        message={message}
        setModifyField={setModifyField}
        setIsModifyModalOpen={setIsModifyModalOpen}
        isAnalyzingSys={isAnalyzingSys}
        onAnalyzeSystemAndCultivation={handleAnalyzeSystemAndCultivation}
        onOpenBatchAnalyzeModal={handleOpenBatchAnalyzeModal}
        onStartAddRelationship={handleStartAddRelationship}
        relSortAsc={relSortAsc}
        setRelSortAsc={setRelSortAsc}
        isAnalyzingRel={isAnalyzingRel}
        onAnalyzeRelationships={handleAnalyzeRelationships}
        getProtagonistName={getProtagonistName}
        activeRelNode={activeRelNode}
        setActiveRelNode={setActiveRelNode}
        onTogglePastStatus={handleTogglePastStatus}
        onStartEditRelationship={handleStartEditRelationship}
        onDeleteRelationship={handleDeleteRelationship}
      />

      <BatchAnalyzeModal
        open={isBatchAnalyzeModalVisible}
        onCancel={() => setIsBatchAnalyzeModalVisible(false)}
        onRunBatchAnalyze={handleRunBatchAnalyze}
        isBatchAnalyzing={isBatchAnalyzing}
        batchAnalyzeSelectedChapters={batchAnalyzeSelectedChapters}
        setBatchAnalyzeSelectedChapters={setBatchAnalyzeSelectedChapters}
        batchAnalyzeTypes={batchAnalyzeTypes}
        setBatchAnalyzeTypes={setBatchAnalyzeTypes}
        selectedOutline={selectedOutline}
      />

      <InsertChapterModal
        open={isInsertModalOpen}
        onCancel={() => setIsInsertModalOpen(false)}
        onRunInsertChapter={handleRunInsertChapter}
        isInsertingChapter={isInsertingChapter}
        insertAfterChapterNum={insertAfterChapterNum}
        setInsertAfterChapterNum={setInsertAfterChapterNum}
        insertUserInstruction={insertUserInstruction}
        setInsertUserInstruction={setInsertUserInstruction}
        selectedOutline={selectedOutline}
      />
    </div>
  );
};

export default AiNovelDashboard;
