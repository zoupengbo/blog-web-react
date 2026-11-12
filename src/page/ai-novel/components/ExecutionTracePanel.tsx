import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Badge, Button, Space, Popconfirm, Segmented, Select, Tag, Tooltip
} from 'antd';
import {
  ReloadOutlined, DeleteOutlined, CheckCircleFilled, CloseCircleFilled,
  LoadingOutlined, MinusCircleOutlined, CodeOutlined, FileTextOutlined,
  BranchesOutlined, DownOutlined, RightOutlined
} from '@ant-design/icons';
import VirtualList from 'rc-virtual-list';
import {
  PromptLogItem, PaperTheme, ExecutionTraceRun, ExecutionTraceStep, WordCountTimelineItem
} from '../types';
import { useTheme } from '../../../context/themeContext';

interface ExecutionTracePanelProps {
  novelId?: number;
  activeChapterNum?: number;
  isGenerating?: boolean;
  paperTheme: PaperTheme;
  promptLogs: PromptLogItem[];
  setPromptLogs: React.Dispatch<React.SetStateAction<PromptLogItem[]>>;
  liveTraceStepsById?: Record<string, ExecutionTraceStep[]>;
  activeLiveTraceId?: string | null;
  traceRefreshTick?: number;
  onClearLiveTrace?: (opts: { scope: 'current' | 'outline'; chapterNumber?: number }) => void;
  onOpenPromptDetail: (log: PromptLogItem) => void;
  httpService: any;
  message: any;
}

const STEP_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  lifecycle: { label: '流程', color: 'default' },
  preflight: { label: '预检', color: 'cyan' },
  outline: { label: '大纲', color: 'purple' },
  cascade: { label: '级联', color: 'magenta' },
  context: { label: '上下文', color: 'geekblue' },
  prompt: { label: '提示词', color: 'blue' },
  agent: { label: 'Agent', color: 'gold' },
  llm: { label: '模型调用', color: 'purple' },
  postprocess: { label: '后处理', color: 'orange' },
  review: { label: '审查', color: 'volcano' },
  rewrite: { label: '重写', color: 'lime' },
  gate: { label: '门禁', color: 'red' },
  persist: { label: '落盘', color: 'green' },
  persistence: { label: '落盘', color: 'green' },
  memory: { label: '记忆', color: 'cyan' }
};

function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '<0.1s';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildClientTimeline(steps: ExecutionTraceStep[]): WordCountTimelineItem[] {
  const timeline: WordCountTimelineItem[] = [];
  let prevAfterChars: number | null = null;
  for (const s of steps) {
    if (s.status === 'skipped' || !s.metrics || !s.metrics.isProseStep) continue;
    const afterChars = typeof s.metrics.afterChars === 'number' ? s.metrics.afterChars : null;
    if (afterChars === null) continue;
    const beforeChars = typeof s.metrics.beforeChars === 'number' ? s.metrics.beforeChars : prevAfterChars;
    const deltaChars = typeof s.metrics.deltaChars === 'number'
      ? s.metrics.deltaChars
      : (beforeChars !== null ? afterChars - beforeChars : afterChars);
    const deltaFromPrevStage = prevAfterChars !== null ? afterChars - prevAfterChars : afterChars;
    timeline.push({
      sequence: s.sequence,
      stepId: s.stepId,
      stepKey: s.stepKey,
      stepName: s.stepName,
      stepType: s.stepType,
      stageLabel: s.metrics.stageLabel || s.stepName,
      status: s.status,
      beforeChars,
      afterChars,
      deltaChars,
      deltaFromPrevStage,
      beforeParagraphs: s.metrics.beforeParagraphs ?? null,
      afterParagraphs: s.metrics.afterParagraphs ?? null,
      deltaParagraphs: s.metrics.deltaParagraphs ?? null,
      modified: Boolean(s.metrics.modified),
      contentHash: s.metrics.contentHash || null,
      durationMs: s.durationMs || 0
    });
    prevAfterChars = afterChars;
  }
  return timeline;
}

