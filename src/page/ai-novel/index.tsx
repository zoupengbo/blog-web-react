import React, { useState, useEffect, useRef } from 'react';
import { Spin, message, Modal } from 'antd';
import httpService from '../../common/request';
import './styles.scss';

import { useTheme } from '../../context/themeContext';
import { useAiConfig } from '../../context/aiConfigContext';
// 导入类型与工具
import {
  Novel, NovelOutline, Idea, PaperTheme
} from './types';

// 导入 View 视图组件
import { NovelListView } from './components/NovelListView';
import { IdeaView } from './components/IdeaView';
import { OutlineView } from './components/OutlineView';
import { EditorView } from './components/EditorView';

// 导入 Modal / Drawer 弹窗组件
import { BatchChaptersModal } from './modals/BatchChaptersModal';
import { SuggestPlotModal } from './modals/SuggestPlotModal';
import { FanqiePublishModal } from './modals/FanqiePublishModal';
import { AiModifyModal } from './modals/AiModifyModal';
import { RelationshipModal } from './modals/RelationshipModal';
import { ManualEditModal } from './modals/ManualEditModal';
import { BackgroundSettingsModal } from './modals/BackgroundSettingsModal';
import { BatchAnalyzeModal } from './modals/BatchAnalyzeModal';
import { InsertChapterModal } from './modals/InsertChapterModal';
import { FreeWriteModal } from './modals/FreeWriteModal';

// 导入 自定义 Hooks
import { useAiNovelData } from './hooks/useAiNovelData';
import { useAiStreamWriter } from './hooks/useAiStreamWriter';
import { useFanqiePublisher } from './hooks/useFanqiePublisher';
import { useNovelModalsState } from './hooks/useNovelModalsState';

const EMPTY_OUTLINE: NovelOutline = {
  chaptersOutline: [],
  characterRelationships: [],
  systemAndCultivationState: {},
  theme: '',
  worldSetting: '',
  characterSetting: '',
  mainLine: ''
};

