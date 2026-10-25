import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Tag,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Alert,
  Spin,
  message,
  Modal,
  Drawer,
  Collapse,
  Radio,
  Statistic,
  Empty,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  CheckOutlined,
  BookOutlined,
  DiffOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../context/themeContext';
import {
  getPresetAIProblems,
  diagnoseAIProblem,
  runDiagnosisExperiment,
  getDiagnosisHistory,
  adoptDiagnosisRule,
  getAiNovelsList,
  getAiNovelDetail,
  getAiNovelChapterContent,
  getCorpusWorks,
  getCorpusWorkDetail,
  CorpusWorkItem,
  PresetAIProblem,
  AIDiagnosisResult,
  DiagnosisExperimentItem,
} from '../services/labApi';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

export const AIDiagnosisLab: React.FC = () => {
  const { isDark } = useTheme();

  // 范本观察与名家切片状态 (黄金教师)
  const [referenceMode, setReferenceMode] = useState<'corpus' | 'custom'>('corpus');
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceCorpusId, setReferenceCorpusId] = useState<number | null>(null);
  const [referenceCorpusTitle, setReferenceCorpusTitle] = useState<string>('');
  const [corpusWorksList, setCorpusWorksList] = useState<CorpusWorkItem[]>([]);
  const [loadingCorpusWorks, setLoadingCorpusWorks] = useState<boolean>(false);

  // 基础输入状态 (学生样本)
  const [inputText, setInputText] = useState<string>('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('');
  const [customProblem, setCustomProblem] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('officialdom');
  const [sampleCount, setSampleCount] = useState<number>(1);
  const [runMode, setRunMode] = useState<'live' | 'demo'>('live');

  // 预设问题列表
  const [presets, setPresets] = useState<PresetAIProblem[]>([]);
  const [loadingPresets, setLoadingPresets] = useState<boolean>(false);

  // 诊断与单变量假设状态
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<AIDiagnosisResult | null>(null);

  // A/B 实验执行状态
  const [isExperimenting, setIsExperimenting] = useState<boolean>(false);
  const [currentExperiment, setCurrentExperiment] = useState<DiagnosisExperimentItem | null>(null);
  const [activeSampleIndex, setActiveSampleIndex] = useState<number>(0);

  // 规则采纳状态
  const [adoptLoading, setAdoptLoading] = useState<boolean>(false);
  const [isAdopted, setIsAdopted] = useState<boolean>(false);

  // 历史记录抽屉
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<DiagnosisExperimentItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // 从已有小说章节导入弹窗
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [novelsList, setNovelsList] = useState<any[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<number | null>(null);
  const [chapterList, setChapterList] = useState<any[]>([]);
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | null>(null);
  const [loadingNovels, setLoadingNovels] = useState<boolean>(false);
  const [loadingChapterContent, setLoadingChapterContent] = useState<boolean>(false);

  // 主题配色
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subBg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const secondaryColor = isDark ? '#94a3b8' : '#64748b';
  const greenBg = isDark ? '#064e3b' : '#f0fdf4';
  const greenBorder = isDark ? '#059669' : '#86efac';
  const redBg = isDark ? '#450a0a' : '#fef2f2';
  const redBorder = isDark ? '#dc2626' : '#fca5a5';

  // 加载预设问题与经典语料列表
  useEffect(() => {
    fetchPresets();
    fetchCorpusWorks();
  }, []);

  const fetchPresets = async () => {
    setLoadingPresets(true);
    try {
      const res = await getPresetAIProblems();
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setPresets(res.data);
      }
    } catch (err: any) {
      console.warn('获取预设问题失败:', err);
    } finally {
      setLoadingPresets(false);
    }
  };

  const fetchCorpusWorks = async () => {
    setLoadingCorpusWorks(true);
    try {
      const res = await getCorpusWorks({ limit: 50 });
      if (res && res.code === 200 && res.data?.items) {
        setCorpusWorksList(res.data.items);
        if (res.data.items.length > 0 && !referenceCorpusId) {
          const first = res.data.items[0];
          setReferenceCorpusId(first.id);
          const title = `${first.title}${first.author ? ` (${first.author})` : ''} 第${first.chapterNumber}章 ${first.chapterTitle || ''}`.trim();
          setReferenceCorpusTitle(title);
          loadCorpusWorkContent(first.id, title);
        }
      }
    } catch (err: any) {
      console.warn('获取经典语料库失败:', err);
    } finally {
      setLoadingCorpusWorks(false);
    }
  };

  const loadCorpusWorkContent = async (id: number, title?: string) => {
    try {
      const res = await getCorpusWorkDetail(id);
      if (res && res.code === 200 && res.data) {
        setReferenceText(res.data.content || '');
        if (title) setReferenceCorpusTitle(title);
      }
    } catch (err: any) {
      console.warn('获取作品切片失败:', err);
    }
  };

  const handleSelectCorpusWork = (workId: number) => {
    const work = corpusWorksList.find((w) => w.id === workId);
    if (work) {
      setReferenceCorpusId(work.id);
      const title = `${work.title}${work.author ? ` (${work.author})` : ''} 第${work.chapterNumber}章 ${work.chapterTitle || ''}`.trim();
      setReferenceCorpusTitle(title);
      loadCorpusWorkContent(work.id, title);
    }
  };

  // 选择预设问题
  const handleSelectPreset = (preset: PresetAIProblem) => {
    if (selectedPresetKey === preset.key) {
      setSelectedPresetKey('');
      setCustomProblem('');
    } else {
      setSelectedPresetKey(preset.key);
      setCustomProblem(preset.description);
    }
  };

  // 仅执行智能诊断与假设提出
  const handleRunDiagnosisOnly = async () => {
    if (!inputText.trim() && !customProblem.trim() && !referenceText.trim()) {
      message.warning('请提供待诊断的文本、问题描述或优秀范本切片');
      return;
    }
    setIsDiagnosing(true);
    try {
      const res = await diagnoseAIProblem({
        text: inputText,
        referenceText: referenceText,
        corpusWorkId: referenceCorpusId || undefined,
        referenceWorkTitle: referenceCorpusTitle || undefined,
        problemCategory: selectedPresetKey,
        customProblem: customProblem,
        genre: selectedGenre,
        mode: runMode,
      });
      if (res && res.code === 200 && res.data) {
        setDiagnosisResult(res.data);
        message.success('研读范本与 AI 感诊断完成，已提炼名家笔法正例与单变量改进规约！');
      } else {
        message.error(res?.message || '诊断失败，请重试');
      }
    } catch (err: any) {
      message.error(`诊断请求失败: ${err.message || '未知错误'}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // 执行 A/B 单变量对照实验
  const handleRunExperiment = async () => {
    if (!inputText.trim() && !customProblem.trim() && !referenceText.trim()) {
      message.warning('请提供待测试正文、具体 AI 感问题或参考范本');
      return;
    }
    setIsExperimenting(true);
    setIsAdopted(false);
    setActiveSampleIndex(0);
    try {
      const res = await runDiagnosisExperiment({
        text: inputText,
        referenceText: referenceText,
        corpusWorkId: referenceCorpusId || undefined,
        referenceWorkTitle: referenceCorpusTitle || undefined,
        positiveExemplar: diagnosisResult?.positiveExemplar,
        negativeExemplar: diagnosisResult?.negativeExemplar,
        problemCategory: selectedPresetKey,
        customProblem: customProblem,
        hypothesis: diagnosisResult?.singleVariableHypothesis,
        ruleText: diagnosisResult?.ruleText,
        sampleCount: sampleCount,
        genre: selectedGenre,
        mode: runMode,
      });
      if (res && res.code === 200 && res.data) {
        setCurrentExperiment(res.data);
        // 同步更新诊断卡片
        if (!diagnosisResult) {
          setDiagnosisResult({
            problemCategory: res.data.problemCategory,
            problemName: res.data.problemName,
            customProblem: res.data.customProblem,
            referenceText: res.data.referenceText,
            corpusWorkId: res.data.corpusWorkId,
            referenceWorkTitle: res.data.referenceWorkTitle,
            positiveExemplar: res.data.positiveExemplar,
            negativeExemplar: res.data.negativeExemplar,
            diagnosis: res.data.hypothesis,
            symptomSnippets: [],
            singleVariableHypothesis: res.data.hypothesis,
            ruleText: res.data.ruleText,
            ruleName: res.data.ruleName,
            targetDimension: res.data.targetDimension,
            conditionPattern: res.data.conditionPattern,
            counterConditions: res.data.counterConditions,
            sideEffectsWarning: '',
            genre: res.data.genre,
          });
        }
        message.success('A/B 对照实验执行完成！请查看双栏对比与实证评估。');
      } else {
        message.error(res?.message || '实验执行失败');
      }
    } catch (err: any) {
      message.error(`实验请求失败: ${err.message || '未知错误'}`);
    } finally {
      setIsExperimenting(false);
    }
  };

  // 采纳规则
  const handleAdoptRule = async (targetEffectStatus?: string) => {
    if (!currentExperiment && !diagnosisResult) {
      message.warning('尚无待采纳的规约');
      return;
    }
    const ruleName = currentExperiment?.ruleName || diagnosisResult?.ruleName || 'AI感改进规约';
    const ruleText = currentExperiment?.ruleText || diagnosisResult?.ruleText || '';
    const effectStatus = targetEffectStatus || currentExperiment?.effectStatus || 'positive';

    setAdoptLoading(true);
    try {
      const res = await adoptDiagnosisRule({
        experimentId: currentExperiment?.id,
        ruleName,
        ruleText,
        positiveExemplar: currentExperiment?.positiveExemplar || diagnosisResult?.positiveExemplar,
        negativeExemplar: currentExperiment?.negativeExemplar || diagnosisResult?.negativeExemplar,
        referenceWorkTitle: currentExperiment?.referenceWorkTitle || diagnosisResult?.referenceWorkTitle,
        targetDimension: currentExperiment?.targetDimension || diagnosisResult?.targetDimension || 'dialogue',
        conditionPattern: currentExperiment?.conditionPattern || diagnosisResult?.conditionPattern || '',
        counterConditions: currentExperiment?.counterConditions || diagnosisResult?.counterConditions || '',
        sideEffects: currentExperiment?.sideEffectsObserved?.join('；') || '',
        effectStatus,
        genre: selectedGenre,
        scopeType: effectStatus === 'context_dependent' ? 'scene' : 'global',
      });
      if (res && res.code === 200) {
        setIsAdopted(true);
        message.success(
          effectStatus === 'negative'
            ? '已将该规约标记为负向，系统将严格杜绝其进入正文写作！'
            : effectStatus === 'context_dependent'
            ? '已采纳为场景依赖规约，仅在匹配场景激活！'
            : '已采纳为正式实证规约，已注入正文写作与去AI化 Agent！'
        );
      } else {
        message.error(res?.message || '采纳规则失败');
      }
    } catch (err: any) {
      message.error(`采纳请求失败: ${err.message || '未知错误'}`);
    } finally {
      setAdoptLoading(false);
    }
  };

  // 打开历史实验抽屉
  const handleOpenHistory = async () => {
    setIsHistoryDrawerOpen(true);
    setLoadingHistory(true);
    try {
      const res = await getDiagnosisHistory({ genre: selectedGenre });
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err: any) {
      console.warn('获取历史失败:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 回看历史实验项
  const handleSelectHistoryItem = (item: DiagnosisExperimentItem) => {
    setCurrentExperiment(item);
    setActiveSampleIndex(0);
    setDiagnosisResult({
      problemCategory: item.problemCategory,
      problemName: item.problemName,
      customProblem: item.customProblem,
      referenceText: item.referenceText,
      corpusWorkId: item.corpusWorkId,
      referenceWorkTitle: item.referenceWorkTitle,
      positiveExemplar: item.positiveExemplar,
      negativeExemplar: item.negativeExemplar,
      diagnosis: item.hypothesis,
      symptomSnippets: [],
      singleVariableHypothesis: item.hypothesis,
      ruleName: item.ruleName,
      ruleText: item.ruleText,
      targetDimension: item.targetDimension,
      conditionPattern: item.conditionPattern,
      counterConditions: item.counterConditions,
      sideEffectsWarning: '',
      genre: item.genre,
    });
    if (item.referenceText) {
      setReferenceText(item.referenceText);
    }
    if (item.referenceWorkTitle) {
      setReferenceCorpusTitle(item.referenceWorkTitle);
    }
    if (item.corpusWorkId) {
      setReferenceCorpusId(item.corpusWorkId);
    }
    if (item.pairedSamples && item.pairedSamples[0]) {
      setInputText(item.pairedSamples[0].textA || '');
    }
    if (item.customProblem) {
      setCustomProblem(item.customProblem);
    }
    setIsAdopted(!!item.isAdopted);
    setIsHistoryDrawerOpen(false);
    message.info(`已载入历史实验：${item.ruleName}`);
  };

  // 打开导入已有小说章节弹窗
  const handleOpenImportModal = async () => {
    setIsImportModalOpen(true);
    setLoadingNovels(true);
    try {
      const res = await getAiNovelsList();
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setNovelsList(res.data);
      }
    } catch (err: any) {
      console.warn('获取小说列表失败:', err);
    } finally {
      setLoadingNovels(false);
    }
  };

  // 选择小说后加载章节
  const handleSelectNovel = async (novelId: number) => {
    setSelectedNovelId(novelId);
    setSelectedChapterNumber(null);
    try {
      const res = await getAiNovelDetail(novelId);
      if (res && res.code === 200 && res.data && Array.isArray(res.data.chapters)) {
        setChapterList(res.data.chapters);
      } else {
        setChapterList([]);
      }
    } catch (err: any) {
      console.warn('获取章节列表失败:', err);
      setChapterList([]);
    }
  };

  // 确认导入章节正文
  const handleConfirmImportChapter = async () => {
    if (!selectedNovelId || selectedChapterNumber === null) {
      message.warning('请选择目标小说与章节');
      return;
    }
    setLoadingChapterContent(true);
    try {
      const res = await getAiNovelChapterContent({
        novelId: selectedNovelId,
        chapterNumber: selectedChapterNumber,
      });
      if (res && res.code === 200 && res.data) {
        const content = res.data.content || res.data.chapterContent || '';
        if (content) {
          setInputText(content);
          setIsImportModalOpen(false);
          message.success(`成功导入第 ${selectedChapterNumber} 章正文（${content.length} 字）！`);
        } else {
          message.warning('该章节内容为空');
        }
      } else {
        message.error('获取章节正文失败');
      }
    } catch (err: any) {
      message.error(`导入章节失败: ${err.message || '未知错误'}`);
    } finally {
      setLoadingChapterContent(false);
    }
  };

  // 状态 Tag 映射渲染
  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'positive':
        return <Tag color="success" icon={<CheckCircleOutlined />}>🟢 有效 (已通过实测)</Tag>;
      case 'context_dependent':
        return <Tag color="warning" icon={<WarningOutlined />}>⚠️ 场景依赖 (按场景生效)</Tag>;
      case 'neutral':
        return <Tag color="default">⚪ 无明显收益</Tag>;
      case 'negative':
        return <Tag color="error" icon={<CloseCircleOutlined />}>🔴 负向副作用 (已熔断)</Tag>;
      case 'insufficient_evidence':
      default:
        return <Tag color="processing" icon={<QuestionCircleOutlined />}>❔ 证据不足 (需追加样本)</Tag>;
    }
  };

  const renderGradeTag = (grade?: string) => {
    switch (grade) {
      case 'unverified':
      case 'pending':
        return <Tag color="default">待证据定位核验 (Unverified)</Tag>;
      case 'insufficient_evidence':
        return <Tag color="orange">证据不足 (Insufficient Evidence)</Tag>;
      case 'A':
        return <Tag color="blue">Grade A: 原文引证核验</Tag>;
      case 'B':
        return <Tag color="cyan">Grade B: 跨章模式复现</Tag>;
      case 'C':
        return <Tag color="geekblue">Grade C: 人工精审确证</Tag>;
      case 'D':
        return <Tag color="green">Grade D: A/B受控实测胜出</Tag>;
      case 'E':
        return <Tag color="gold">Grade E: 创作者实战采纳</Tag>;
      default:
        return <Tag color="default">Grade {grade || '未评级'}</Tag>;
    }
  };

  const renderModeTag = (exp: DiagnosisExperimentItem) => {
    if (exp.executionStatus === 'failed') {
      return <Tag color="error">实测调用失败 (Live Failed)</Tag>;
    }
    if (exp.executionStatus === 'partial_success') {
      return (
        <Tag color="warning">
          部分实测成功 (Partial: 失败 {exp.failedSampleCount || 0} 组 / 失败率 {exp.failureRate || 0}%)
        </Tag>
      );
    }
    if (exp.mode === 'live') {
      return <Tag color="success">真实实测 (Live 成功)</Tag>;
    }
    return <Tag color="purple">演示样例 (Demo Fixture)</Tag>;
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* 顶部横幅介绍 */}
      <Card
        style={{
          background: isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#fff',
          borderRadius: 12,
          marginBottom: 20,
          border: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col xs={24} md={18}>
            <Space align="center" size={12}>
              <div
                style={{
                  fontSize: 28,
                  background: 'rgba(255,255,255,0.15)',
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <ExperimentOutlined />
              </div>
              <div>
                <Title level={3} style={{ color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                  AI 感诊断与文风实验室
                  <Tag color="cyan" style={{ marginLeft: 10, verticalAlign: 'middle', fontSize: 12 }}>
                    单变量因果盲测 · 严禁无据假扣分
                  </Tag>
                </Title>
                <Paragraph style={{ color: '#cbd5e1', margin: '4px 0 0', fontSize: 13 }}>
                  拒绝凭空堆砌指标！输入正文或痛点，自动拆解具体 AI 病灶并提出单变量假设，执行真实双盲 A/B 评测与 4 维度因果审计，一键直通沉淀有效规约。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right', marginTop: 12 }}>
            <Button
              type="primary"
              ghost
              icon={<HistoryOutlined />}
              onClick={handleOpenHistory}
              style={{ color: '#38bdf8', borderColor: '#38bdf8' }}
            >
              历史实验记录
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 第一步：范本研读、痛点选择与正文输入区 */}
      <Card
        title={
          <Space>
            <BookOutlined style={{ color: '#0284c7' }} />
            <span style={{ fontWeight: 600 }}>第一步：研读优秀小说切片 (黄金教师) ✕ 定位待攻克 AI 感病灶</span>
          </Space>
        }
        style={{ background: cardBg, borderColor: cardBorder, borderRadius: 10, marginBottom: 20 }}
      >
        {/* 优秀小说示范范本选择与录入 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <Text strong style={{ color: '#0284c7', fontSize: 14 }}>
                📖 优秀小说范本输入 (黄金教师 · 提炼名家笔法机理之源)：
              </Text>
              <Tag color={referenceText.length > 0 ? 'cyan' : 'default'}>{referenceText.length} 字</Tag>
              {referenceCorpusTitle && <Tag color="blue">{referenceCorpusTitle}</Tag>}
            </Space>
            <Radio.Group
              value={referenceMode}
              onChange={(e) => setReferenceMode(e.target.value)}
              size="small"
            >
              <Radio.Button value="corpus">从经典语料库选择</Radio.Button>
              <Radio.Button value="custom">自定义粘贴名家范本</Radio.Button>
            </Radio.Group>
          </div>

          {referenceMode === 'corpus' ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: secondaryColor }}>挑选经典切片：</Text>
                <Select
                  value={referenceCorpusId || undefined}
                  onChange={handleSelectCorpusWork}
                  loading={loadingCorpusWorks}
                  placeholder="请选择经典小说名家作品章节切片..."
                  style={{ flex: 1 }}
                  size="middle"
                >
                  {corpusWorksList.map((w) => (
                    <Option key={w.id} value={w.id}>
                      {w.title} {w.author ? `(${w.author})` : ''} - 第{w.chapterNumber}章 {w.chapterTitle || ''} ({w.wordCount}字)
                    </Option>
                  ))}
                </Select>
                {referenceText && (
                  <Button size="small" type="link" onClick={() => { setReferenceText(''); setReferenceCorpusId(null); setReferenceCorpusTitle(''); }}>
                    清空
                  </Button>
                )}
              </div>
              <TextArea
                rows={5}
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="所选经典作品章节内容将自动显示于此，系统将以此为黄金教师，对比提炼名家笔法正例..."
                style={{ borderRadius: 6, fontFamily: 'monospace', background: subBg }}
              />
            </div>
          ) : (
            <div>
              <TextArea
                rows={5}
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="请在此粘贴 300~2500 字的真人名家优秀小说正文切片（如体制内对话、生活留白、暗线交锋等）。系统将细读本切片并反向蒸馏出实战正例与军规..."
                style={{ borderRadius: 6, fontFamily: 'monospace', background: subBg }}
              />
            </div>
          )}
        </div>

        <Divider style={{ margin: '14px 0' }} />

        {/* 预设问题快捷选择 */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, color: textColor }}>
            🎯 待攻克的 AI 感痛点快捷选择（点击自动填入）：
          </Text>
          {loadingPresets ? (
            <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div>
          ) : (
            <Row gutter={[10, 10]}>
              {presets.map((preset) => {
                const isSelected = selectedPresetKey === preset.key;
                return (
                  <Col xs={24} sm={12} md={8} lg={4} key={preset.key}>
                    <div
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? '#38bdf8' : cardBorder}`,
                        background: isSelected ? (isDark ? '#082f49' : '#e0f2fe') : subBg,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        height: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong style={{ color: isSelected ? '#0284c7' : textColor, fontSize: 13 }}>
                          {preset.name}
                        </Text>
                        {isSelected && <CheckOutlined style={{ color: '#0284c7', fontSize: 12 }} />}
                      </div>
                      <Text style={{ fontSize: 11, color: secondaryColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {preset.description}
                      </Text>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>

        {/* 自定义问题详细描述 */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 6, color: textColor }}>
            具体 AI 感现象描述（支持补充与自由输入）：
          </Text>
          <Input
            value={customProblem}
            onChange={(e) => setCustomProblem(e.target.value)}
            placeholder="例如：人物总在讨论文号、附件、合规性，像在开文件审核会，而不是正常交流；或者：所有人说话都太严密精明，缺少基层常有的推诿或含糊..."
            style={{ borderRadius: 6 }}
          />
        </div>

        {/* 正文输入与导入 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Space>
              <Text strong style={{ color: textColor }}>待优化的 AI 正文切片（学生样本 · 选填）：</Text>
              <Tag color={inputText.length > 0 ? 'blue' : 'default'}>{inputText.length} 字</Tag>
            </Space>
            <Space>
              <Button size="small" icon={<BookOutlined />} onClick={handleOpenImportModal}>
                从已有小说章节导入
              </Button>
              {inputText && (
                <Button size="small" type="link" onClick={() => setInputText('')}>
                  清空
                </Button>
              )}
            </Space>
          </div>
          <TextArea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请在此粘贴 300~2000 字的 AI 生成待优化小说正文切片，或点击上方「从已有小说章节导入」。若留空，系统将使用体制内典型 AI 样本进行评测。"
            style={{ borderRadius: 6, fontFamily: 'monospace' }}
          />
        </div>

        {/* 控制参数与触发操作条 */}
        <Divider style={{ margin: '16px 0' }} />
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Space size={16} wrap>
              <div>
                <Text style={{ color: secondaryColor, marginRight: 8, fontSize: 13 }}>题材设定:</Text>
                <Select value={selectedGenre} onChange={setSelectedGenre} style={{ width: 140 }} size="small">
                  <Option value="officialdom">都市官场 / 体制</Option>
                  <Option value="workplace">都市职场 / 商战</Option>
                  <Option value="fantasy">玄幻修真 / 仙侠</Option>
                  <Option value="history">历史架空 / 古代</Option>
                </Select>
              </div>
              <div>
                <Text style={{ color: secondaryColor, marginRight: 8, fontSize: 13 }}>验证样本数:</Text>
                <Radio.Group value={sampleCount} onChange={(e) => setSampleCount(e.target.value)} size="small">
                  <Radio.Button value={1}>1组 (快速验证)</Radio.Button>
                  <Radio.Button value={2}>2组 (推荐稳健)</Radio.Button>
                  <Radio.Button value={3}>3组 (高置信度)</Radio.Button>
                </Radio.Group>
              </div>
              <div>
                <Text style={{ color: secondaryColor, marginRight: 8, fontSize: 13 }}>实测引擎:</Text>
                <Radio.Group value={runMode} onChange={(e) => setRunMode(e.target.value)} size="small">
                  <Radio.Button value="live">大模型真实生成</Radio.Button>
                  <Radio.Button value="demo">快速仿真</Radio.Button>
                </Radio.Group>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                loading={isDiagnosing}
                disabled={isExperimenting}
                icon={<BookOutlined />}
                onClick={handleRunDiagnosisOnly}
              >
                研读范本提炼笔法
              </Button>
              <Button
                type="primary"
                loading={isExperimenting}
                disabled={isDiagnosing}
                icon={<ThunderboltOutlined />}
                onClick={handleRunExperiment}
                style={{ background: '#0284c7', borderColor: '#0284c7' }}
              >
                开始 A/B 实测 (名家正例注入)
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 第二步：名家实战笔法卡片与单变量假设 */}
      {diagnosisResult && (
        <Card
          title={
            <Space>
              <ExperimentOutlined style={{ color: '#0284c7' }} />
              <span style={{ fontWeight: 600 }}>第二步：名家实战笔法卡片 (Distilled Master Craft) 与单变量假设</span>
              <Tag color="geekblue">{diagnosisResult.ruleName}</Tag>
              {diagnosisResult.referenceWorkTitle && (
                <Tag color="cyan">研读来源：{diagnosisResult.referenceWorkTitle}</Tag>
              )}
            </Space>
          }
          style={{ background: cardBg, borderColor: cardBorder, borderRadius: 10, marginBottom: 20 }}
        >
          {/* 正例与负例核心对照展示 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <div
                style={{
                  background: greenBg,
                  padding: 16,
                  borderRadius: 8,
                  border: `1.5px solid ${greenBorder}`,
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ color: '#047857', fontSize: 14 }}>
                    🌟 真人名家经典正例 (Positive Exemplar):
                  </Text>
                  <Tag color="success">黄金教师原句示范</Tag>
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'serif',
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: textColor,
                    background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    borderLeft: '4px solid #10b981',
                  }}
                >
                  {diagnosisResult.positiveExemplar || '（暂无提取的正例摘录）'}
                </div>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div
                style={{
                  background: redBg,
                  padding: 16,
                  borderRadius: 8,
                  border: `1.5px solid ${redBorder}`,
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ color: '#b91c1c', fontSize: 14 }}>
                    ❌ 典型 AI 负例对照 (Negative Exemplar):
                  </Text>
                  <Tag color="error">呆板套路严禁出现</Tag>
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'serif',
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: textColor,
                    background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    borderLeft: '4px solid #ef4444',
                  }}
                >
                  {diagnosisResult.negativeExemplar || '（暂无提取的负例对照）'}
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Text strong style={{ color: textColor, display: 'block', marginBottom: 4 }}>
                  🩺 诊断识别出的具体病灶:
                </Text>
                <Paragraph style={{ margin: 0, color: secondaryColor, fontSize: 13 }}>
                  {diagnosisResult.diagnosis}
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Text strong style={{ color: '#0284c7', display: 'block', marginBottom: 4 }}>
                  🔬 提炼出的单变量实战假设 (Single-Variable Hypothesis):
                </Text>
                <Paragraph style={{ margin: 0, color: textColor, fontSize: 13 }}>
                  {diagnosisResult.singleVariableHypothesis}
                </Paragraph>
              </div>
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <Text strong style={{ color: textColor, display: 'block', marginBottom: 6 }}>
              📝 蒸馏出的核心写作军规 (B 组注入军规):
            </Text>
            <div
              style={{
                background: isDark ? '#0f172a' : '#f1f5f9',
                padding: '12px 16px',
                borderRadius: 8,
                borderLeft: '4px solid #0284c7',
                fontFamily: 'monospace',
                fontSize: 13,
                color: textColor,
              }}
            >
              {diagnosisResult.ruleText}
            </div>
          </div>

          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={12}>
              <Text style={{ fontSize: 12, color: secondaryColor }}>
                📌 适用场景模式: <Tag color="blue">{diagnosisResult.conditionPattern || '全场景适用'}</Tag>
              </Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Text style={{ fontSize: 12, color: secondaryColor }}>
                ⚠️ 反面限制与严防误伤: <Tag color="orange">{diagnosisResult.counterConditions || '避免机械切碎句子'}</Tag>
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* 第三步：A/B 对照实验结果与 4 维度盲评 */}
      {currentExperiment && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <DiffOutlined style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 600 }}>第三步：A/B 双盲对照实测与 4 维度证据审计</span>
              </Space>
              <Space wrap>
                {renderModeTag(currentExperiment)}
                {renderGradeTag(currentExperiment.evidenceGrade)}
                {renderStatusTag(currentExperiment.effectStatus)}
                <Tag color="cyan">置信度: {currentExperiment.confidenceScore}%</Tag>
              </Space>
            </div>
          }
          style={{ background: cardBg, borderColor: cardBorder, borderRadius: 10, marginBottom: 20 }}
        >
          {/* 实测失败安全警示（零造假保障） */}
          {currentExperiment.executionStatus === 'failed' && (
            <Alert
              type="error"
              showIcon
              message="真实大模型生成失败，系统未填补任何虚假数据"
              description={currentExperiment.errorMessage || '本次实测调用大模型超时或失败。系统遵循防假数据铁律，严禁伪造测试结果，请检查网络或重新实测。'}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 实测部分失败与零伪造警示 */}
          {currentExperiment.executionStatus === 'partial_success' && (
            <Alert
              type="warning"
              showIcon
              message={`实测部分样本失败 (有效样本数 ${currentExperiment.validSampleCount || 0}/${currentExperiment.sampleCount || 0}，失败率 ${currentExperiment.failureRate || 0}%)`}
              description={`本次实测中存在 ${currentExperiment.failedSampleCount || 0} 组大模型实测调用失败。遵循防造假铁律，统计指标严格仅基于有效样本对归纳，证据等级定为【证据不足 (insufficient_evidence)】，绝不隐瞒故障或虚假包装为完全成功。`}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 评测模式声明：客观物理特征启发式 vs 语义评审分离 */}
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: subBg, padding: '8px 12px', borderRadius: 6, border: `1px solid ${cardBorder}` }}>
            <Space wrap>
              <Tag color="geekblue">评测机制: 文本物理特征启发式评测 (Heuristic)</Tag>
              {currentExperiment.sourceOrigin && (
                <Tag color="default">
                  数据源: {currentExperiment.sourceOrigin === 'demo_fixture' ? '演示样例 (demo_fixture)' : '真实实测 (diagnosis_experiment)'}
                </Tag>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ℹ️ 基于物理字数、对白比、词频与套路词进行数学对称评测，与语义评审独立分离。
            </Text>
          </div>

          {/* 写作机制策略解构面板 */}
          <div style={{ background: subBg, padding: '12px 16px', borderRadius: 8, border: `1px solid ${cardBorder}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <BulbOutlined style={{ color: '#d97706', marginRight: 8, fontSize: 16 }} />
              <Text strong style={{ color: textColor, fontSize: 14 }}>
                逆向提炼写作机制：【{currentExperiment.ruleName}】
              </Text>
            </div>
            <Row gutter={[16, 6]}>
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>适用契机 (When): </Text>
                <Text style={{ fontSize: 12, color: textColor }}>{currentExperiment.conditionPattern || '当前情境'}</Text>
              </Col>
              {currentExperiment.decisionSignals && (
                <Col xs={24} md={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>决策信号 (Trigger): </Text>
                  <Text style={{ fontSize: 12, color: textColor }}>{currentExperiment.decisionSignals}</Text>
                </Col>
              )}
              <Col xs={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>操作机制 (How): </Text>
                <Text style={{ fontSize: 12, color: textColor }}>{currentExperiment.procedure || currentExperiment.ruleText}</Text>
              </Col>
              {currentExperiment.counterConditions && (
                <Col xs={24} md={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>失效边界 (Boundary): </Text>
                  <Text style={{ fontSize: 12, color: '#ef4444' }}>{currentExperiment.counterConditions}</Text>
                </Col>
              )}
              {currentExperiment.sideEffects && (
                <Col xs={24} md={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>副作用警示: </Text>
                  <Text style={{ fontSize: 12, color: '#f59e0b' }}>{currentExperiment.sideEffects}</Text>
                </Col>
              )}
            </Row>
          </div>

          {/* 结论总览 Banner */}
          <Alert
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>
                  实验结论：{currentExperiment.recommendation}
                </span>
                <span style={{ fontSize: 12 }}>
                  样本量: {currentExperiment.pairedSamples?.length || 1} 组 · 单变量因果隔离
                </span>
              </div>
            }
            type={
              currentExperiment.effectStatus === 'positive'
                ? 'success'
                : currentExperiment.effectStatus === 'negative'
                ? 'error'
                : currentExperiment.effectStatus === 'context_dependent'
                ? 'warning'
                : 'info'
            }
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 4 维度审计卡片 */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Statistic
                  title={<span style={{ color: secondaryColor, fontSize: 12 }}>维度 A：AI感减轻度 (纯对白与去爹味)</span>}
                  value={currentExperiment.overallEvaluation.dimensionAI.averageDelta}
                  precision={1}
                  prefix={currentExperiment.overallEvaluation.dimensionAI.averageDelta >= 0 ? '+' : ''}
                  suffix="分"
                  valueStyle={{
                    color: currentExperiment.overallEvaluation.dimensionAI.averageDelta > 0 ? '#10b981' : '#64748b',
                    fontSize: 22,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryColor, marginTop: 4, display: 'block' }}>
                  {currentExperiment.overallEvaluation.dimensionAI.summary}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Statistic
                  title={<span style={{ color: secondaryColor, fontSize: 12 }}>维度 B：人物真实度 (说话区分度与顾虑)</span>}
                  value={currentExperiment.overallEvaluation.dimensionPersona.averageDelta}
                  precision={1}
                  prefix={currentExperiment.overallEvaluation.dimensionPersona.averageDelta >= 0 ? '+' : ''}
                  suffix="分"
                  valueStyle={{
                    color: currentExperiment.overallEvaluation.dimensionPersona.averageDelta > 0 ? '#10b981' : '#64748b',
                    fontSize: 22,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryColor, marginTop: 4, display: 'block' }}>
                  {currentExperiment.overallEvaluation.dimensionPersona.summary}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Statistic
                  title={<span style={{ color: secondaryColor, fontSize: 12 }}>维度 C：制度与千禧年代可信度 (防穿越)</span>}
                  value={currentExperiment.overallEvaluation.dimensionCredibility.averageDelta}
                  precision={1}
                  prefix={currentExperiment.overallEvaluation.dimensionCredibility.averageDelta >= 0 ? '+' : ''}
                  suffix="分"
                  valueStyle={{
                    color: currentExperiment.overallEvaluation.dimensionCredibility.averageDelta >= 0 ? '#10b981' : '#ef4444',
                    fontSize: 22,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryColor, marginTop: 4, display: 'block' }}>
                  {currentExperiment.overallEvaluation.dimensionCredibility.summary}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ background: subBg, padding: 14, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <Statistic
                  title={<span style={{ color: secondaryColor, fontSize: 12 }}>维度 D：新副作用监控 (防碎句与做作)</span>}
                  value={currentExperiment.overallEvaluation.dimensionSideEffects.averageScore}
                  precision={1}
                  suffix="/10"
                  valueStyle={{
                    color: currentExperiment.overallEvaluation.dimensionSideEffects.averageScore >= 8 ? '#10b981' : '#ef4444',
                    fontSize: 22,
                  }}
                />
                <Text style={{ fontSize: 11, color: secondaryColor, marginTop: 4, display: 'block' }}>
                  {currentExperiment.overallEvaluation.dimensionSideEffects.summary}
                </Text>
              </div>
            </Col>
          </Row>

          {/* 实证摘录展示 (Gains & Side Effects) */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} md={12}>
              <div
                style={{
                  background: greenBg,
                  border: `1px solid ${greenBorder}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  height: '100%',
                }}
              >
                <Text strong style={{ color: '#047857', display: 'block', marginBottom: 8 }}>
                  🟢 实证收益摘录 (Observed Gains & Quotes):
                </Text>
                {currentExperiment.evidenceSnippets && currentExperiment.evidenceSnippets.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: textColor, fontSize: 12 }}>
                    {currentExperiment.evidenceSnippets.map((snippet, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <Text code style={{ fontSize: 12, background: 'rgba(255,255,255,0.4)' }}>
                          {snippet}
                        </Text>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text style={{ fontSize: 12, color: secondaryColor }}>暂无收益证据摘录</Text>
                )}
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div
                style={{
                  background: currentExperiment.sideEffectSnippets?.length ? redBg : subBg,
                  border: `1px solid ${currentExperiment.sideEffectSnippets?.length ? redBorder : cardBorder}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  height: '100%',
                }}
              >
                <Text
                  strong
                  style={{
                    color: currentExperiment.sideEffectSnippets?.length ? '#b91c1c' : secondaryColor,
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  🔴 副作用与违背摘录 (Side Effects & Warnings):
                </Text>
                {currentExperiment.sideEffectSnippets && currentExperiment.sideEffectSnippets.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, color: textColor, fontSize: 12 }}>
                    {currentExperiment.sideEffectSnippets.map((snippet, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <Text code style={{ fontSize: 12, color: '#b91c1c' }}>
                          {snippet}
                        </Text>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text style={{ fontSize: 12, color: '#10b981' }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    未检测到机械切碎句子、无故多余肢体动作或损毁制度可信度的副作用
                  </Text>
                )}
              </div>
            </Col>
          </Row>

          {/* 多样本切换 Tabs（如果有多个样本） */}
          {currentExperiment.pairedSamples && currentExperiment.pairedSamples.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Text style={{ color: secondaryColor, fontSize: 12 }}>切换查看对照样本:</Text>
                {currentExperiment.pairedSamples.map((_s, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    type={activeSampleIndex === idx ? 'primary' : 'default'}
                    onClick={() => setActiveSampleIndex(idx)}
                  >
                    样本 #{idx + 1}
                  </Button>
                ))}
              </Space>
            </div>
          )}

          {/* 正文双栏对照查看区 */}
          {currentExperiment.pairedSamples && currentExperiment.pairedSamples[activeSampleIndex] && (
            <div>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Card
                    size="small"
                    title={
                      <Space>
                        <Tag color="default">A 组 (基线对照组)</Tag>
                        <Text style={{ fontSize: 12, color: secondaryColor }}>未注入新假设规约的原始/基线正文</Text>
                      </Space>
                    }
                    style={{ background: subBg, borderColor: cardBorder }}
                  >
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'serif',
                        fontSize: 14,
                        lineHeight: 1.8,
                        maxHeight: 460,
                        overflowY: 'auto',
                        padding: 8,
                        color: textColor,
                      }}
                    >
                      {currentExperiment.pairedSamples[activeSampleIndex].textA}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    size="small"
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Tag color="processing">B 组 (实验组·注入名家正例与笔规)</Tag>
                          <Text style={{ fontSize: 12, color: '#0284c7' }}>名家示范引导重写</Text>
                        </Space>
                        {currentExperiment.referenceWorkTitle && (
                          <Tag color="cyan" style={{ fontSize: 11 }}>范本：{currentExperiment.referenceWorkTitle}</Tag>
                        )}
                      </div>
                    }
                    style={{
                      background: isDark ? '#0c2238' : '#f0f9ff',
                      borderColor: isDark ? '#0369a1' : '#bae6fd',
                    }}
                  >
                    {currentExperiment.positiveExemplar && (
                      <div
                        style={{
                          background: isDark ? 'rgba(6, 78, 59, 0.4)' : '#ecfdf5',
                          border: '1px solid #10b981',
                          borderRadius: 6,
                          padding: '6px 10px',
                          marginBottom: 8,
                          fontSize: 12,
                          color: isDark ? '#6ee7b7' : '#065f46',
                        }}
                      >
                        <strong>🌟 参考的名家正例：</strong>
                        {currentExperiment.positiveExemplar.length > 80
                          ? currentExperiment.positiveExemplar.slice(0, 80) + '...'
                          : currentExperiment.positiveExemplar}
                      </div>
                    )}
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'serif',
                        fontSize: 14,
                        lineHeight: 1.8,
                        maxHeight: 460,
                        overflowY: 'auto',
                        padding: 8,
                        color: textColor,
                      }}
                    >
                      {currentExperiment.pairedSamples[activeSampleIndex].textB}
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* 第四步：一键规则采纳操作区 */}
          <Divider style={{ margin: '20px 0 16px' }} />
          <Row justify="space-between" align="middle">
            <Col xs={24} md={12}>
              <Space>
                <Text strong style={{ color: textColor }}>规约采纳闭环:</Text>
                {isAdopted ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    已采纳至正式写作库，并在正文生成中生效
                  </Tag>
                ) : (
                  <Text style={{ fontSize: 12, color: secondaryColor }}>
                    经过本次严格实测后，可将有效规约沉淀至写作库，负向规约将被永久熔断拦截
                  </Text>
                )}
              </Space>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button
                  danger
                  disabled={adoptLoading || isAdopted || currentExperiment?.executionStatus === 'failed'}
                  onClick={() => handleAdoptRule('negative')}
                  icon={<CloseCircleOutlined />}
                >
                  标记为负向并熔断
                </Button>
                <Button
                  style={{ borderColor: '#d97706', color: '#d97706' }}
                  disabled={adoptLoading || isAdopted || currentExperiment?.executionStatus === 'failed'}
                  onClick={() => handleAdoptRule('context_dependent')}
                  icon={<WarningOutlined />}
                >
                  采纳为场景依赖机制
                </Button>
                <Button
                  type="primary"
                  loading={adoptLoading}
                  disabled={isAdopted || currentExperiment?.executionStatus === 'failed'}
                  onClick={() => handleAdoptRule('positive')}
                  icon={<CheckOutlined />}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  ✅ 采纳为正式实证机制
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 高级功能折叠区：A/B/C 三组对照说明 */}
      <Collapse
        ghost
        style={{
          background: cardBg,
          borderRadius: 8,
          border: `1px solid ${cardBorder}`,
        }}
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined style={{ color: secondaryColor }} />
              <Text style={{ color: secondaryColor, fontSize: 13 }}>
                高级功能：三组对照实验原理与规约防冲突保护 (点击展开)
              </Text>
            </Space>
          }
          key="advanced_notes"
        >
          <div style={{ color: secondaryColor, fontSize: 13, lineHeight: 1.8 }}>
            <p>
              <strong>为什么坚持单变量因果优先？</strong>
              <br />
              传统 A/B 测试常陷入“打包混测”陷阱：同时测试 5 条规约时，即使效果变好，也无法确定是哪条生效；若效果变差，容易误杀原本优秀的规约。
              本实验室要求：<strong>一次实验仅针对一个具体痛点，提出一条单变量假设与规约，严禁捆绑冲突规则</strong>。
            </p>
            <p>
              <strong>下游正文写作防劣化保护机制：</strong>
              <br />
              1. 凡在实验室中被评为 <code>negative (负向副作用)</code> 的规约，后端 <code>ruleService.js</code> 会在加载 <code>getActiveRuleBundle</code> 时直接过滤剔除，绝对不会注入实际小说正文生成！
              <br />
              2. 凡评为 <code>context_dependent (场景依赖)</code> 的规约，将携带场景限定标签（如仅在私下对白场景生效），避免在公文汇报或严肃常委会等场景误杀正规制度细节。
            </p>
          </div>
        </Panel>
      </Collapse>

      {/* 历史实验抽屉 */}
      <Drawer
        title="🔬 AI 感诊断与实验历史记录"
        width={560}
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        styles={{ body: { background: isDark ? '#0f172a' : '#f8fafc', padding: 16 } }}
      >
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="加载历史实验记录..." />
          </div>
        ) : historyList.length === 0 ? (
          <Empty description="暂无历史实验记录，请先在控制台执行一次 A/B 实测" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {historyList.map((item) => (
              <Card
                key={item.id}
                size="small"
                hoverable
                onClick={() => handleSelectHistoryItem(item)}
                style={{
                  background: cardBg,
                  borderColor: cardBorder,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text strong style={{ color: textColor }}>{item.ruleName}</Text>
                  <Space size={4}>
                    {renderModeTag(item)}
                    {renderGradeTag(item.evidenceGrade)}
                    {renderStatusTag(item.effectStatus)}
                  </Space>
                </div>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ fontSize: 12, color: secondaryColor, margin: '4px 0 8px' }}
                >
                  假设: {item.hypothesis}
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: secondaryColor }}>
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <Space>
                    <Tag color="blue">{item.targetDimension}</Tag>
                    <span>置信度: {item.confidenceScore}%</span>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Drawer>

      {/* 从已有小说章节导入 Modal */}
      <Modal
        title="📚 从已有小说章节导入正文切片"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onOk={handleConfirmImportChapter}
        confirmLoading={loadingChapterContent}
        okText="确认导入正文"
        cancelText="取消"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>选择目标小说:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择您的小说作品"
              value={selectedNovelId}
              onChange={handleSelectNovel}
              loading={loadingNovels}
            >
              {novelsList.map((n) => (
                <Option key={n.id} value={n.id}>
                  {n.title} ({n.genre || '未分类'})
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>选择章节:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择章节"
              value={selectedChapterNumber}
              onChange={setSelectedChapterNumber}
              disabled={!selectedNovelId || chapterList.length === 0}
            >
              {chapterList.map((c) => (
                <Option key={c.chapterNumber || c.id} value={c.chapterNumber || c.id}>
                  第 {c.chapterNumber} 章 - {c.title || '章节'}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