function buildRunFromLiveSteps(traceId: string, rawSteps: ExecutionTraceStep[]): ExecutionTraceRun | null {
  if (!rawSteps || rawSteps.length === 0) return null;
  const steps = [...rawSteps].sort((a, b) => (a.sequence - b.sequence) || String(a.stepId).localeCompare(String(b.stepId)));
  const firstStep = steps[0];
  const terminalStep = steps.find(s => s.stepKey === 'generation_complete');
  const hasRunning = steps.some(s => s.status === 'running');
  const hasFailed = steps.some(s => s.status === 'failed');

  let status = 'running';
  if (terminalStep) {
    status = terminalStep.status === 'failed' ? 'failed' : (hasRunning ? 'running' : 'success');
  } else if (!hasRunning && hasFailed) {
    status = 'failed';
  } else if (!hasRunning) {
    status = 'success';
  }

  const startTimes = steps.map(s => (s.startedAt ? new Date(s.startedAt.replace(' ', 'T')).getTime() : NaN)).filter(n => !isNaN(n));
  const finishTimes = steps.map(s => (s.finishedAt ? new Date(s.finishedAt.replace(' ', 'T')).getTime() : NaN)).filter(n => !isNaN(n));
  const minStart = startTimes.length > 0 ? Math.min(...startTimes) : null;
  const maxFinish = finishTimes.length > 0 ? Math.max(...finishTimes) : null;
  const durationMs = (terminalStep && terminalStep.durationMs && terminalStep.durationMs > 0)
    ? terminalStep.durationMs
    : (minStart !== null && maxFinish !== null ? Math.max(0, maxFinish - minStart) : steps.reduce((acc, s) => (!s.parentStepId ? acc + (s.durationMs || 0) : acc), 0));

  const timeline = buildClientTimeline(steps);
  const persistStep = [...steps].reverse().find(s => s.stepKey === 'atomic_persist' && s.status === 'success');
  const persistedWordCount = persistStep?.metrics?.afterChars ?? null;
  const persistedContentHash = persistStep?.metrics?.contentHash ?? null;
  const persistedChapterTitle = persistStep?.metrics?.chapterTitle ?? null;

  const initialEntry = timeline.find(w => w.stepKey === 'prose_writer' || w.stepKey === 'single_agent_stream' || w.stepType === 'agent') || timeline[0] || null;
  const initialDraftChars = initialEntry ? initialEntry.afterChars : null;
  const finalChars = persistedWordCount !== null ? persistedWordCount : (timeline.length > 0 ? timeline[timeline.length - 1].afterChars : null);
  const totalNetDeltaChars = initialDraftChars !== null && finalChars !== null ? finalChars - initialDraftChars : null;

  return {
    traceId,
    novelId: firstStep.novelId ?? null,
    chapterNumber: firstStep.chapterNumber ?? null,
    scopeType: firstStep.scopeType || 'chapter',
    status,
    startedAt: firstStep.startedAt || null,
    finishedAt: firstStep.finishedAt || null,
    durationMs,
    stepCount: steps.length,
    llmCallCount: steps.filter(s => Boolean(s.promptLogId)).length,
    successCount: steps.filter(s => s.status === 'success').length,
    failedCount: steps.filter(s => s.status === 'failed').length,
    skippedCount: steps.filter(s => s.status === 'skipped').length,
    persistedWordCount,
    persistedContentHash,
    persistedChapterTitle,
    summary: {
      initialDraftChars,
      finalChars,
      totalNetDeltaChars,
      wordCountTimeline: timeline
    },
    steps
  };
}