const AiNovelDashboard: React.FC = () => {
  // 全局视图状态: 'list' | 'idea' | 'outline' | 'editor'
  const [view, setView] = useState<'list' | 'idea' | 'outline' | 'editor'>('list');

  // 1. 灵感广场状态
  const [category, setCategory] = useState<string>('修真玄幻');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [tone, setTone] = useState<string[]>(['热血爽文']);
  const [keywords, setKeywords] = useState<string>('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [editingIdeaIndex, setEditingIdeaIndex] = useState<number | null>(null);

  const { isDark } = useTheme();
  const { openConfigDrawer } = useAiConfig();

  // 辅助样式 / 排序 / 布局状态
  const [paperTheme, setPaperTheme] = useState<PaperTheme>(() => (isDark ? 'dark' : 'light'));

  useEffect(() => {
    setPaperTheme(isDark ? 'dark' : 'light');
  }, [isDark]);
  const [fontSize, setFontSize] = useState<number>(16);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [chapterSortAsc, setChapterSortAsc] = useState<boolean>(true);
  const [relSortAsc, setRelSortAsc] = useState<boolean>(true);
  const [selectedVolumeNum, setSelectedVolumeNum] = useState<number | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [checkedChapters, setCheckedChapters] = useState<number[]>([]);
  const [rightWidth, setRightWidth] = useState<number>(380);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [isFreeWriteOpen, setIsFreeWriteOpen] = useState<boolean>(false);

  // 2. 抽离的 Hooks
  const {
    loading,
    setLoading,
    novels,
    selectedNovel,
    setSelectedNovel,
    selectedOutline,
    setSelectedOutline,
    draftOutline,
    setDraftOutline,
    chosenIdea,
    setChosenIdea,
    fetchNovels,
    loadChapterContent,
    saveChapterContentData,
    loadNovelToEditor,
    handleDeleteNovel,
    handleExportTxt,
  } = useAiNovelData(
    EMPTY_OUTLINE,
    (val) => modalsHook.setModifyReqs(val),
    (val) => fanqieHook.setFanqieBookId(val),
    (val) => fanqieHook.setFanqieBookName(val),
    (num) => streamHook.setActiveChapterNum(num),
    (text) => streamHook.setChapterContent(text),
    setView
  );

  const streamHook = useAiStreamWriter(
    selectedNovel,
    selectedOutline,
    setSelectedOutline,
    setSelectedNovel,
    loadChapterContent,
    loadNovelToEditor
  );

  const fanqieHook = useFanqiePublisher(
    selectedNovel,
    selectedOutline,
    streamHook.activeChapterNum,
    loadNovelToEditor
  );

  const modalsHook = useNovelModalsState(
    selectedNovel,
    selectedOutline,
    setSelectedOutline,
    draftOutline,
    setDraftOutline,
    view,
    streamHook.activeChapterNum,
    streamHook.chapterContent,
    streamHook.setIntervention,
    loadNovelToEditor
  );

  const getProtagonistName = () => {
    if (!selectedOutline?.characterSetting) return '主角';
    const match = selectedOutline.characterSetting.match(/(?:主角|男主|女主)\s*[:：]\s*([^\s,，。;；()（）]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '主角';
  };

  useEffect(() => {
    fetchNovels();
    modalsHook.fetchConfig();

    const lastNovelId = localStorage.getItem('last_selected_novel_id');
    const lastChNum = localStorage.getItem('last_active_chapter_num');
    if (lastNovelId) {
      const nid = parseInt(lastNovelId, 10);
      const ch = lastChNum ? parseInt(lastChNum, 10) : undefined;
      loadNovelToEditor(nid, ch);
    }

    return () => {
      if (fanqieHook.publishPollRef.current) {
        clearInterval(fanqieHook.publishPollRef.current);
      }
    };
  }, []);

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

      let rawOutline = resOutline.data;
      if (typeof rawOutline === 'string') {
        try {
          rawOutline = JSON.parse(rawOutline);
        } catch (e) {
          // If plain text string, wrap as object
          rawOutline = { worldSetting: rawOutline };
        }
      }
      if (!rawOutline || typeof rawOutline !== 'object') {
        rawOutline = {};
      }

      // 1. 提取与转义 世界观
      let worldSettingStr = (() => {
        const w = rawOutline.worldSetting || rawOutline.world_setting || rawOutline.world || rawOutline.worldView || rawOutline.background;
        if (!w) return '';
        if (typeof w === 'string') return w;
        if (typeof w === 'object') {
          const labelMap: Record<string, string> = { background: '世界背景', realmSystem: '境界体系', coreRules: '核心规则' };
          return Object.entries(w)
            .map(([k, v]) => {
              const label = labelMap[k] || k;
              const valStr = typeof v === 'object' ? (Array.isArray(v) ? v.join(' -> ') : JSON.stringify(v, null, 2)) : String(v);
              return `【${label}】\n${valStr}`;
            })
            .join('\n\n');
        }
        return String(w);
      })();

      // 2. 提取与转义 角色设定
      let characterSettingStr = (() => {
        const c = rawOutline.characterSetting || rawOutline.character_setting || rawOutline.characters || rawOutline.roles || rawOutline.character;
        if (!c) return '';
        if (typeof c === 'string') return c;
        if (Array.isArray(c)) {
          return c.map((item: any) => typeof item === 'string' ? item : `${item.name || '角色'}（${item.roleType || item.identity || ''}）：${item.description || item.personality || ''}`).join('\n');
        }
        if (typeof c === 'object') {
          const lines: string[] = [];
          if (c.protagonist) {
            const p = c.protagonist;
            if (typeof p === 'string') {
              lines.push(`【主角设定】\n${p}`);
            } else {
              lines.push(`【主角】${p.name || '核心主角'}`);
              if (p.identity) lines.push(`身份：${p.identity}`);
              if (p.personality) lines.push(`性格：${p.personality}`);
              if (p.goldenFinger) lines.push(`金手指：${p.goldenFinger}`);
            }
          }
          if (Array.isArray(c.keySupporting) && c.keySupporting.length > 0) {
            if (lines.length > 0) lines.push('');
            lines.push('【重要配角/反派】');
            c.keySupporting.forEach((s: any) => {
              if (typeof s === 'string') {
                lines.push(`- ${s}`);
              } else {
                lines.push(`${s.name || '配角'}（${s.roleType || s.identity || ''}）：${s.description || ''}`);
              }
            });
          }
          return lines.join('\n');
        }
        return String(c);
      })();

      // 3. 提取与转义 主线大纲
      let mainLineStr = (() => {
        const m = rawOutline.mainPlot || rawOutline.main_plot || rawOutline.mainLine || rawOutline.main_line || rawOutline.plot || rawOutline.storyline;
        if (!m) return '';
        if (typeof m === 'string') return m;
        if (Array.isArray(m)) {
          return m.map((item, idx) => `${idx + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n');
        }
        if (typeof m === 'object') {
          const labelMap: Record<string, string> = { openingHook: '开局爆点', mainConflict: '核心矛盾', climaxEvents: '高潮大事件' };
          return Object.entries(m)
            .map(([k, v]) => {
              const label = labelMap[k] || k;
              const valStr = Array.isArray(v)
                ? '\n' + (v as string[]).map((e, i) => `${i + 1}. ${e}`).join('\n')
                : (typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
              return `【${label}】\n${valStr}`;
            })
            .join('\n\n');
        }
        return String(m);
      })();

      // 4. 强力智能兜底补全，防止页面全空
      if (!worldSettingStr.trim()) {
        worldSettingStr = `【世界背景】
故事发生在一个融合了《${idea.title}》奇幻色彩的世界中。题材归属于【${activeCategory}】，核心立意为：${idea.concept}。

【境界与力量体系】
1. 初始阶段：觉醒异能/获得基础功法，熟悉【${idea.goldLine || '专属金手指'}】基本规则。
2. 爆发阶段：突破常规瓶颈，以绝对优势碾压同阶对手。
3. 终极阶段：掌领规则，逆天改命，登顶世界之巅。

【核心规则】
遵守金手指【${idea.goldLine || '专属机制'}】的底层运转逻辑，主角每次化解危机均可获得法则级反馈与爽点提升。`;
      }

      if (!characterSettingStr.trim()) {
        characterSettingStr = `【主角】
身份：故事领衔主角，开局即觉醒【${idea.goldLine || '专属特殊挂钩'}】。
性格：行事果断、冷静克制、智商在线，绝不拖泥带水。
金手指：${idea.goldLine || '核心能力系统/特殊规则'}。

【重要配角/反派】
1. 傲慢宿敌（反派）：开局推波助澜，为主角提供打脸题材与升级阶梯。
2. 忠诚盟友（配角）：在关键时刻协助主角获取情报与资源。`;
      }

      if (!mainLineStr.trim()) {
        mainLineStr = `【开局爆点】
主角开局陷入危机，顺势激活【${idea.goldLine || '金手指'}】，当场反转打脸，树立爽感第一印象。

【核心矛盾】
围绕【${idea.concept}】展开的主线角逐，在不断破解阴谋的过程中实现战力与地位的双重飞跃。

【高潮大事件】
1. 首次绝地反击，轰动势力范围，引起高层关注。
2. 揭开世界底层秘密，直面终极反派，建立全新秩序。`;
      }

      const fullOutline: NovelOutline = {
        theme: rawOutline.theme || idea.concept || '',
        worldSetting: worldSettingStr,
        characterSetting: characterSettingStr,
        mainLine: mainLineStr,
        chaptersOutline: Array.isArray(rawOutline.chaptersOutline) ? rawOutline.chaptersOutline : []
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

  const handleSelectChapter = async (chNum: number) => {
    if (streamHook.isGenerating) {
      message.warning('大模型正在书写中，请勿切换章节！');
      return;
    }

    if (selectedNovel && streamHook.activeChapterNum && streamHook.activeChapterNum !== chNum) {
      // 切换章节前自动保存当前章节内容
      await saveChapterContentData(selectedNovel.id, streamHook.activeChapterNum, streamHook.chapterContent, false);
    }

    streamHook.setActiveChapterNum(chNum);
    localStorage.setItem('last_active_chapter_num', String(chNum));

    if (selectedOutline) {
      const currentChapter = selectedOutline.chaptersOutline.find(c => c.chapterNumber === chNum);
      streamHook.setIntervention(currentChapter?.interventionPrompt || '');
    }
    if (selectedNovel) {
      await loadChapterContent(selectedNovel.id, chNum);
    }
  };

  const handleDeleteChapter = async (e: React.MouseEvent, chapterNum: number) => {
    e.stopPropagation();
    if (!selectedNovel || !selectedOutline) return;

    Modal.confirm({
      title: '确认删除章节',
      content: `您确定要删除“第 ${chapterNum} 章”吗？`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const hideLoadingMsg = message.loading(`正在删除第 ${chapterNum} 章并重新整理目录...`, 0);
        try {
          const filtered = selectedOutline.chaptersOutline.filter(c => c.chapterNumber !== chapterNum);
          const reIndexed = filtered.map((c, idx) => {
            const nextNum = idx + 1;
            let newTitle = c.title;
            const regex = /^第\s*(\d+)\s*章/;
            if (regex.test(newTitle)) {
              newTitle = newTitle.replace(regex, `第 ${nextNum} 章`);
            }
            return { ...c, chapterNumber: nextNum, title: newTitle };
          });

          setSelectedOutline({ ...selectedOutline, chaptersOutline: reIndexed });

          let nextActiveNum = streamHook.activeChapterNum;
          if (streamHook.activeChapterNum === chapterNum) {
            nextActiveNum = reIndexed.length > 0 ? reIndexed[0].chapterNumber : 1;
            streamHook.setActiveChapterNum(nextActiveNum);
            if (reIndexed.length > 0) {
              await loadChapterContent(selectedNovel.id, nextActiveNum);
            } else {
              streamHook.setChapterContent('');
            }
          } else if (streamHook.activeChapterNum > chapterNum) {
            nextActiveNum = streamHook.activeChapterNum - 1;
            streamHook.setActiveChapterNum(nextActiveNum);
          }

          const newActiveChapter = reIndexed.find(c => c.chapterNumber === nextActiveNum);
          streamHook.setIntervention(newActiveChapter?.interventionPrompt || '');

          await httpService.post('/ai-novel/save-outline', {
            novelId: selectedNovel.id,
            chaptersOutline: reIndexed
          });

          message.success('章节已成功删除，后续章节数据已重新整理！');
        } catch (err: any) {
          message.error('删除章节失败，请重试');
        } finally {
          hideLoadingMsg();
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

  const handleConfirmBatchDelete = async () => {
    if (checkedChapters.length === 0 || !selectedNovel || !selectedOutline) {
      message.warning('请先勾选需要删除的章节');
      return;
    }

    const count = checkedChapters.length;
    const hideLoadingMsg = message.loading(`正在删除已选中的 ${count} 个章节...`, 0);
    try {
      const checkedSet = new Set(checkedChapters.map(n => Number(n)));
      const filtered = selectedOutline.chaptersOutline.filter(c => !checkedSet.has(Number(c.chapterNumber)));
      
      const reIndexed = filtered.map((c, idx) => {
        const nextNum = idx + 1;
        let newTitle = c.title;
        const regex = /^第\s*(\d+)\s*章/;
        if (regex.test(newTitle)) {
          newTitle = newTitle.replace(regex, `第 ${nextNum} 章`);
        }
        return { ...c, chapterNumber: nextNum, title: newTitle };
      });

      setSelectedOutline({ ...selectedOutline, chaptersOutline: reIndexed });

      let nextActiveNum = 1;
      if (reIndexed.length > 0) {
        nextActiveNum = reIndexed[0].chapterNumber;
        streamHook.setActiveChapterNum(nextActiveNum);
        await loadChapterContent(selectedNovel.id, nextActiveNum);
      } else {
        streamHook.setActiveChapterNum(1);
        streamHook.setChapterContent('');
      }

      const newActiveChapter = reIndexed.find(c => c.chapterNumber === nextActiveNum);
      streamHook.setIntervention(newActiveChapter?.interventionPrompt || '');

      await httpService.post('/ai-novel/save-outline', {
        novelId: selectedNovel.id,
        chaptersOutline: reIndexed,
        allowClear: true
      });

      setIsDeleteMode(false);
      setCheckedChapters([]);
      message.success(`已成功批量删除 ${count} 个章节！`);
    } catch (err: any) {
      console.error('批量删除失败:', err);
      message.error('批量删除失败，请重试');
    } finally {
      hideLoadingMsg();
    }
  };

  const toggleFullScreen = () => {
    const nextVal = !isFullScreen;
    setIsFullScreen(nextVal);
    if (nextVal) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
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
            onOpenConfig={openConfigDrawer}
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
            onOpenManualEdit={modalsHook.handleOpenManualEdit}
            setModifyField={modalsHook.setModifyField}
            setIsModifyModalOpen={modalsHook.setIsModifyModalOpen}
          />
        )}
        {view === 'editor' && (
          <EditorView
            selectedNovel={selectedNovel}
            selectedOutline={selectedOutline}
            setSelectedOutline={setSelectedOutline}
            activeChapterNum={streamHook.activeChapterNum}
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
            onOpenFanqieModal={fanqieHook.handleOpenFanqieModal}
            onExportTxt={handleExportTxt}
            isDeleteMode={isDeleteMode}
            setIsDeleteMode={setIsDeleteMode}
            checkedChapters={checkedChapters}
            setCheckedChapters={setCheckedChapters}
            onOpenBatchModal={() => {
              const chs = selectedOutline?.chaptersOutline || [];
              const hasCompleted = chs.some(c => c.status === 'completed' && (c.wordCount || 0) > 50);
              modalsHook.setBatchGenerateMode(hasCompleted ? 'append' : 'overwrite');
              modalsHook.setBatchModalOpen(true);
            }}
            onOpenFreeWrite={() => setIsFreeWriteOpen(true)}
            chapterSortAsc={chapterSortAsc}
            setChapterSortAsc={setChapterSortAsc}
            selectedVolumeNum={selectedVolumeNum}
            setSelectedVolumeNum={setSelectedVolumeNum}
            onSelectChapter={handleSelectChapter}
            toggleCheckChapter={toggleCheckChapter}
            onToggleSyncStatus={(num, isSynced) => fanqieHook.handleToggleSyncStatus(num, isSynced, setLoading)}
            onDeleteChapter={handleDeleteChapter}
            onAiRenameChapter={streamHook.handleAiRenameChapter}
            onManualRenameChapter={streamHook.handleManualRenameChapter}
            renamingChapter={streamHook.renamingChapter}
            chapterContent={streamHook.chapterContent}
            setChapterContent={streamHook.setChapterContent}
            isGenerating={streamHook.isGenerating}
            writingSpeed={streamHook.writingSpeed}
            showPolishPop={modalsHook.showPolishPop}
            setShowPolishPop={modalsHook.setShowPolishPop}
            selectedText={modalsHook.selectedText}
            setSelectedText={modalsHook.setSelectedText}
            selectedRange={modalsHook.selectedRange}
            setSelectedRange={modalsHook.setSelectedRange}
            polishInstruction={modalsHook.polishInstruction}
            setPolishInstruction={modalsHook.setPolishInstruction}
            polishing={modalsHook.polishing}
            onPolishText={() => modalsHook.handlePolishText(streamHook.chapterContent, streamHook.activeChapterNum)}
            polishedResult={modalsHook.polishedResult}
            onReplacePolishedText={() => modalsHook.handleReplacePolishedText(streamHook.chapterContent, streamHook.setChapterContent)}
            textRef={modalsHook.textRef as any}
            saveManualEdits={(content) => modalsHook.handleSaveManualEdit()}
            onSaveChapterContent={(showToast = true) => selectedNovel && saveChapterContentData(selectedNovel.id, streamHook.activeChapterNum, streamHook.chapterContent, showToast)}
            wordCountLimit={streamHook.wordCountLimit}
            setWordCountLimit={streamHook.setWordCountLimit}
            onContinueWriting={() => streamHook.handleContinueWriting(setLoading)}
            onWriteChapterStream={streamHook.handleWriteChapterStream}
            loading={loading}
            isPaused={streamHook.isPaused}
            setIsPaused={streamHook.setIsPaused}
            onPauseGeneration={streamHook.handlePauseGeneration}
            onStopGeneration={streamHook.handleStopGeneration}
            rightWidth={rightWidth}
            isResizingRight={isResizingRight}
            startResizeRight={startResizeRight}
            onOpenManualEdit={modalsHook.handleOpenManualEdit}
            intervention={streamHook.intervention}
            setIntervention={streamHook.setIntervention}
            httpService={httpService}
            message={message}
            setModifyField={modalsHook.setModifyField}
            setIsModifyModalOpen={modalsHook.setIsModifyModalOpen}
            setIsBackgroundSettingsModalOpen={modalsHook.setIsBackgroundSettingsModalOpen}
            isAnalyzingSys={modalsHook.isAnalyzingSys}
            onAnalyzeSystemAndCultivation={modalsHook.handleAnalyzeSystemAndCultivation}
            onOpenBatchAnalyzeModal={modalsHook.handleOpenBatchAnalyzeModal}
            onStartAddRelationship={modalsHook.handleStartAddRelationship}
            relSortAsc={relSortAsc}
            setRelSortAsc={setRelSortAsc}
            isAnalyzingRel={modalsHook.isAnalyzingRel}
            onAnalyzeRelationships={modalsHook.handleAnalyzeRelationships}
            activeRelNode={modalsHook.activeRelNode}
            setActiveRelNode={modalsHook.setActiveRelNode}
            onTogglePastStatus={modalsHook.handleTogglePastStatus}
            isDeslopping={streamHook.isDeslopping}
            onDeslopContent={streamHook.handleDeslopContent}
            onStartEditRelationship={modalsHook.handleStartEditRelationship}
            onDeleteRelationship={modalsHook.handleDeleteRelationship}
          />
        )}
      </Spin>

      {/* 弹窗抽屉统一声明 */}
      <BatchChaptersModal
        open={modalsHook.batchModalOpen}
        onCancel={() => modalsHook.setBatchModalOpen(false)}
        batchChapterCount={modalsHook.batchChapterCount}
        setBatchChapterCount={modalsHook.setBatchChapterCount}
        batchGenerateMode={modalsHook.batchGenerateMode}
        setBatchGenerateMode={modalsHook.setBatchGenerateMode}
        plotDirection={modalsHook.plotDirection}
        setPlotDirection={modalsHook.setPlotDirection}
        suggestingPlot={modalsHook.suggestingPlot}
        onFetchPlotSuggestion={modalsHook.handleFetchPlotSuggestion}
        isBatchGenerating={modalsHook.isBatchGenerating}
        onBatchGenerateChapters={() => modalsHook.handleBatchGenerateChapters(setSelectedNovel)}
        paperTheme={paperTheme}
      />

      <SuggestPlotModal
        open={modalsHook.suggestPlotModalOpen}
        onCancel={() => modalsHook.setSuggestPlotModalOpen(false)}
        suggestedPlotData={modalsHook.suggestedPlotData}
        suggestingPlot={modalsHook.suggestingPlot}
        refineInstruction={modalsHook.refineInstruction}
        setRefineInstruction={modalsHook.setRefineInstruction}
        onFetchPlotSuggestion={modalsHook.handleFetchPlotSuggestion}
        onAdoptSuggestion={(suggestion) => {
          modalsHook.setPlotDirection(suggestion);
          modalsHook.setSuggestPlotModalOpen(false);
          modalsHook.setRefineInstruction('');
          message.success('已成功采纳 AI 剧情建议并填入规划说明框！');
        }}
        paperTheme={paperTheme}
      />

      <FanqiePublishModal
        open={fanqieHook.fanqieModalOpen}
        onCancel={() => fanqieHook.setFanqieModalOpen(false)}
        isPublishingToFanqie={fanqieHook.isPublishingToFanqie}
        syncSelectMode={fanqieHook.syncSelectMode}
        setSyncSelectMode={fanqieHook.setSyncSelectMode}
        selectedPublishChapters={fanqieHook.selectedPublishChapters}
        setSelectedPublishChapters={fanqieHook.setSelectedPublishChapters}
        syncRangeStart={fanqieHook.syncRangeStart}
        setSyncRangeStart={fanqieHook.setSyncRangeStart}
        syncRangeEnd={fanqieHook.syncRangeEnd}
        setSyncRangeEnd={fanqieHook.setSyncRangeEnd}
        selectedOutline={selectedOutline}
        fanqieBookName={fanqieHook.fanqieBookName}
        setFanqieBookName={fanqieHook.setFanqieBookName}
        fanqieBookId={fanqieHook.fanqieBookId}
        setFanqieBookId={fanqieHook.setFanqieBookId}
        onSelectAllUnsynced={fanqieHook.handleSelectAllUnsynced}
        onPublishToFanqie={fanqieHook.handlePublishToFanqie}
        onBatchMarkSynced={fanqieHook.handleBatchMarkSynced}
        onExportChaptersTxt={fanqieHook.handleExportChaptersTxt}
        getSyncSummary={fanqieHook.getSyncSummary}
        paperTheme={paperTheme}
      />

      <AiModifyModal
        open={modalsHook.isModifyModalOpen}
        onCancel={() => {
          modalsHook.setIsModifyModalOpen(false);
          modalsHook.setModifyReqs('');
          modalsHook.setModifyResult('');
        }}
        modifyField={modalsHook.modifyField}
        modifyReqs={modalsHook.modifyReqs}
        setModifyReqs={modalsHook.setModifyReqs}
        modifyResult={modalsHook.modifyResult}
        setModifyResult={modalsHook.setModifyResult}
        modifyLoading={modalsHook.modifyLoading}
        onAiModifySetting={modalsHook.handleAiModifySetting}
        onApplyModifySetting={modalsHook.handleApplyModifySetting}
        view={view}
        draftOutline={draftOutline}
        selectedOutline={selectedOutline}
        paperTheme={paperTheme}
      />

      <RelationshipModal
        open={modalsHook.isRelModalOpen}
        onCancel={() => modalsHook.setIsRelModalOpen(false)}
        editingRel={modalsHook.editingRel}
        newRelName={modalsHook.newRelName}
        setNewRelName={modalsHook.setNewRelName}
        newRelRelationship={modalsHook.newRelRelationship}
        setNewRelRelationship={modalsHook.setNewRelRelationship}
        newRelAppearance={modalsHook.newRelAppearance}
        setNewRelAppearance={modalsHook.setNewRelAppearance}
        newRelDescription={modalsHook.newRelDescription}
        setNewRelDescription={modalsHook.setNewRelDescription}
        newRelIsPast={modalsHook.newRelIsPast}
        setNewRelIsPast={modalsHook.setNewRelIsPast}
        onSubmit={modalsHook.handleAddOrEditRelationshipSubmit}
        paperTheme={paperTheme}
      />

      <ManualEditModal
        open={modalsHook.isManualEditModalOpen}
        onCancel={() => modalsHook.setIsManualEditModalOpen(false)}
        title={modalsHook.manualEditTitle}
        value={modalsHook.manualEditValue}
        setValue={modalsHook.setManualEditValue}
        onSave={modalsHook.handleSaveManualEdit}
        paperTheme={paperTheme}
      />

      <BackgroundSettingsModal
        open={modalsHook.isBackgroundSettingsModalOpen}
        onCancel={() => modalsHook.setIsBackgroundSettingsModalOpen(false)}
        selectedOutline={selectedOutline}
        setSelectedOutline={setSelectedOutline}
        selectedNovel={selectedNovel}
        httpService={httpService}
        message={message}
        setModifyField={modalsHook.setModifyField}
        setIsModifyModalOpen={modalsHook.setIsModifyModalOpen}
        isAnalyzingSys={modalsHook.isAnalyzingSys}
        onAnalyzeSystemAndCultivation={modalsHook.handleAnalyzeSystemAndCultivation}
        onOpenBatchAnalyzeModal={modalsHook.handleOpenBatchAnalyzeModal}
        onStartAddRelationship={modalsHook.handleStartAddRelationship}
        relSortAsc={relSortAsc}
        setRelSortAsc={setRelSortAsc}
        isAnalyzingRel={modalsHook.isAnalyzingRel}
        onAnalyzeRelationships={modalsHook.handleAnalyzeRelationships}
        getProtagonistName={getProtagonistName}
        activeRelNode={modalsHook.activeRelNode}
        setActiveRelNode={modalsHook.setActiveRelNode}
        onTogglePastStatus={modalsHook.handleTogglePastStatus}
        onStartEditRelationship={modalsHook.handleStartEditRelationship}
        onDeleteRelationship={modalsHook.handleDeleteRelationship}
        paperTheme={paperTheme}
      />

      <BatchAnalyzeModal
        open={modalsHook.isBatchAnalyzeModalVisible}
        onCancel={() => modalsHook.setIsBatchAnalyzeModalVisible(false)}
        onRunBatchAnalyze={modalsHook.handleRunBatchAnalyze}
        isBatchAnalyzing={modalsHook.isBatchAnalyzing}
        batchAnalyzeSelectedChapters={modalsHook.batchAnalyzeSelectedChapters}
        setBatchAnalyzeSelectedChapters={modalsHook.setBatchAnalyzeSelectedChapters}
        batchAnalyzeTypes={modalsHook.batchAnalyzeTypes}
        setBatchAnalyzeTypes={modalsHook.setBatchAnalyzeTypes}
        selectedOutline={selectedOutline}
        paperTheme={paperTheme}
      />

      <InsertChapterModal
        open={modalsHook.isInsertModalOpen}
        onCancel={() => modalsHook.setIsInsertModalOpen(false)}
        onRunInsertChapter={modalsHook.handleRunInsertChapter}
        isInsertingChapter={modalsHook.isInsertingChapter}
        insertAfterChapterNum={modalsHook.insertAfterChapterNum}
        setInsertAfterChapterNum={modalsHook.setInsertAfterChapterNum}
        insertUserInstruction={modalsHook.insertUserInstruction}
        setInsertUserInstruction={modalsHook.setInsertUserInstruction}
        selectedOutline={selectedOutline}
        paperTheme={paperTheme}
      />

      {/* 先写后拆：自由创作 → 智能拆章 */}
      <FreeWriteModal
        open={isFreeWriteOpen}
        onCancel={() => setIsFreeWriteOpen(false)}
        novelId={selectedNovel?.id ?? null}
        lastChapterNum={
          selectedOutline?.chaptersOutline?.length > 0
            ? Math.max(...(selectedOutline.chaptersOutline.map((c: any) => parseInt(c.chapterNumber, 10))))
            : 0
        }
        onChaptersGenerated={() => {
          setIsFreeWriteOpen(false);
          if (selectedNovel) loadNovelToEditor(selectedNovel.id);
        }}
        paperTheme={paperTheme}
      />
    </div>
  );
};

export default AiNovelDashboard;
