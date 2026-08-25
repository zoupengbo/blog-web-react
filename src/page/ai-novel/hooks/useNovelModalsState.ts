import React, { useState, useRef } from 'react';
import { message } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline, CharacterRelationship, ChapterOutline } from '../types';
import { isPastCharacter } from '../utils/volumeParser';

export const useNovelModalsState = (
  selectedNovel: Novel | null,
  selectedOutline: NovelOutline,
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>,
  draftOutline: NovelOutline | null,
  setDraftOutline: React.Dispatch<React.SetStateAction<NovelOutline | null>>,
  view: 'list' | 'idea' | 'outline' | 'editor',
  activeChapterNum: number,
  chapterContent: string,
  setIntervention: (val: string) => void,
  loadNovelToEditor: (novelId: number, targetChapterNum?: number) => Promise<void>
) => {
  // API 配置 Drawer 状态
  const [configDrawerOpen, setConfigDrawerOpen] = useState<boolean>(false);
  const [apiConfig, setApiConfig] = useState<any>({
    apiKey: '',
    baseUrl: '',
    modelName: '',
    temperature: 0.7,
    maxTokens: 8192
  });
  const [testingConfig, setTestingConfig] = useState<boolean>(false);

  // AI 修改设定状态
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(false);
  const [modifyField, setModifyField] = useState<'worldSetting' | 'mainLine' | 'characterSetting'>('worldSetting');
  const [modifyReqs, setModifyReqs] = useState<string>('');
  const [modifyLoading, setModifyLoading] = useState<boolean>(false);
  const [modifyResult, setModifyResult] = useState<string>('');

  // 放大手动修改状态
  const [isManualEditModalOpen, setIsManualEditModalOpen] = useState<boolean>(false);
  const [manualEditField, setManualEditField] = useState<string>('worldSetting');
  const [manualEditTitle, setManualEditTitle] = useState<string>('');
  const [manualEditValue, setManualEditValue] = useState<string>('');

  // 背景大窗口设定 Modal 状态
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

  // 拆章、建议与分析 Modal 状态
  const [batchModalOpen, setBatchModalOpen] = useState<boolean>(false);
  const [plotDirection, setPlotDirection] = useState<string>('');
  const [batchChapterCount, setBatchChapterCount] = useState<number>(1);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchGenerateMode, setBatchGenerateMode] = useState<'append' | 'overwrite'>('append');

  const [suggestPlotModalOpen, setSuggestPlotModalOpen] = useState<boolean>(false);
  const [suggestingPlot, setSuggestingPlot] = useState<boolean>(false);
  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [suggestedPlotData, setSuggestedPlotData] = useState<{
    suggestion: string;
    auditMessage: string;
    hasCorrected?: boolean;
  }>({ suggestion: '', auditMessage: '', hasCorrected: false });

  const [isBatchAnalyzeModalVisible, setIsBatchAnalyzeModalVisible] = useState<boolean>(false);
  const [batchAnalyzeSelectedChapters, setBatchAnalyzeSelectedChapters] = useState<number[]>([]);
  const [batchAnalyzeTypes, setBatchAnalyzeTypes] = useState<string[]>(['sys', 'rel']);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);

  const [isInsertModalOpen, setIsInsertModalOpen] = useState<boolean>(false);
  const [insertAfterChapterNum, setInsertAfterChapterNum] = useState<number>(0);
  const [insertUserInstruction, setInsertUserInstruction] = useState<string>('');
  const [isInsertingChapter, setIsInsertingChapter] = useState<boolean>(false);

  // 修复重写选定段落状态
  const [selectedText, setSelectedText] = useState<string>('');
  const [polishInstruction, setPolishInstruction] = useState<string>('');
  const [polishedResult, setPolishedResult] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [polishing, setPolishing] = useState<boolean>(false);
  const [showPolishPop, setShowPolishPop] = useState<boolean>(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // ⚙️ 大模型多预设管理状态
  const [configPresets, setConfigPresets] = useState<any[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);

  const fetchConfig = async () => {
    try {
      const res: any = await httpService.get('/ai-novel/config');
      if (res.code === 200) {
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e) {}
  };

  const handleSwitchPreset = async (presetId: number) => {
    try {
      const res: any = await httpService.post('/ai-novel/config/switch-preset', { id: presetId });
      if (res.code === 200) {
        message.success(`已切换至【${res.data?.name || '新预设'}】`);
        setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e: any) {
      message.error(e?.message || '切换预设失败');
    }
  };

  const handleDeletePreset = async (presetId: number) => {
    try {
      const res: any = await httpService.delete(`/ai-novel/config/preset/${presetId}`);
      if (res.code === 200) {
        message.success('预设已删除');
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
      }
    } catch (e: any) {
      message.error(e?.message || '删除预设失败');
    }
  };

  const handleSaveConfig = async (setLoading: (l: boolean) => void, isNewPreset = false, newPresetName = '') => {
    setLoading(true);
    try {
      const payload = {
        ...apiConfig,
        isNew: isNewPreset,
        name: isNewPreset ? (newPresetName || `预设 #${Date.now().toString().slice(-4)}`) : apiConfig.name
      };
      const res: any = await httpService.post('/ai-novel/config', payload);
      if (res.code === 200) {
        message.success(isNewPreset ? '已成功另存为新预设！' : 'API 配置保存成功！');
        if (res.data) setApiConfig(res.data);
        if (res.presets) setConfigPresets(res.presets);
        if (res.activeId) setActivePresetId(res.activeId);
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

  const handleBatchGenerateChapters = async (setSelectedNovel: any) => {
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

  return {
    textRef,
    configDrawerOpen,
    setConfigDrawerOpen,
    apiConfig,
    setApiConfig,
    testingConfig,
    fetchConfig,
    handleSaveConfig,
    handleTestConfig,
    isModifyModalOpen,
    setIsModifyModalOpen,
    modifyField,
    setModifyField,
    modifyReqs,
    setModifyReqs,
    modifyLoading,
    modifyResult,
    setModifyResult,
    handleAiModifySetting,
    handleApplyModifySetting,
    isManualEditModalOpen,
    setIsManualEditModalOpen,
    manualEditTitle,
    manualEditValue,
    setManualEditValue,
    handleOpenManualEdit,
    handleSaveManualEdit,
    isBackgroundSettingsModalOpen,
    setIsBackgroundSettingsModalOpen,
    isAnalyzingRel,
    isAnalyzingSys,
    isRelModalOpen,
    setIsRelModalOpen,
    editingRel,
    newRelName,
    setNewRelName,
    newRelRelationship,
    setNewRelRelationship,
    newRelDescription,
    setNewRelDescription,
    newRelAppearance,
    setNewRelAppearance,
    newRelIsPast,
    setNewRelIsPast,
    activeRelNode,
    setActiveRelNode,
    handleTogglePastStatus,
    handleDeleteRelationship,
    handleStartEditRelationship,
    handleStartAddRelationship,
    handleAddOrEditRelationshipSubmit,
    handleAnalyzeSystemAndCultivation,
    handleAnalyzeRelationships,
    batchModalOpen,
    setBatchModalOpen,
    plotDirection,
    setPlotDirection,
    batchChapterCount,
    setBatchChapterCount,
    isBatchGenerating,
    batchGenerateMode,
    setBatchGenerateMode,
    handleFetchPlotSuggestion,
    handleBatchGenerateChapters,
    suggestPlotModalOpen,
    setSuggestPlotModalOpen,
    suggestingPlot,
    refineInstruction,
    setRefineInstruction,
    suggestedPlotData,
    isBatchAnalyzeModalVisible,
    setIsBatchAnalyzeModalVisible,
    batchAnalyzeSelectedChapters,
    setBatchAnalyzeSelectedChapters,
    batchAnalyzeTypes,
    setBatchAnalyzeTypes,
    isBatchAnalyzing,
    handleOpenBatchAnalyzeModal,
    handleRunBatchAnalyze,
    isInsertModalOpen,
    setIsInsertModalOpen,
    insertAfterChapterNum,
    setInsertAfterChapterNum,
    insertUserInstruction,
    setInsertUserInstruction,
    isInsertingChapter,
    handleOpenInsertModal,
    handleRunInsertChapter,
    selectedText,
    setSelectedText,
    polishInstruction,
    setPolishInstruction,
    polishedResult,
    setPolishedResult,
    polishing,
    showPolishPop,
    setShowPolishPop,
    configPresets,
    activePresetId,
    handleSwitchPreset,
    handleDeletePreset,
  };
};