export const ExecutionTracePanel: React.FC<ExecutionTracePanelProps> = ({
  novelId,
  activeChapterNum,
  isGenerating = false,
  paperTheme,
  promptLogs,
  setPromptLogs,
  liveTraceStepsById = {},
  activeLiveTraceId = null,
  traceRefreshTick = 0,
  onClearLiveTrace,
  onOpenPromptDetail,
  httpService,
  message
}) => {
  const { isDark } = useTheme();
  const isDarkSurface = isDark || paperTheme === 'dark';

  const [scope, setScope] = useState<'current' | 'outline'>('current');
  const [viewTab, setViewTab] = useState<'timeline' | 'wordcount'>('timeline');
  const [persistedRunsMap, setPersistedRunsMap] = useState<Record<string, ExecutionTraceRun>>({});
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [loadingTraces, setLoadingTraces] = useState<boolean>(false);
  const [loadingPromptId, setLoadingPromptId] = useState<number | null>(null);
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  // 高对比度安全色彩矩阵（遵循暗黑模式对比度防反白铁律）
  const palette = useMemo(() => {
    if (isDarkSurface) {
      return {
        panelBg: '#18181f',
        headerBg: '#22222c',
        cardBg: '#1f1f28',
        subCardBg: '#16161d',
        border: '#2e2e3a',
        divider: '#282833',
        textPrimary: '#f4f4f5',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        accent: '#ffd666',
        highlightBg: 'rgba(24, 144, 255, 0.14)',
        errorBg: 'rgba(255, 77, 79, 0.14)',
        errorBorder: 'rgba(255, 77, 79, 0.35)',
        errorText: '#ff7875',
        skippedBg: 'rgba(113, 113, 122, 0.12)',
        successBg: 'rgba(82, 196, 26, 0.12)',
        successText: '#73d13d'
      };
    }
    return {
      panelBg: '#ffffff',
      headerBg: '#f8fafc',
      cardBg: '#ffffff',
      subCardBg: '#f8fafc',
      border: '#e2e8f0',
      divider: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      accent: '#1677ff',
      highlightBg: '#eff6ff',
      errorBg: '#fff1f0',
      errorBorder: '#ffccc7',
      errorText: '#cf1322',
      skippedBg: '#f8fafc',
      successBg: '#f6ffed',
      successText: '#389e0d'
    };
  }, [isDarkSurface]);

  const fetchExecutionTraces = useCallback(async (chapNum?: number) => {
    if (!novelId) return;
    setLoadingTraces(true);
    try {
      const url = chapNum
        ? `/ai-novel/execution-traces?novelId=${novelId}&chapterNumber=${chapNum}&limit=20`
        : `/ai-novel/execution-traces?novelId=${novelId}&limit=30`;
      const res: any = await httpService.get(url);
      if (res?.code === 200 && Array.isArray(res?.data?.runs)) {
        setPersistedRunsMap(prev => {
          const next = chapNum ? { ...prev } : {};
          for (const r of res.data.runs as ExecutionTraceRun[]) {
            if (r?.traceId) {
              next[r.traceId] = r;
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error('获取生成过程追踪失败:', err);
    } finally {
      setLoadingTraces(false);
    }
  }, [novelId, httpService]);

  const fetchPromptLogsForLegacy = useCallback(async (chapNum?: number) => {
    if (!novelId) return;
    try {
      const url = chapNum
        ? `/ai-novel/prompt-logs?novelId=${novelId}&chapterNumber=${chapNum}&limit=200`
        : `/ai-novel/prompt-logs?novelId=${novelId}&limit=500`;
      const res: any = await httpService.get(url);
      if (res?.code === 200 && Array.isArray(res.data)) {
        if (chapNum) {
          setPromptLogs(prev => {
            const otherLogs = (prev || []).filter(p => Number(p.chapterNumber) !== Number(chapNum));
            return [...res.data, ...otherLogs].sort((a, b) => (b.id || 0) - (a.id || 0));
          });
        } else {
          setPromptLogs(res.data);
        }
      }
    } catch (err) {
      console.error('获取历史 Prompt 轨迹失败:', err);
    }
  }, [novelId, httpService, setPromptLogs]);

  // 切换小说时重置本地运行缓存并全量拉取最新 30 条轨迹
  useEffect(() => {
    setPersistedRunsMap({});
    setSelectedTraceId(null);
    if (!novelId) return;
    fetchExecutionTraces();
    fetchPromptLogsForLegacy();
  }, [novelId, fetchExecutionTraces, fetchPromptLogsForLegacy]);

  // 切换章节时确保历史章节也能及时拉到专属追踪记录
  useEffect(() => {
    if (!novelId || !activeChapterNum) return;
    fetchExecutionTraces(activeChapterNum);
  }, [novelId, activeChapterNum, fetchExecutionTraces]);

  // 外部生成完成或显式刷新信号触发
  useEffect(() => {
    if (!novelId || traceRefreshTick <= 0) return;
    fetchExecutionTraces(activeChapterNum);
    fetchPromptLogsForLegacy(activeChapterNum);
  }, [novelId, activeChapterNum, traceRefreshTick, fetchExecutionTraces, fetchPromptLogsForLegacy]);

  // 合并服务端持久化的 runs 与当前内存中的 SSE 实时 steps
  const allMergedRuns = useMemo(() => {
    const mergedMap: Record<string, ExecutionTraceRun> = { ...persistedRunsMap };

    for (const [traceId, liveSteps] of Object.entries(liveTraceStepsById || {})) {
      if (!liveSteps || liveSteps.length === 0) continue;
      if (novelId && liveSteps.some(s => s.novelId && Number(s.novelId) !== Number(novelId))) {
        continue;
      }
      const existing = mergedMap[traceId];
      if (!existing) {
        const built = buildRunFromLiveSteps(traceId, liveSteps);
        if (built) mergedMap[traceId] = built;
      } else {
        // 合并实时到达但可能尚未在旧快照中的步骤
        const stepById = new Map<string, ExecutionTraceStep>();
        for (const s of existing.steps || []) stepById.set(s.stepId, s);
        for (const ls of liveSteps) {
          const prev = stepById.get(ls.stepId);
          if (!prev || prev.status === 'running' || (ls.status !== 'running' && prev.status !== ls.status)) {
            stepById.set(ls.stepId, {
              ...prev,
              ...ls,
              promptMeta: prev?.promptMeta || ls.promptMeta || null
            });
          }
        }
        const mergedSteps = Array.from(stepById.values());
        const rebuilt = buildRunFromLiveSteps(traceId, mergedSteps);
        if (rebuilt) {
          mergedMap[traceId] = {
            ...existing,
            ...rebuilt,
            persistedWordCount: rebuilt.persistedWordCount ?? existing.persistedWordCount ?? null,
            persistedContentHash: rebuilt.persistedContentHash ?? existing.persistedContentHash ?? null,
            persistedChapterTitle: rebuilt.persistedChapterTitle ?? existing.persistedChapterTitle ?? null,
            maxStepId: existing.maxStepId
          };
        }
      }
    }

    return Object.values(mergedMap).sort((a, b) => {
      const timeA = a.startedAt ? new Date(a.startedAt.replace(' ', 'T')).getTime() : 0;
      const timeB = b.startedAt ? new Date(b.startedAt.replace(' ', 'T')).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.maxStepId || 0) - (a.maxStepId || 0);
    });
  }, [persistedRunsMap, liveTraceStepsById, novelId]);

  const currentChapterRuns = useMemo(() => {
    if (!activeChapterNum) return [];
    return allMergedRuns.filter(r => r.scopeType !== 'outline' && Number(r.chapterNumber) === Number(activeChapterNum));
  }, [allMergedRuns, activeChapterNum]);

  const outlineRuns = useMemo(() => {
    return allMergedRuns.filter(r => r.scopeType === 'outline' || r.chapterNumber === null || r.chapterNumber === undefined);
  }, [allMergedRuns]);

  const scopeRuns = scope === 'outline' ? outlineRuns : currentChapterRuns;

  // 兼容升级前的历史 Prompt 日志兜底
  const currentChapterLegacyLogs = useMemo(() => {
    if (!promptLogs || !Array.isArray(promptLogs) || !activeChapterNum) return [];
    return promptLogs.filter((log: PromptLogItem) => Number(log.chapterNumber) === Number(activeChapterNum));
  }, [promptLogs, activeChapterNum]);

  const outlineLegacyLogs = useMemo(() => {
    if (!promptLogs || !Array.isArray(promptLogs)) return [];
    return promptLogs.filter((log: PromptLogItem) => (
      log.chapterNumber === null ||
      log.chapterNumber === undefined ||
      log.stepName?.includes('大纲') ||
      log.stepName?.includes('规划') ||
      log.stepName?.includes('设定') ||
      log.stepName?.includes('Story') ||
      log.stepName?.includes('决策') ||
      log.stepName?.includes('审计') ||
      log.stepName?.includes('灵感') ||
      log.stepName?.includes('基调')
    ));
  }, [promptLogs]);

  const displayedLegacyLogs = scope === 'outline' ? outlineLegacyLogs : currentChapterLegacyLogs;

  // 生成中优先自动聚焦当前实时 traceId；否则保证选中列表内存在的最新批次
  useEffect(() => {
    if (activeLiveTraceId && scopeRuns.some(r => r.traceId === activeLiveTraceId)) {
      if (isGenerating || !selectedTraceId || !scopeRuns.some(r => r.traceId === selectedTraceId)) {
        setSelectedTraceId(activeLiveTraceId);
        return;
      }
    }
    if (scopeRuns.length === 0) {
      if (selectedTraceId !== null) setSelectedTraceId(null);
      return;
    }
    if (!selectedTraceId || !scopeRuns.some(r => r.traceId === selectedTraceId)) {
      setSelectedTraceId(scopeRuns[0].traceId);
    }
  }, [activeLiveTraceId, isGenerating, scopeRuns, selectedTraceId]);

  const selectedRun = useMemo(() => {
    if (!selectedTraceId) return scopeRuns[0] || null;
    return scopeRuns.find(r => r.traceId === selectedTraceId) || scopeRuns[0] || null;
  }, [scopeRuns, selectedTraceId]);

  // 计算父子层级深度用于树形缩进展示
  const stepDepthMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!selectedRun?.steps) return map;
    const parentLookup: Record<string, string | null | undefined> = {};
    for (const s of selectedRun.steps) {
      parentLookup[s.stepId] = s.parentStepId;
    }
    for (const s of selectedRun.steps) {
      let depth = 0;
      let cur = s.parentStepId;
      const guard = new Set<string>();
      while (cur && parentLookup[cur] !== undefined && depth < 3 && !guard.has(cur)) {
        guard.add(cur);
        depth += 1;
        cur = parentLookup[cur];
      }
      if (s.parentStepId && depth === 0) depth = 1;
      map[s.stepId] = depth;
    }
    return map;
  }, [selectedRun]);

  const handleViewPromptForStep = async (promptLogId: number) => {
    const cached = (promptLogs || []).find(l => Number(l.id) === Number(promptLogId));
    if (cached && (cached.systemPrompt || cached.userPrompt || cached.output)) {
      onOpenPromptDetail(cached);
      return;
    }
    setLoadingPromptId(promptLogId);
    try {
      const res: any = await httpService.get(`/ai-novel/prompt-logs?id=${promptLogId}`);
      const list = res?.data;
      if (res?.code === 200 && Array.isArray(list) && list.length > 0) {
        const fetchedLog: PromptLogItem = list[0];
        setPromptLogs(prev => {
          const exists = (prev || []).some(p => Number(p.id) === Number(fetchedLog.id));
          return exists
            ? (prev || []).map(p => (Number(p.id) === Number(fetchedLog.id) ? fetchedLog : p))
            : [fetchedLog, ...(prev || [])];
        });
        onOpenPromptDetail(fetchedLog);
      } else {
        message.warning('未找到对应的完整 Prompt 记录，可能已被清理');
      }
    } catch (err: any) {
      message.error('加载 Prompt 详情失败: ' + (err?.message || err));
    } finally {
      setLoadingPromptId(null);
    }
  };

  const handleClearTraces = async () => {
    if (!novelId) return;
    const isCurrent = scope === 'current' && activeChapterNum;
    const isOutline = scope === 'outline';
    try {
      if (scopeRuns.length > 0) {
        await httpService.post('/ai-novel/clear-execution-traces', {
          novelId,
          chapterNumber: isCurrent ? activeChapterNum : undefined,
          scope: isOutline ? 'outline' : undefined
        });
        setPersistedRunsMap(prev => {
          const next: Record<string, ExecutionTraceRun> = {};
          for (const [tid, run] of Object.entries(prev)) {
            if (isOutline && (run.scopeType === 'outline' || run.chapterNumber === null)) continue;
            if (isCurrent && run.scopeType !== 'outline' && Number(run.chapterNumber) === Number(activeChapterNum)) continue;
            next[tid] = run;
          }
          return next;
        });
        if (onClearLiveTrace) {
          onClearLiveTrace({ scope, chapterNumber: activeChapterNum });
        }
        message.success(
          isCurrent
            ? `已清空第 ${activeChapterNum} 章生成过程追踪`
            : '已清空大纲全局生成过程追踪'
        );
      } else if (displayedLegacyLogs.length > 0) {
        await httpService.post('/ai-novel/clear-prompt-logs', {
          novelId,
          chapterNumber: isCurrent ? activeChapterNum : undefined,
          scope: isOutline ? 'outline' : undefined
        });
        if (isCurrent) {
          setPromptLogs(prev => (prev || []).filter(p => Number(p.chapterNumber) !== Number(activeChapterNum)));
        } else if (isOutline) {
          setPromptLogs(prev => (prev || []).filter(p => p.chapterNumber !== null && p.chapterNumber !== undefined));
        }
        message.success('已清空历史 Prompt 调用记录');
      }
    } catch (e: any) {
      message.error('清空过程追踪失败: ' + (e?.message || e));
    }
  };

  const renderStatusIcon = (status: string) => {
    if (status === 'running') return <LoadingOutlined spin style={{ color: '#1890ff', fontSize: 13 }} />;
    if (status === 'failed' || status === 'error') return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 13 }} />;
    if (status === 'skipped') return <MinusCircleOutlined style={{ color: palette.textMuted, fontSize: 13 }} />;
    return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 13 }} />;
  };

  const renderRunStatusTag = (status: string) => {
    if (status === 'running') return <Tag color="processing" style={{ margin: 0 }}>运行中</Tag>;
    if (status === 'failed' || status === 'error') return <Tag color="error" style={{ margin: 0 }}>失败/阻断</Tag>;
    return <Tag color="success" style={{ margin: 0 }}>成功</Tag>;
  };

  const toggleExpandStep = (stepId: string) => {
    setExpandedStepIds(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const timeline = selectedRun?.summary?.wordCountTimeline || [];

  return (
    <Card
      className="prompt-trajectory-card execution-trace-card"
      title={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space size="small">
              <span>🧭 AI 生成过程追踪器</span>
              <Badge
                count={scopeRuns.length > 0 ? scopeRuns.length : displayedLegacyLogs.length}
                overflowCount={999}
                style={{ backgroundColor: scope === 'current' ? '#1890ff' : '#722ed1' }}
              />
            </Space>
            <Space size={6}>
              <Button
                size="small"
                type="link"
                icon={<ReloadOutlined spin={loadingTraces} />}
                style={{ color: palette.accent, padding: 0 }}
                title="刷新生成过程追踪"
                onClick={() => {
                  fetchExecutionTraces(scope === 'current' ? activeChapterNum : undefined);
                  fetchPromptLogsForLegacy(scope === 'current' ? activeChapterNum : undefined);
                }}
              />
              <Popconfirm
                title={
                  scope === 'outline'
                    ? '确定清空所有大纲/全局生成过程追踪记录吗？'
                    : (activeChapterNum ? `确定清空第 ${activeChapterNum} 章的生成过程追踪吗？` : '确定清空当前章节的过程追踪吗？')
                }
                onConfirm={handleClearTraces}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  size="small"
                  type="link"
                  icon={<DeleteOutlined />}
                  style={{ color: '#ff4d4f', padding: 0 }}
                  title="清空过程追踪"
                />
              </Popconfirm>
            </Space>
          </div>
          <Segmented
            size="small"
            value={scope}
            onChange={(val) => setScope(val as 'current' | 'outline')}
            options={[
              {
                label: activeChapterNum
                  ? `第 ${activeChapterNum} 章 (${currentChapterRuns.length || currentChapterLegacyLogs.length})`
                  : `正文 (${currentChapterRuns.length})`,
                value: 'current',
              },
              {
                label: `大纲 (${outlineRuns.length || outlineLegacyLogs.length})`,
                value: 'outline',
              },
            ]}
            block
          />
        </div>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {scopeRuns.length === 0 && displayedLegacyLogs.length === 0 ? (
        <div className="prompt-trail-empty">
          <div className="prompt-trail-empty-text">
            {loadingTraces
              ? '正在加载生成过程追踪...'
              : (scope === 'outline'
                ? '暂无大纲过程追踪记录'
                : (activeChapterNum ? `第 ${activeChapterNum} 章暂无生成过程追踪` : '暂无生成过程追踪记录'))}
          </div>
          <Space size="small">
            {scope === 'current' ? (
              <Button
                size="small"
                type="link"
                style={{ fontSize: 11, padding: 0 }}
                onClick={() => setScope('outline')}
              >
                查看大纲追踪 ({outlineRuns.length || outlineLegacyLogs.length})
              </Button>
            ) : (
              <Button
                size="small"
                type="link"
                style={{ fontSize: 11, padding: 0 }}
                onClick={() => setScope('current')}
              >
                查看第 {activeChapterNum || 1} 章追踪
              </Button>
            )}
            <span className="prompt-trail-divider">|</span>
            <Button
              size="small"
              type="link"
              style={{ fontSize: 11, padding: 0 }}
              onClick={() => fetchExecutionTraces(scope === 'current' ? activeChapterNum : undefined)}
            >
              刷新
            </Button>
          </Space>
        </div>
      ) : scopeRuns.length > 0 && selectedRun ? (
        <div style={{ padding: 10, backgroundColor: palette.panelBg, color: palette.textPrimary }}>
          {/* 批次选择器 */}
          <div style={{ marginBottom: 8 }}>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={selectedRun.traceId}
              onChange={(val) => setSelectedTraceId(val)}
              options={scopeRuns.map((r, idx) => {
                const statusLabel = r.status === 'running' ? '进行中' : (r.status === 'failed' ? '失败' : '成功');
                const timeShort = r.startedAt ? r.startedAt.slice(5, 19) : '';
                const words = r.persistedWordCount ?? r.summary?.finalChars;
                return {
                  value: r.traceId,
                  label: `${idx === 0 ? '🆕 ' : ''}[${statusLabel}] ${r.stepCount}步/${r.llmCallCount}AI${words ? ` · ${words}字` : ''} · ${formatDuration(r.durationMs)} (${timeShort || r.traceId.slice(-6)})`
                };
              })}
            />
          </div>

          {/* 批次概览 KPI 条 */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              backgroundColor: palette.headerBg,
              border: `1px solid ${palette.border}`,
              marginBottom: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Space size={6}>
                {renderRunStatusTag(selectedRun.status)}
                <span style={{ fontSize: 11, color: palette.textSecondary, fontFamily: 'monospace' }}>
                  {selectedRun.traceId}
                </span>
              </Space>
              <span style={{ fontSize: 11, color: palette.textSecondary }}>
                总耗时 <b style={{ color: palette.textPrimary }}>{formatDuration(selectedRun.durationMs)}</b>
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: palette.textSecondary }}>
              <span>步骤 <b>{selectedRun.stepCount}</b></span>
              <span>·</span>
              <span>AI调用 <b>{selectedRun.llmCallCount}</b></span>
              {selectedRun.skippedCount > 0 && (
                <>
                  <span>·</span>
                  <span>跳过 <b>{selectedRun.skippedCount}</b></span>
                </>
              )}
              {selectedRun.failedCount > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: palette.errorText }}>异常 <b>{selectedRun.failedCount}</b></span>
                </>
              )}
            </div>

            {(selectedRun.persistedWordCount !== null && selectedRun.persistedWordCount !== undefined) || selectedRun.summary?.initialDraftChars !== null ? (
              <div
                style={{
                  paddingTop: 5,
                  borderTop: `1px dashed ${palette.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 4,
                  fontSize: 11
                }}
              >
                <span style={{ color: palette.textSecondary }}>
                  {selectedRun.summary?.initialDraftChars !== null ? (
                    <>
                      初稿 <b style={{ color: palette.textPrimary }}>{selectedRun.summary.initialDraftChars}</b> 字 →{' '}
                    </>
                  ) : null}
                  {selectedRun.persistedWordCount !== null && selectedRun.persistedWordCount !== undefined ? (
                    <>
                      落盘 <b style={{ color: palette.successText }}>{selectedRun.persistedWordCount}</b> 字
                    </>
                  ) : selectedRun.summary?.finalChars !== null ? (
                    <>
                      当前 <b style={{ color: palette.textPrimary }}>{selectedRun.summary.finalChars}</b> 字
                    </>
                  ) : null}
                  {selectedRun.summary?.totalNetDeltaChars !== null && selectedRun.summary?.totalNetDeltaChars !== undefined ? (
                    <span
                      style={{
                        marginLeft: 6,
                        fontWeight: 600,
                        color: selectedRun.summary.totalNetDeltaChars > 0
                          ? '#fa8c16'
                          : (selectedRun.summary.totalNetDeltaChars < 0 ? '#52c41a' : palette.textMuted)
                      }}
                    >
                      ({selectedRun.summary.totalNetDeltaChars >= 0 ? `+${selectedRun.summary.totalNetDeltaChars}` : selectedRun.summary.totalNetDeltaChars}字)
                    </span>
                  ) : null}
                </span>
                {selectedRun.persistedContentHash && (
                  <Tooltip title={`最终落盘正文 SHA-256: ${selectedRun.persistedContentHash}`}>
                    <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', fontFamily: 'monospace' }}>
                      SHA:{selectedRun.persistedContentHash.slice(0, 8)}
                    </Tag>
                  </Tooltip>
                )}
              </div>
            ) : null}
          </div>

          {/* 视图切换：执行时间线 / 字数变化追踪表 */}
          <div style={{ marginBottom: 8 }}>
            <Segmented
              size="small"
              block
              value={viewTab}
              onChange={(v) => setViewTab(v as 'timeline' | 'wordcount')}
              options={[
                {
                  label: (
                    <Space size={4}>
                      <BranchesOutlined />
                      <span>执行时间线 ({selectedRun.steps.length})</span>
                    </Space>
                  ),
                  value: 'timeline'
                },
                {
                  label: (
                    <Space size={4}>
                      <FileTextOutlined />
                      <span>字数变化追踪 ({timeline.length})</span>
                    </Space>
                  ),
                  value: 'wordcount'
                }
              ]}
            />
          </div>

          {viewTab === 'timeline' ? (
            <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedRun.steps.map((step) => {
                const depth = stepDepthMap[step.stepId] || 0;
                const typeMeta = STEP_TYPE_LABELS[step.stepType || 'lifecycle'] || { label: step.stepType || '步骤', color: 'default' };
                const hasPromptLink = Boolean(step.promptLogId);
                const isSkipped = step.status === 'skipped';
                const isFailed = step.status === 'failed' || step.status === 'error';
                const isExpanded = Boolean(expandedStepIds[step.stepId]);
                const hasDetails = Boolean(step.inputSummary || step.outputSummary || step.errorMessage);
                const metrics = step.metrics;

                return (
                  <div
                    key={step.stepId}
                    style={{
                      marginLeft: depth * 12,
                      padding: '7px 9px',
                      borderRadius: 6,
                      backgroundColor: isFailed
                        ? palette.errorBg
                        : (isSkipped ? palette.skippedBg : palette.cardBg),
                      border: `1px solid ${isFailed ? palette.errorBorder : palette.border}`,
                      borderLeftWidth: depth > 0 ? 3 : 1,
                      borderLeftColor: depth > 0 ? (isFailed ? '#ff4d4f' : '#1890ff') : (isFailed ? palette.errorBorder : palette.border),
                      opacity: isSkipped ? 0.78 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        {renderStatusIcon(step.status)}
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: palette.textMuted, flexShrink: 0 }}>
                          #{step.sequence}
                        </span>
                        <Tag color={typeMeta.color} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', flexShrink: 0 }}>
                          {typeMeta.label}
                        </Tag>
                        <Tooltip title={step.stepName}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: isFailed ? palette.errorText : (isSkipped ? palette.textMuted : palette.textPrimary),
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {step.stepName}
                          </span>
                        </Tooltip>
                      </div>
                      <Space size={4} style={{ flexShrink: 0 }}>
                        {!isSkipped && (
                          <span style={{ fontSize: 10, color: palette.textMuted }}>
                            {formatDuration(step.durationMs)}
                          </span>
                        )}
                        {hasPromptLink && step.promptLogId && (
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            icon={<CodeOutlined />}
                            loading={loadingPromptId === step.promptLogId}
                            style={{ fontSize: 10, padding: '0 6px', height: 20, lineHeight: '18px' }}
                            onClick={() => handleViewPromptForStep(step.promptLogId as number)}
                          >
                            Prompt
                          </Button>
                        )}
                      </Space>
                    </div>

                    {/* 真实指标胶囊行（仅在字段真实存在时展示，不捏造数值） */}
                    {(metrics?.isProseStep || step.promptMeta?.model || metrics?.score !== undefined || isSkipped) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                        {isSkipped && (
                          <Tag style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', color: palette.textMuted }}>
                            条件未触发·已跳过
                          </Tag>
                        )}
                        {metrics?.isProseStep && typeof metrics.afterChars === 'number' && (
                          <Tag
                            color={
                              typeof metrics.deltaChars === 'number' && metrics.deltaChars !== 0
                                ? (metrics.deltaChars > 0 ? 'orange' : 'green')
                                : 'blue'
                            }
                            style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}
                          >
                            {metrics.beforeChars !== null && metrics.beforeChars !== undefined
                              ? `${metrics.beforeChars}→${metrics.afterChars}字 (${(metrics.deltaChars || 0) >= 0 ? '+' : ''}${metrics.deltaChars || 0})`
                              : `产出 ${metrics.afterChars} 字`}
                          </Tag>
                        )}
                        {typeof metrics?.score === 'number' && (
                          <Tag color={metrics.score >= 80 ? 'green' : 'volcano'} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}>
                            评分 {metrics.score}
                          </Tag>
                        )}
                        {step.promptMeta?.model && (
                          <Tag color="purple" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px' }}>
                            {step.promptMeta.model}
                          </Tag>
                        )}
                      </div>
                    )}

                    {/* 摘要与错误详情（可点击展开完整内容） */}
                    {hasDetails && (
                      <div style={{ marginTop: 4 }}>
                        {step.outputSummary && (
                          <div
                            onClick={() => toggleExpandStep(step.stepId)}
                            style={{
                              fontSize: 11,
                              color: palette.textSecondary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 4,
                              lineHeight: 1.45
                            }}
                          >
                            <span style={{ marginTop: 2, fontSize: 9, color: palette.textMuted, flexShrink: 0 }}>
                              {isExpanded ? <DownOutlined /> : <RightOutlined />}
                            </span>
                            <span
                              style={
                                isExpanded
                                  ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                                  : {
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }
                              }
                            >
                              {step.outputSummary}
                            </span>
                          </div>
                        )}
                        {(isExpanded || !step.outputSummary) && step.inputSummary && (
                          <div
                            onClick={() => toggleExpandStep(step.stepId)}
                            style={{
                              fontSize: 11,
                              color: palette.textMuted,
                              marginTop: 2,
                              paddingLeft: 13,
                              cursor: 'pointer',
                              whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                              overflow: isExpanded ? 'visible' : 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word'
                            }}
                          >
                            输入: {step.inputSummary}
                          </div>
                        )}
                        {step.errorMessage && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: '4px 6px',
                              borderRadius: 4,
                              backgroundColor: palette.errorBg,
                              border: `1px solid ${palette.errorBorder}`,
                              color: palette.errorText,
                              fontSize: 11,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            异常: {step.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {timeline.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: palette.textMuted }}>
                  本次运行尚无带正文字数指标的步骤（例如仅包含大纲规划或前置校验）
                </div>
              ) : (
                <>
                  {timeline.map((item, idx) => {
                    const isPersistedMatch = Boolean(
                      selectedRun.persistedContentHash &&
                      item.contentHash &&
                      item.contentHash === selectedRun.persistedContentHash &&
                      item.stepKey === 'atomic_persist'
                    );
                    const deltaColor = item.deltaChars > 0
                      ? '#fa8c16'
                      : (item.deltaChars < 0 ? palette.successText : palette.textMuted);

                    return (
                      <div
                        key={item.stepId}
                        style={{
                          padding: '7px 9px',
                          borderRadius: 6,
                          backgroundColor: isPersistedMatch ? palette.successBg : palette.subCardBg,
                          border: `1px solid ${palette.border}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: palette.textPrimary }}>
                            {idx + 1}. {item.stageLabel}
                          </span>
                          <Space size={4}>
                            {item.modified ? (
                              <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                已改动
                              </Tag>
                            ) : (
                              <Tag style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', color: palette.textMuted }}>
                                未改写
                              </Tag>
                            )}
                            {isPersistedMatch && (
                              <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                ✓ 最终落盘
                              </Tag>
                            )}
                          </Space>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 11 }}>
                          <span style={{ color: palette.textSecondary }}>
                            {item.beforeChars !== null ? `${item.beforeChars} → ` : ''}
                            <b style={{ color: palette.textPrimary }}>{item.afterChars}</b> 字
                            {typeof item.afterParagraphs === 'number' && (
                              <span style={{ color: palette.textMuted, marginLeft: 6 }}>
                                ({item.afterParagraphs}段)
                              </span>
                            )}
                          </span>
                          <span style={{ fontWeight: 700, color: deltaColor }}>
                            {item.beforeChars !== null
                              ? (item.deltaChars >= 0 ? `+${item.deltaChars}` : `${item.deltaChars}`)
                              : `${item.afterChars}字`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10, color: palette.textMuted, padding: '2px 4px' }}>
                    注：仅统计实际产出或修改正文的真实步骤，不混入非正文/已跳过步骤。
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 历史 Prompt 日志兼容降级展示（当尚未生成结构化过程追踪时） */
        <div className="prompt-trail-list-wrapper">
          <div
            style={{
              padding: '6px 10px',
              fontSize: 11,
              color: palette.textSecondary,
              backgroundColor: palette.highlightBg,
              borderBottom: `1px solid ${palette.border}`
            }}
          >
            ℹ️ 以下为历史版本 AI 模型调用记录；新生成章节将展示完整过程追踪。
          </div>
          <div className="prompt-trail-list-header">
            <span>步骤名称与时间</span>
            <span>详情</span>
          </div>
          <VirtualList
            data={displayedLegacyLogs}
            height={280}
            itemHeight={52}
            itemKey={(item: PromptLogItem) => String(item.id || Math.random())}
          >
            {(record: PromptLogItem) => (
              <div key={record.id} className="prompt-trail-list-item">
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
                    {record.chapterNumber ? (
                      <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, flexShrink: 0 }}>
                        第 {record.chapterNumber} 章
                      </Tag>
                    ) : (
                      <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, flexShrink: 0 }}>
                        大纲架构
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
                  onClick={() => onOpenPromptDetail(record)}
                >
                  详情
                </Button>
              </div>
            )}
          </VirtualList>
        </div>
      )}
    </Card>
  );
};
