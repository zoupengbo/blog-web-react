import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../context/themeContext';
import {
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Typography,
  Alert,
  Switch,
  Row,
  Col,
  Tooltip,
  Divider,
  Pagination,
  Collapse,
  Progress,
  Checkbox,
  List,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import {
  getDistillRules,
  reviewDistillRule,
  batchReviewDistillRules,
  deleteDistillRule,
  batchDeleteDistillRules,
  runComparativeExperiment,
  ComparativeExperimentResult,
  EvidenceBreakdown,
  RuleEffectProfile,
  verifyRuleEffect,
  DistillRuleItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface WritingRulesStationProps {
  initialGenre?: string;
}

const WRITING_RULES_FILTER_KEY = 'ai_novel_writing_rules_filter';

interface WritingRulesFilterData {
  genre: string;
  dimension: string;
  status: 'all' | 'verified' | 'trial' | 'needs_review' | 'draft';
  keyword: string;
}

const getStoredFilter = (): WritingRulesFilterData => {
  try {
    const raw = localStorage.getItem(WRITING_RULES_FILTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        genre: typeof parsed.genre === 'string' ? parsed.genre : 'all',
        dimension: typeof parsed.dimension === 'string' ? parsed.dimension : 'all',
        status: ['all', 'verified', 'trial', 'needs_review', 'draft'].includes(parsed.status) ? parsed.status : 'all',
        keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
      };
    }
  } catch (e) {
    // ignore
  }
  return { genre: 'all', dimension: 'all', status: 'all', keyword: '' };
};

export const WritingRulesStation: React.FC<WritingRulesStationProps> = ({ initialGenre }) => {
  const { isDark } = useTheme();
  const initialFilter = getStoredFilter();
  const [rules, setRules] = useState<DistillRuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 记忆筛选状态（持久化于 localStorage）
  const [selectedGenre, setSelectedGenre] = useState<string>(
    (initialGenre && initialGenre !== 'all') ? initialGenre : initialFilter.genre
  );
  const [selectedDimension, setSelectedDimension] = useState<string>(initialFilter.dimension);
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'trial' | 'needs_review' | 'draft'>(initialFilter.status);
  const [effectFilter, setEffectFilter] = useState<'all' | 'positive' | 'negative' | 'context_dependent' | 'neutral' | 'insufficient_evidence'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>(initialFilter.keyword);

  // 分页与统计状态
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [verifiedTotal, setVerifiedTotal] = useState<number>(0);
  const [trialTotal, setTrialTotal] = useState<number>(0);
  const [needsReviewTotal, setNeedsReviewTotal] = useState<number>(0);
  const [positiveTotal, setPositiveTotal] = useState<number>(0);
  const [negativeTotal, setNegativeTotal] = useState<number>(0);
  const [contextTotal, setContextTotal] = useState<number>(0);
  const [insufficientTotal, setInsufficientTotal] = useState<number>(0);

  // 编辑规则弹窗
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<DistillRuleItem | null>(null);
  const [editForm] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // A/B/C 对照实验状态
  const [isExperimentModalOpen, setIsExperimentModalOpen] = useState<boolean>(false);
  const [experimentLoading, setExperimentLoading] = useState<boolean>(false);
  const [experimentResult, setExperimentResult] = useState<ComparativeExperimentResult | null>(null);

  // 单条规则 A/B 配对效果实验状态
  const [isSingleExpModalOpen, setIsSingleExpModalOpen] = useState<boolean>(false);
  const [singleExpRule, setSingleExpRule] = useState<DistillRuleItem | null>(null);
  const [singleExpScene, setSingleExpScene] = useState<'dialogue' | 'conflict' | 'daily'>('dialogue');
  const [singleExpSampleCount, setSingleExpSampleCount] = useState<number>(1);
  const [singleExpLoading, setSingleExpLoading] = useState<boolean>(false);
  const [singleExpResult, setSingleExpResult] = useState<any | null>(null);

  // 批量全量实测未测规约状态
  const [isBatchExpModalOpen, setIsBatchExpModalOpen] = useState<boolean>(false);
  const [batchExpFetching, setBatchExpFetching] = useState<boolean>(false);
  const [untestedRules, setUntestedRules] = useState<DistillRuleItem[]>([]);
  const [selectedBatchRuleIds, setSelectedBatchRuleIds] = useState<number[]>([]);
  const [batchScene, setBatchScene] = useState<'auto' | 'dialogue' | 'conflict' | 'daily'>('auto');
  const [batchSampleCount, setBatchSampleCount] = useState<number>(1);
  const [batchExpRunning, setBatchExpRunning] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentRuleName: string; step: string }>({
    current: 0,
    total: 0,
    currentRuleName: '',
    step: '',
  });
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const batchExpAbortRef = React.useRef<boolean>(false);

  const fetchRules = async (targetPage: number = page, targetPageSize: number = pageSize) => {
    setLoading(true);
    try {
      const params: any = { page: targetPage, pageSize: targetPageSize };
      if (selectedGenre !== 'all') params.genre = selectedGenre;
      if (selectedDimension !== 'all') params.dimension = selectedDimension;
      if (statusFilter === 'trial') {
        params.trialActive = true;
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (effectFilter !== 'all') params.effectStatus = effectFilter;
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();

      const res = await getDistillRules(params);
      if (res.code === 200) {
        setRules(res.data.items || []);
        setTotal(res.data.total || 0);
        if (typeof res.data.verifiedTotal === 'number') setVerifiedTotal(res.data.verifiedTotal);
        if (typeof res.data.trialTotal === 'number') setTrialTotal(res.data.trialTotal);
        if (typeof res.data.needsReviewTotal === 'number') setNeedsReviewTotal(res.data.needsReviewTotal);
        if (typeof res.data.positiveTotal === 'number') setPositiveTotal(res.data.positiveTotal);
        if (typeof res.data.negativeTotal === 'number') setNegativeTotal(res.data.negativeTotal);
        if (typeof res.data.contextTotal === 'number') setContextTotal(res.data.contextTotal);
        if (typeof res.data.insufficientTotal === 'number') setInsufficientTotal(res.data.insufficientTotal);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 记忆化持久保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        WRITING_RULES_FILTER_KEY,
        JSON.stringify({
          genre: selectedGenre,
          dimension: selectedDimension,
          status: statusFilter,
          keyword: searchKeyword,
        })
      );
    } catch (e) {
      // ignore
    }
  }, [selectedGenre, selectedDimension, statusFilter, searchKeyword]);

  // 当外部导航传入特定题材时动态切换
  useEffect(() => {
    if (initialGenre && initialGenre !== 'all') {
      setSelectedGenre(initialGenre);
    }
  }, [initialGenre]);

  useEffect(() => {
    setPage(1);
    fetchRules(1, pageSize);
  }, [selectedGenre, selectedDimension, statusFilter, effectFilter]);

  const handleOpenSingleExperiment = (rule: DistillRuleItem) => {
    setSingleExpRule(rule);
    setSingleExpResult(rule.effectProfile || null);
    setIsSingleExpModalOpen(true);
  };

  const handleExecuteSingleExperiment = async () => {
    if (!singleExpRule) return;
    setSingleExpLoading(true);
    try {
      const res = await verifyRuleEffect(singleExpRule.id, {
        sceneType: singleExpScene,
        sampleCount: singleExpSampleCount,
        mode: 'live',
        genre: selectedGenre !== 'all' ? selectedGenre : singleExpRule.genre,
      });
      if (res.code === 200) {
        setSingleExpResult(res.data);
        message.success('大模型真实配对盲测完成，生成样章已就绪，效果档案已落盘！');
        fetchRules(page, pageSize);
      } else {
        message.error(res.message || '实验执行失败');
      }
    } catch (e: any) {
      message.error(e.message || '大模型网络请求异常');
    } finally {
      setSingleExpLoading(false);
    }
  };

  const handleManualOverrideEffect = async (ruleId?: number, effectStatusVal?: string) => {
    if (!ruleId || !effectStatusVal) return;
    try {
      const res = await reviewDistillRule(ruleId, {
        effectStatus: effectStatusVal as any,
        userOverride: true,
      });
      if (res.code === 200) {
        message.success(`已手动更新规约效果结论为: ${effectStatusVal}`);
        if (singleExpResult) {
          setSingleExpResult({ ...singleExpResult, effectStatus: effectStatusVal });
        }
        fetchRules(page, pageSize);
      }
    } catch (e: any) {
      message.error(e.message || '更新失败');
    }
  };

  const handleOpenBatchExperiment = async () => {
    setIsBatchExpModalOpen(true);
    setBatchExpFetching(true);
    setBatchResults([]);
    try {
      const params: any = {
        pageSize: 500,
        effectStatus: 'insufficient_evidence',
      };
      if (selectedGenre !== 'all') {
        params.genre = selectedGenre;
      }
      const res = await getDistillRules(params);
      if (res.code === 200 && res.data?.items) {
        setUntestedRules(res.data.items);
        setSelectedBatchRuleIds(res.data.items.map((r) => r.id));
      } else {
        setUntestedRules([]);
        setSelectedBatchRuleIds([]);
      }
    } catch (e: any) {
      message.error(e.message || '获取未测试规约列表失败');
    } finally {
      setBatchExpFetching(false);
    }
  };

  const handleToggleSelectAllBatch = () => {
    if (selectedBatchRuleIds.length === untestedRules.length) {
      setSelectedBatchRuleIds([]);
    } else {
      setSelectedBatchRuleIds(untestedRules.map((r) => r.id));
    }
  };

  const handleToggleSelectRule = (ruleId: number) => {
    if (selectedBatchRuleIds.includes(ruleId)) {
      setSelectedBatchRuleIds(selectedBatchRuleIds.filter((id) => id !== ruleId));
    } else {
      setSelectedBatchRuleIds([...selectedBatchRuleIds, ruleId]);
    }
  };

  const handleStartBatchExperiment = async () => {
    const targetRules = untestedRules.filter((r) => selectedBatchRuleIds.includes(r.id));
    if (targetRules.length === 0) {
      message.warning('请至少勾选一条待实测规约');
      return;
    }

    setBatchExpRunning(true);
    batchExpAbortRef.current = false;
    setBatchResults([]);
    setBatchProgress({
      current: 0,
      total: targetRules.length,
      currentRuleName: targetRules[0].ruleName,
      step: '准备启动大模型实时成对盲测...',
    });

    const accumulatedResults: any[] = [];

    for (let i = 0; i < targetRules.length; i++) {
      if (batchExpAbortRef.current) {
        message.info(`已中止批量实测，已成功完成 ${accumulatedResults.length} 条规约的测试并落盘保存`);
        break;
      }

      const rule = targetRules[i];
      setBatchProgress({
        current: i + 1,
        total: targetRules.length,
        currentRuleName: rule.ruleName,
        step: `[${i + 1}/${targetRules.length}] 正在调用大模型生成 A/B 样章并盲评质检...`,
      });

      let sceneToUse: 'dialogue' | 'conflict' | 'daily' = 'dialogue';
      if (batchScene === 'auto') {
        if (rule.targetDimension === 'scene') {
          sceneToUse = 'daily';
        } else if (rule.targetDimension === 'subtext' || rule.targetDimension === 'pacing') {
          sceneToUse = 'conflict';
        } else {
          sceneToUse = 'dialogue';
        }
      } else {
        sceneToUse = batchScene;
      }

      try {
        const res = await verifyRuleEffect(rule.id, {
          sceneType: sceneToUse,
          sampleCount: batchSampleCount,
          mode: 'live',
          genre: selectedGenre !== 'all' ? selectedGenre : rule.genre,
        });

        if (res.code === 200 && res.data) {
          const itemRes = {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            genre: rule.genre,
            targetDimension: rule.targetDimension,
            status: 'success',
            effectStatus: res.data.effectStatus,
            evaluatorVersion: res.data.evaluatorVersion,
            recommendation: res.data.recommendation,
            gainsObserved: res.data.gainsObserved || [],
            sideEffectsObserved: res.data.sideEffectsObserved || [],
            evidenceBackedGains: res.data.evidenceBackedGains || [],
            evidenceBackedSideEffects: res.data.evidenceBackedSideEffects || [],
            dimensionDeltas: res.data.dimensionDeltas || {},
            data: res.data,
            rule,
          };
          accumulatedResults.push(itemRes);
          setBatchResults([...accumulatedResults]);
        } else {
          accumulatedResults.push({
            ruleId: rule.id,
            ruleName: rule.ruleName,
            genre: rule.genre,
            targetDimension: rule.targetDimension,
            status: 'failed',
            error: res.message || '大模型生成失败',
            rule,
          });
          setBatchResults([...accumulatedResults]);
        }
      } catch (err: any) {
        accumulatedResults.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          genre: rule.genre,
          targetDimension: rule.targetDimension,
          status: 'failed',
          error: err.message || '网络或大模型响应超时',
          rule,
        });
        setBatchResults([...accumulatedResults]);
      }
    }

    setBatchExpRunning(false);
    fetchRules(page, pageSize);
    message.success(`批量实测流程结束！成功完成 ${accumulatedResults.filter(r => r.status === 'success').length} 条规约，可在下方逐条检阅样章`);
  };

  const handleAbortBatchExperiment = () => {
    batchExpAbortRef.current = true;
  };

  const handleInspectFromBatch = (item: any) => {
    setSingleExpRule(item.rule);
    setSingleExpResult(item.data || item.rule.effectProfile || null);
    setIsSingleExpModalOpen(true);
  };

  const handleToggleActive = async (rule: DistillRuleItem, active: boolean) => {
    try {
      // 创作者单人试用与实证审核严格解耦：Switch 只控制 trialActive，绝不修改 status，也绝不降级/篡改实证资格
      const res = await reviewDistillRule(rule.id, {
        trialActive: active,
        auditNotes: active ? '创作者开启个人试用' : '创作者关闭试用',
      });
      if (res.code === 200) {
        message.success(active ? '已开启试用（小说正文写作将实时生效加载）' : '已关闭该规约试用');
        fetchRules();
      }
    } catch (e: any) {
      // 全局拦截
    }
  };

  const handlePromoteToVerified = async (ruleId: number) => {
    try {
      const res = await reviewDistillRule(ruleId, {
        status: 'verified',
        userOverride: true,
        force: true,
        auditNotes: '人工核准晋级为实证规约',
      });
      if (res.code === 200) {
        message.success('规则已核准晋级为实证规约');
        fetchRules();
      }
    } catch (e: any) {
      // 错误由全局拦截
    }
  };

  const handleDemoteToDraft = async (ruleId: number) => {
    try {
      const res = await reviewDistillRule(ruleId, {
        status: 'draft',
        auditNotes: '创作者撤销实证资格转为草稿',
      });
      if (res.code === 200) {
        message.success('已撤销实证资格，转为草稿');
        fetchRules();
      }
    } catch (e: any) {
      // 错误由全局拦截
    }
  };

  const handleBatchToggle = async (targetStatus: 'verified' | 'draft') => {
    const targetRules = rules.filter((r) => r.status !== targetStatus);
    if (targetRules.length === 0) {
      message.info(`当前展示的规则均已是${targetStatus === 'verified' ? '启用' : '停用'}状态`);
      return;
    }
    try {
      const res = await batchReviewDistillRules({
        ruleIds: targetRules.map((r) => r.id),
        status: targetStatus,
        auditNotes: `批量${targetStatus === 'verified' ? '启用' : '停用'}`,
        userOverride: true,
        force: true,
      });
      if (res.code === 200) {
        message.success(`已批量${targetStatus === 'verified' ? '启用' : '停用'} ${targetRules.length} 条规则`);
        fetchRules();
      }
    } catch (e: any) {
      // 错误已由 request 拦截
    }
  };

  const handleBatchTrial = async (active: boolean) => {
    try {
      // 批量试用仅切换当前页规约的 trialActive，绝不篡改实证状态与证据核验结果
      const res = await batchReviewDistillRules({
        ruleIds: rules.map((r) => r.id),
        trialActive: active,
        auditNotes: active ? '个人一键试用当前页' : '一键停止当前页试用',
      });
      if (res.code === 200) {
        message.success(active ? `已开启当前页全部 ${rules.length} 条规约试用！正文写作将自动加载` : `已停止当前页全部 ${rules.length} 条规约试用`);
        fetchRules();
      }
    } catch (e: any) {
      // 错误已由 request 拦截
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      const res = await deleteDistillRule(ruleId);
      if (res.code === 200) {
        message.success('规约已成功彻底删除，后续自动写正文时将不再加载');
        fetchRules(page, pageSize);
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (e: any) {
      message.error(e.message || '网络异常');
    }
  };

  const handleBatchDeleteCurrentPage = async () => {
    if (rules.length === 0) return;
    try {
      const res = await batchDeleteDistillRules(rules.map((r) => r.id));
      if (res.code === 200) {
        message.success(`已彻底删除当前页 ${rules.length} 条规约，后续自动写正文时将不再加载`);
        fetchRules(1, pageSize);
      } else {
        message.error(res.message || '批量删除失败');
      }
    } catch (e: any) {
      message.error(e.message || '网络异常');
    }
  };

  const handleOpenEdit = (rule: DistillRuleItem | null) => {
    setEditingRule(rule);
    if (rule) {
      editForm.setFieldsValue({
        ruleName: rule.ruleName,
        genre: rule.genre,
        targetDimension: rule.targetDimension,
        scopeType: rule.scopeType || 'local',
        conditionPattern: rule.conditionPattern,
        counterConditions: rule.counterConditions,
        sideEffects: rule.sideEffects,
        ruleText: rule.ruleText,
        antiAiPattern: rule.antiAiPattern,
        positiveExemplar: rule.positiveExemplar,
        negativeExemplar: rule.negativeExemplar,
      });
    } else {
      editForm.resetFields();
      editForm.setFieldsValue({
        genre: selectedGenre !== 'all' ? selectedGenre : '体制官场',
        targetDimension: 'dialogue',
        scopeType: 'local',
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);
      if (editingRule) {
        await reviewDistillRule(editingRule.id, { ...values, userOverride: true, force: true });
        message.success('规则修改已保存');
      } else {
        await reviewDistillRule(0, { ...values, status: 'verified', userOverride: true, force: true });
        message.success('新规则已录入并默认生效');
      }
      setIsEditModalOpen(false);
      fetchRules();
    } catch (e: any) {
      // 统一拦截
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenExperiment = async () => {
    setIsExperimentModalOpen(true);
    if (!experimentResult) {
      await handleRunExperiment('demo');
    }
  };

  const handleRunExperiment = async (mode: 'demo' | 'live' = 'demo') => {
    setExperimentLoading(true);
    try {
      const res = await runComparativeExperiment({
        genre: selectedGenre !== 'all' ? selectedGenre : '体制官场',
        targetChapter: { chapterNumber: 1, title: '初入省委办', summary: '面对复杂的股室关系与文书交接' },
        mode,
      });
      if (res.code === 200) {
        setExperimentResult(res.data);
        if (mode === 'live') {
          message.success('真实大模型 A/B/C 三路端到端盲测生成与客观特征质检执行成功！');
        } else {
          message.success('已加载演示性特征基准对照数据');
        }
      }
    } catch (e) {
      // 全局拦截
    } finally {
      setExperimentLoading(false);
    }
  };

  return (
    <div>
      <Card
        title={
          <Space wrap>
            <FireOutlined style={{ color: '#ea580c' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>写作笔法与因果规约库</span>
            <Tag color="success">正式实证: {verifiedTotal} 条</Tag>
            {trialTotal > 0 && <Tag color="orange">额外试用: {trialTotal} 条</Tag>}
            {needsReviewTotal > 0 && <Tag color="gold">待复核: {needsReviewTotal} 条</Tag>}
            <Tag color="default">总库藏: {total} 条</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => fetchRules(page, pageSize)}>
              刷新
            </Button>
            <Button
              icon={<ExperimentOutlined />}
              onClick={handleOpenExperiment}
              style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
            >
              写作效果A/B/C对照实验
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleOpenBatchExperiment}
              style={{ borderColor: '#2563eb', color: '#1d4ed8', fontWeight: 500 }}
            >
              一键全量实测未测规约 ({insufficientTotal}条待测)
            </Button>
            <Button
              icon={<FireOutlined />}
              onClick={() => handleBatchTrial(true)}
              style={{ borderColor: '#f97316', color: '#ea580c' }}
            >
              一键试用当前页 ({rules.length}条)
            </Button>
            <Button
              icon={<StopOutlined />}
              onClick={() => handleBatchTrial(false)}
            >
              一键停用当前页试用
            </Button>
            <Popconfirm
              title={`确定彻底删除当前页展示的全部 ${rules.length} 条规约吗？`}
              description="删除后这些规约将从物理数据库中完全移除，自动生成正文时将不再加载。"
              onConfirm={handleBatchDeleteCurrentPage}
              okText="确认全部删除"
              okType="danger"
              cancelText="取消"
              disabled={rules.length === 0}
            >
              <Button danger icon={<DeleteOutlined />} disabled={rules.length === 0}>
                批量删除当前页
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              onClick={() => handleOpenEdit(null)}
            >
              录入自定笔法
            </Button>
          </Space>
        }
      >
        <Alert
          message="正文写作自动注入体系（解耦实证与试用）"
          description="无需手动编译或打包发版！【实证通过】规约自动注入；【创作者试用】规约由开关控制，即使未满足跨章普遍规律亦可在创作中打标试用，不伪造实证数据。绿色为人类名家克制示范，红色为典型 AI 油腻避坑。"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 筛选栏 */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space>
            <Text type="secondary">题材:</Text>
            <Select
              value={selectedGenre}
              onChange={setSelectedGenre}
              style={{ width: 140 }}
            >
              <Option value="all">全部题材</Option>
              <Option value="体制官场">体制官场</Option>
              <Option value="都市职场">都市职场</Option>
              <Option value="社会现实">社会现实</Option>
              <Option value="悬疑刑侦">悬疑刑侦</Option>
              <Option value="玄幻修真">玄幻修真</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">维度:</Text>
            <Select
              value={selectedDimension}
              onChange={setSelectedDimension}
              style={{ width: 160 }}
            >
              <Option value="all">全部写作维度</Option>
              <Option value="dialogue">对话与潜台词机锋</Option>
              <Option value="scene">场景白描与程序推演</Option>
              <Option value="pacing">因果动机与留白克制</Option>
              <Option value="subtext">心理暗线与利益权衡</Option>
              <Option value="style">语言去AI机械味</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">状态:</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="verified">仅看已实证通过</Option>
              <Option value="trial">仅看创作者试用中</Option>
              <Option value="needs_review">仅看待人工复核</Option>
              <Option value="draft">仅看已停用草稿</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">效果实测:</Text>
            <Select
              value={effectFilter}
              onChange={setEffectFilter}
              style={{ width: 165 }}
            >
              <Option value="all">全部效果结论</Option>
              <Option value="positive">🟢 实测正向 ({positiveTotal})</Option>
              <Option value="negative">🔴 实测负向 ({negativeTotal})</Option>
              <Option value="context_dependent">⚠️ 场景依赖 ({contextTotal})</Option>
              <Option value="insufficient_evidence">❔ 待效果实测 ({insufficientTotal})</Option>
              <Option value="neutral">⚪ 实测中性</Option>
            </Select>
          </Space>

          <Input.Search
            placeholder="搜索笔法关键字/规约/避坑..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchRules(1, pageSize);
            }}
            style={{ width: 220 }}
            allowClear
          />

          <Button
            onClick={() => {
              setSelectedGenre('all');
              setSelectedDimension('all');
              setStatusFilter('all');
              setEffectFilter('all');
              setSearchKeyword('');
            }}
          >
            重置筛选
          </Button>
        </div>

        {/* 规则卡片流 */}
        {rules.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#94a3b8' }}>
            <InfoCircleOutlined style={{ fontSize: 36, marginBottom: 8, display: 'block' }} />
            暂未提炼或检索到符合条件的写作笔法，请前往【语料小说】选择作品点击【一键提炼笔法】！
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rules.map((rule) => {
            const isVerified = rule.status === 'verified';
            const isTrial = Boolean(rule.trialActive);
            const isNeedsReview = rule.status === 'needs_review';
            const isEvidenceOk = Boolean(rule.evidenceVerified);

            return (
              <Card
                key={rule.id}
                size="small"
                style={{
                  borderLeft: isVerified && isEvidenceOk
                    ? '4px solid #16a34a'
                    : isTrial
                    ? '4px solid #f97316'
                    : isNeedsReview
                    ? '4px solid #eab308'
                    : isDark
                    ? '4px solid #475569'
                    : '4px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Space align="center" wrap>
                    <Text strong style={{ fontSize: 16 }}>
                      {rule.ruleName}
                    </Text>
                    {isVerified && isEvidenceOk && <Tag color="success">实证核验通过</Tag>}
                    {isVerified && !isEvidenceOk && <Tag color="gold">人工特批(证据待补)</Tag>}
                    {isTrial && <Tag color="orange">试用生效中</Tag>}
                    {isNeedsReview && <Tag color="gold">待人工复核</Tag>}
                    {!isVerified && !isTrial && !isNeedsReview && <Tag color="default">未启用草稿</Tag>}

                    {/* 第二层：规则效果实测结论标签 */}
                    {rule.effectStatus === 'positive' && (
                      <Tag color="green" style={{ fontWeight: 500 }}>🟢 实测正向</Tag>
                    )}
                    {rule.effectStatus === 'negative' && (
                      <Tag color="red" style={{ fontWeight: 500 }}>🔴 实测负向</Tag>
                    )}
                    {rule.effectStatus === 'context_dependent' && (
                      <Tag color="gold" style={{ fontWeight: 500 }}>⚠️ 场景依赖</Tag>
                    )}
                    {rule.effectStatus === 'neutral' && (
                      <Tag color="default">⚪ 实测中性</Tag>
                    )}
                    {(!rule.effectStatus || rule.effectStatus === 'insufficient_evidence') && (
                      <Tag color="default">❔ 待效果实测</Tag>
                    )}

                    {rule.scopeType === 'cross_chapter' && <Tag color="purple">跨章普遍规律</Tag>}
                    {rule.scopeType === 'local' && <Tag color="blue">局部精妙观察</Tag>}

                    <Tag color="cyan">{rule.genre}</Tag>
                    <Tag color="geekblue">{rule.targetDimension}</Tag>

                    {rule.confidenceScore && (
                      <Tag color="magenta">置信度: {(Number(rule.confidenceScore) * 100).toFixed(0)}%</Tag>
                    )}

                    {rule.isConflict && (
                      <Tooltip title={`存在语义互斥: ${rule.conflictNotes || '与其他规约存在冲突'}`}>
                        <Tag color="red">⚠️ 语义冲突</Tag>
                      </Tooltip>
                    )}

                    {!rule.evidenceVerified && (
                      <Tooltip title="证据尚未在物理语料库中100%精确印证，但支持随时一键试用体验">
                        <Tag color="default">ℹ️ 证据待印证</Tag>
                      </Tooltip>
                    )}

                    {Array.isArray(rule.generalizationWarnings) && rule.generalizationWarnings.length > 0 && (
                      <Tooltip title={rule.generalizationWarnings.join('；')}>
                        <Tag color="warning">⚠️ 绝对化表述</Tag>
                      </Tooltip>
                    )}
                  </Space>

                  <Space>
                    {isVerified ? (
                      <Popconfirm
                        title="确定撤回此规约的实证核准（降为草稿）吗？"
                        onConfirm={() => handleDemoteToDraft(rule.id)}
                        okText="撤回核准"
                        cancelText="取消"
                      >
                        <Button size="small" type="link" danger>
                          撤回核准
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Popconfirm
                        title="确定将此规约直接核准晋级为实证通过规约吗？"
                        onConfirm={() => handlePromoteToVerified(rule.id)}
                        okText="核准晋级"
                        cancelText="取消"
                      >
                        <Button size="small" type="link" icon={<SafetyCertificateOutlined />}>
                          核准实证
                        </Button>
                      </Popconfirm>
                    )}
                    <Tooltip
                      title={
                        rule.trialActive
                          ? '当前规约已开启试用，小说正文写作将实时生效加载。点击可关闭'
                          : '点击开启个人试用，小说正文写作将实时生效加载（不伪造客观实证门禁）'
                      }
                    >
                      <Switch
                        checkedChildren="试用生效"
                        unCheckedChildren="已关闭"
                        checked={Boolean(rule.trialActive)}
                        onChange={(checked) => handleToggleActive(rule, checked)}
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      icon={rule.effectProfile ? <CheckCircleOutlined style={{ color: '#16a34a' }} /> : <ExperimentOutlined />}
                      onClick={() => handleOpenSingleExperiment(rule)}
                    >
                      {rule.effectProfile ? '查看实测报告' : '效果实测'}
                    </Button>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleOpenEdit(rule)}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确定彻底删除此条写作笔法吗？"
                      description="删除后该规则将从物理数据库中移除，后续小说自动生成正文时将不再加载生效。"
                      onConfirm={() => handleDeleteRule(rule.id)}
                      okText="确认删除"
                      okType="danger"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>适用情境:</Text>
                  <Text style={{ fontSize: 13, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155' }}>
                    {rule.conditionPattern || '通用场景'}
                  </Text>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>核心规约:</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#ffd666' : '#0f172a', fontWeight: 500 }}>
                    {rule.ruleText}
                  </Text>
                </div>

                {rule.mechanismExplanation && (
                  <div style={{ marginBottom: 8, fontSize: 12 }}>
                    <Text type="secondary" style={{ marginRight: 8 }}>因果机制:</Text>
                    <Text style={{ color: isDark ? '#93c5fd' : '#1d4ed8' }}>{rule.mechanismExplanation}</Text>
                  </div>
                )}

                {(rule.counterConditions || rule.sideEffects) && (
                  <Row gutter={12} style={{ marginBottom: 10 }}>
                    {rule.counterConditions && (
                      <Col span={rule.sideEffects ? 12 : 24}>
                        <div style={{
                          background: isDark ? 'rgba(250, 173, 20, 0.12)' : '#fffbe6',
                          border: isDark ? '1px solid rgba(250, 173, 20, 0.35)' : '1px solid #ffe58f',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 12,
                        }}>
                          <Text strong style={{ color: isDark ? '#ffc53d' : '#d46b08', display: 'block', marginBottom: 2 }}>
                            🚨 失效反例情境 (何时不可滥用)
                          </Text>
                          <Text style={{ color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#873800' }}>
                            {rule.counterConditions}
                          </Text>
                        </div>
                      </Col>
                    )}
                    {rule.sideEffects && (
                      <Col span={rule.counterConditions ? 12 : 24}>
                        <div style={{
                          background: isDark ? 'rgba(24, 144, 255, 0.12)' : '#e6f7ff',
                          border: isDark ? '1px solid rgba(24, 144, 255, 0.35)' : '1px solid #91d5ff',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 12,
                        }}>
                          <Text strong style={{ color: isDark ? '#40a9ff' : '#096dd9', display: 'block', marginBottom: 2 }}>
                            ⚠️ 副作用防范 (过犹不及)
                          </Text>
                          <Text style={{ color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#003a8c' }}>
                            {rule.sideEffects}
                          </Text>
                        </div>
                      </Col>
                    )}
                  </Row>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{
                      background: isDark ? 'rgba(82, 196, 26, 0.12)' : '#f0fdf4',
                      border: isDark ? '1px solid rgba(82, 196, 26, 0.35)' : '1px solid #bbf7d0',
                      borderRadius: 6,
                      padding: '8px 12px'
                    }}>
                      <Text strong style={{ color: isDark ? '#73d13d' : '#166534', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        真人名家克制示范 (Positive Exemplar)
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#14532d' }}>
                        {rule.positiveExemplar || '未指定示范语句'}
                      </Paragraph>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{
                      background: isDark ? 'rgba(255, 77, 79, 0.12)' : '#fef2f2',
                      border: isDark ? '1px solid rgba(255, 77, 79, 0.35)' : '1px solid #fecaca',
                      borderRadius: 6,
                      padding: '8px 12px'
                    }}>
                      <Text strong style={{ color: isDark ? '#ff7875' : '#991b1b', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        AI 烂套路避坑规约 (Anti-AI Rule)
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#7f1d1d' }}>
                        {rule.antiAiPattern || rule.negativeExemplar || '避免假大空煽情或作者视角提前泄题'}
                      </Paragraph>
                    </div>
                  </Col>
                </Row>

                {/* 规则实测效果档案卡片 (第二、三层正交呈现) */}
                {rule.effectProfile && (
                  <div
                    style={{
                      marginTop: 10,
                      background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                      <Space size={6} wrap>
                        <Text strong style={{ color: isDark ? '#93c5fd' : '#1e40af', fontSize: 12 }}>
                          📊 实测效果档案 ({rule.effectProfile.sceneName || rule.effectProfile.sceneType}场景)
                        </Text>
                        <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
                          样本数: {rule.effectProfile.sampleCount || 3}组配对
                        </Tag>
                        {rule.effectProfile.evaluatorVersion === '2.0.0' ? (
                          <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>v2.0 内容实测</Tag>
                        ) : (
                          <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>旧版评测 (建议重测)</Tag>
                        )}
                        {rule.effectStatus === 'positive' && <Tag color="green" style={{ fontSize: 10, margin: 0 }}>实测收益明显</Tag>}
                        {rule.effectStatus === 'negative' && <Tag color="red" style={{ fontSize: 10, margin: 0 }}>副作用占优</Tag>}
                        {rule.effectStatus === 'context_dependent' && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>场景边界依赖</Tag>}
                        {rule.effectStatus === 'neutral' && <Tag color="default" style={{ fontSize: 10, margin: 0 }}>无显著差异</Tag>}
                      </Space>
                      <Button
                        type="link"
                        size="small"
                        icon={<ExperimentOutlined />}
                        style={{ padding: 0, height: 'auto', fontSize: 11 }}
                        onClick={() => handleOpenSingleExperiment(rule)}
                      >
                        重测/查看详情
                      </Button>
                    </div>

                    {rule.effectProfile.recommendation && (
                      <div style={{ marginBottom: 4, fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155' }}>
                        <Text strong style={{ marginRight: 6 }}>推荐决策:</Text>
                        {rule.effectProfile.recommendation}
                      </div>
                    )}

                    <Row gutter={8} style={{ fontSize: 11 }}>
                      <Col span={12}>
                        <div style={{ color: isDark ? '#86efac' : '#15803d' }}>
                          <strong>收益增益: </strong>
                          {Array.isArray(rule.effectProfile.gainsObserved) && rule.effectProfile.gainsObserved.length > 0
                            ? rule.effectProfile.gainsObserved.join('；')
                            : '无明显维度提升 (Δ < 0.2)'}
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
                          <strong>检出副作用: </strong>
                          {Array.isArray(rule.effectProfile.sideEffectsObserved) && rule.effectProfile.sideEffectsObserved.length > 0
                            ? rule.effectProfile.sideEffectsObserved.join('；')
                            : '未检出显著负向衰减 (无过度生硬/说教风险)'}
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* 真实物理证据链溯源与字符偏移量 */}
                {Array.isArray(rule.contextSnapshots) && rule.contextSnapshots.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                      📚 原文实证链（已通过物理字符偏移核验）:
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rule.contextSnapshots.map((snap, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            background: isDark ? '#1e293b' : '#f8fafc',
                            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                            borderRadius: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                          }}
                        >
                          <Space size={6} wrap style={{ marginBottom: 2 }}>
                            <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
                              {snap.workTitle || '参考作品'} · 第{snap.chapterNumber || 1}章
                            </Tag>
                            {typeof snap.startOffset === 'number' && (
                              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                                偏移: [{snap.startOffset} ~ {snap.endOffset}]
                              </Tag>
                            )}
                            <Tag color={snap.verified ? 'green' : 'orange'} style={{ fontSize: 10, margin: 0 }}>
                              {snap.verified ? '✓ 真实原文核验通过' : '待核查'}
                            </Tag>
                          </Space>
                          <div style={{ color: isDark ? '#cbd5e1' : '#475569', fontStyle: 'italic' }}>
                            "{snap.snippet}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 分页控制器 */}
        {total > 0 && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={['10', '20', '50']}
              showTotal={(tot) => `共 ${tot} 条笔法规约`}
              onChange={(newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
                fetchRules(newPage, newPageSize);
              }}
            />
          </div>
        )}
      </Card>

      {/* 规则编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑写作笔法规约' : '新增自定写作笔法'}
        open={isEditModalOpen}
        onOk={handleSaveRule}
        confirmLoading={saveLoading}
        onCancel={() => setIsEditModalOpen(false)}
        width={680}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="ruleName" label="笔法规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
                <Input placeholder="例如：异常线索多维交叉核验律" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="genre" label="适用题材" rules={[{ required: true }]}>
                <Select>
                  <Option value="体制官场">体制官场</Option>
                  <Option value="都市职场">都市职场</Option>
                  <Option value="社会现实">社会现实</Option>
                  <Option value="悬疑刑侦">悬疑刑侦</Option>
                  <Option value="玄幻修真">玄幻修真</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetDimension" label="写作维度">
                <Select>
                  <Option value="dialogue">对话机锋与潜台词</Option>
                  <Option value="scene">场景白描与制度推演</Option>
                  <Option value="pacing">因果动机与留白克制</Option>
                  <Option value="subtext">心理暗线与利益博弈</Option>
                  <Option value="style">语言去AI化</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="conditionPattern" label="触发场景/前置条件">
                <Input placeholder="例如：面对上位者私下含蓄施压或核账时" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scopeType" label="规约普遍性级别">
                <Select>
                  <Option value="local">局部精妙观察 (单章节或特定局部场景适用)</Option>
                  <Option value="cross_chapter">跨章普遍规律 (多独立章节深度支撑)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sideEffects" label="⚠️ 副作用防范 (过犹不及)">
                <Input placeholder="例如：连续使用易致行文过度压抑，需辅以生活化留白" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ruleText" label="深层叙事规约（核心法则）" rules={[{ required: true, message: '请输入规约正文' }]}>
            <TextArea rows={3} placeholder="详细解释为什么这样写高级，人物行为动机与现实因果逻辑..." />
          </Form.Item>

          <Form.Item name="counterConditions" label="🚨 失效反例情境 (何时绝不可生搬硬套)">
            <TextArea rows={2} placeholder="例如：紧急防汛抢险或现场搜救时，禁止任何迂回试探，必须直接下达确定指令" />
          </Form.Item>

          <Form.Item name="positiveExemplar" label="真人名家克制示范正例">
            <TextArea rows={2} placeholder="优秀范例文句或经典对白片段" />
          </Form.Item>

          <Form.Item name="antiAiPattern" label="AI 常见套路与破局避坑点">
            <TextArea rows={2} placeholder="大模型在此场景最容易犯的假大空套路及规避指令" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 写作效果 A/B/C 对照实验弹窗 */}
      <Modal
        title="写作效果 A/B/C 对照实验与量化盲测"
        open={isExperimentModalOpen}
        onCancel={() => setIsExperimentModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsExperimentModalOpen(false)}>
            关闭
          </Button>,
          <Button
            key="demo-run"
            icon={<ReloadOutlined />}
            loading={experimentLoading}
            onClick={() => handleRunExperiment('demo')}
          >
            刷新基准演示
          </Button>,
          <Button
            key="live-run"
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={experimentLoading}
            onClick={() => handleRunExperiment('live')}
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
          >
            发起真实 AI 正文盲测生成 (3路模型实测)
          </Button>,
        ]}
        width={1060}
        destroyOnClose
      >
        {experimentLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <ExperimentOutlined style={{ fontSize: 36, color: '#7c3aed', marginBottom: 12, display: 'block' }} />
            <Text type="secondary">正在执行 A/B/C 三组盲测推理生成与客观文本指标打分...</Text>
          </div>
        )}

        {!experimentLoading && experimentResult && (
          <div>
            <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Space wrap>
                <Tag color="cyan">测试题材: {experimentResult.genre}</Tag>
                <Tag color="blue">
                  测试章节: 第 {experimentResult.targetChapter?.chapterNumber || 1} 章 · {experimentResult.targetChapter?.title || '初入省委办'}
                </Tag>
                {experimentResult.isLiveModel ? (
                  <Tag color="green">⚡ 真实大模型实时现场推理</Tag>
                ) : (
                  <Tag color="purple">📋 演示性理论基准对照</Tag>
                )}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                实验时间: {new Date(experimentResult.experimentTimestamp).toLocaleString()}
              </Text>
            </div>

            <Alert
              message={experimentResult.isLiveModel ? "真实大模型端到端推理对比已就绪" : "当前为演示性基准模式 (Demo Benchmark)"}
              description={
                experimentResult.isLiveModel
                  ? "当前三组正文段落均为大模型针对该场景现场生成的真实文本；维度评分均由代码分析生成文本的物理特征（AI套路词频、说教词频、动作白描、对话交锋度）客观量化计算所得。"
                  : "当前展示的样章段落与评分为典型特征基准演示，用于直观理解三组规则的边界差异。点击下方【发起真实 AI 正文盲测生成】即可调用写作底模进行真正的三路现场推理与客观质检！"
              }
              type={experimentResult.isLiveModel ? "success" : "info"}
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* A组 */}
              <Col span={8}>
                <Card
                  size="small"
                  title={<Text strong style={{ color: '#64748b' }}>A组 · 基线组 (Baseline)</Text>}
                  extra={<Tag color="default">注入规则: {experimentResult.groupA?.ruleCount} 条</Tag>}
                  style={{
                    background: isDark ? '#1e293b' : '#f8fafc',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                  }}
                >
                  <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#64748b' }}>
                      {experimentResult.groupA?.scores?.compositeScore}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>综合写作质感分 (满分5.0)</Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">因果动机充分度:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.causalMotivation}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">对话自然潜台词:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.dialogueNaturalness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">反机械说教度:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.antiPreachiness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">人物行为连贯性:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.characterConsistency}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">白描克制感官度:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.sensoryRestraint}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">场景制度得体度:</Text>
                      <Text strong>{experimentResult.groupA?.scores?.contextAppropriateness}</Text>
                    </div>
                  </div>

                  {experimentResult.groupA?.sampleProse && (
                    <div style={{ marginTop: 12, padding: '8px 10px', background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff', borderRadius: 6, border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                      <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#94a3b8' : '#475569' }}>
                        📝 正文样章盲测实测片段:
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: isDark ? '#cbd5e1' : '#334155' }}>
                        {experimentResult.groupA.sampleProse}
                      </Paragraph>
                    </div>
                  )}

                  {experimentResult.groupA?.evidenceBreakdown && (
                    <Collapse
                      ghost
                      size="small"
                      style={{ marginTop: 10, background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: 6 }}
                      items={[
                        {
                          key: 'evidence-a',
                          label: (
                            <Text style={{ fontSize: 11, color: isDark ? '#93c5fd' : '#2563eb' }}>
                              🔍 展开评分依据与文本特征溯源
                            </Text>
                          ),
                          children: (
                            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>套路词检出:</Text>
                                {experimentResult.groupA.evidenceBreakdown.clicheMatches?.length > 0 ? (
                                  experimentResult.groupA.evidenceBreakdown.clicheMatches.map((w, idx) => (
                                    <Tag key={idx} color="error" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>零套路词 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>说教/点透词:</Text>
                                {experimentResult.groupA.evidenceBreakdown.preachyMatches?.length > 0 ? (
                                  experimentResult.groupA.evidenceBreakdown.preachyMatches.map((w, idx) => (
                                    <Tag key={idx} color="warning" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>无说教灌输 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>动作物理支点:</Text>
                                {experimentResult.groupA.evidenceBreakdown.actionMatches?.length > 0 ? (
                                  experimentResult.groupA.evidenceBreakdown.actionMatches.slice(0, 6).map((w, idx) => (
                                    <Tag key={idx} color="processing" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="default" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>动作偏少</Tag>
                                )}
                              </div>
                              <Divider style={{ margin: '4px 0' }} />
                              <div>
                                <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 2 }}>维度打分理由:</div>
                                {Object.entries(experimentResult.groupA.evidenceBreakdown.scoreReasons || {}).map(([dim, data]: [string, any]) => {
                                  if (!data || !data.factors || data.factors.length === 0) return null;
                                  const dimLabel = dim === 'causalMotivation' ? '因果动机' :
                                                   dim === 'dialogueNaturalness' ? '对话自然' :
                                                   dim === 'antiPreachiness' ? '反机械说教' :
                                                   dim === 'sensoryRestraint' ? '感官克制' :
                                                   dim === 'contextAppropriateness' ? '场景得体' : dim;
                                  return (
                                    <div key={dim} style={{ lineHeight: 1.4, marginBottom: 3 }}>
                                      <Text strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>[{dimLabel} {data.score}]: </Text>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{data.factors.join('；')}</Text>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}
                </Card>
              </Col>

              {/* B组 */}
              <Col span={8}>
                <Card
                  size="small"
                  title={<Text strong style={{ color: '#d97706' }}>B组 · 全量未严格过滤组</Text>}
                  extra={<Tag color="orange">注入规则: {experimentResult.groupB?.ruleCount} 条</Tag>}
                  style={{
                    background: isDark ? '#292524' : '#fffbeb',
                    borderColor: isDark ? '#78350f' : '#fde68a',
                  }}
                >
                  <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>
                      {experimentResult.groupB?.scores?.compositeScore}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>综合写作质感分 (满分5.0)</Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">因果动机充分度:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.causalMotivation}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">对话自然潜台词:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.dialogueNaturalness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">反机械说教度:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.antiPreachiness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">人物行为连贯性:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.characterConsistency}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">白描克制感官度:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.sensoryRestraint}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">场景制度得体度:</Text>
                      <Text strong>{experimentResult.groupB?.scores?.contextAppropriateness}</Text>
                    </div>
                  </div>

                  {experimentResult.groupB?.sampleProse && (
                    <div style={{ marginTop: 12, padding: '8px 10px', background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff', borderRadius: 6, border: isDark ? '1px solid #78350f' : '1px solid #fed7aa' }}>
                      <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#fb923c' : '#c2410c' }}>
                        📝 正文样章盲测实测片段:
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: isDark ? '#fdba74' : '#9a3412' }}>
                        {experimentResult.groupB.sampleProse}
                      </Paragraph>
                    </div>
                  )}

                  {experimentResult.groupB?.evidenceBreakdown && (
                    <Collapse
                      ghost
                      size="small"
                      style={{ marginTop: 10, background: isDark ? 'rgba(0,0,0,0.2)' : '#fef3c7', borderRadius: 6 }}
                      items={[
                        {
                          key: 'evidence-b',
                          label: (
                            <Text style={{ fontSize: 11, color: isDark ? '#f59e0b' : '#b45309' }}>
                              🔍 展开评分依据与文本特征溯源
                            </Text>
                          ),
                          children: (
                            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>套路词检出:</Text>
                                {experimentResult.groupB.evidenceBreakdown.clicheMatches?.length > 0 ? (
                                  experimentResult.groupB.evidenceBreakdown.clicheMatches.map((w, idx) => (
                                    <Tag key={idx} color="error" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>零套路词 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>说教/点透词:</Text>
                                {experimentResult.groupB.evidenceBreakdown.preachyMatches?.length > 0 ? (
                                  experimentResult.groupB.evidenceBreakdown.preachyMatches.map((w, idx) => (
                                    <Tag key={idx} color="warning" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>无说教灌输 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>动作物理支点:</Text>
                                {experimentResult.groupB.evidenceBreakdown.actionMatches?.length > 0 ? (
                                  experimentResult.groupB.evidenceBreakdown.actionMatches.slice(0, 6).map((w, idx) => (
                                    <Tag key={idx} color="processing" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="default" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>动作偏少</Tag>
                                )}
                              </div>
                              <Divider style={{ margin: '4px 0' }} />
                              <div>
                                <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 2 }}>维度打分理由:</div>
                                {Object.entries(experimentResult.groupB.evidenceBreakdown.scoreReasons || {}).map(([dim, data]: [string, any]) => {
                                  if (!data || !data.factors || data.factors.length === 0) return null;
                                  const dimLabel = dim === 'causalMotivation' ? '因果动机' :
                                                   dim === 'dialogueNaturalness' ? '对话自然' :
                                                   dim === 'antiPreachiness' ? '反机械说教' :
                                                   dim === 'sensoryRestraint' ? '感官克制' :
                                                   dim === 'contextAppropriateness' ? '场景得体' : dim;
                                  return (
                                    <div key={dim} style={{ lineHeight: 1.4, marginBottom: 3 }}>
                                      <Text strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>[{dimLabel} {data.score}]: </Text>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{data.factors.join('；')}</Text>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}

                  {Array.isArray(experimentResult.groupB?.ruleSnapshot) && experimentResult.groupB.ruleSnapshot.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        规则快照: {experimentResult.groupB.ruleSnapshot.slice(0, 3).map(r => r.ruleName).join('、')}
                        {experimentResult.groupB.ruleSnapshot.length > 3 ? ` 等${experimentResult.groupB.ruleSnapshot.length}条` : ''}
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>

              {/* C组 */}
              <Col span={8}>
                <Card
                  size="small"
                  title={<Text strong style={{ color: '#16a34a' }}>C组 · 严格实证通过规约组</Text>}
                  extra={<Tag color="success">注入规则: {experimentResult.groupC?.ruleCount} 条</Tag>}
                  style={{
                    background: isDark ? '#14532d20' : '#f0fdf4',
                    borderColor: isDark ? '#15803d' : '#86efac',
                  }}
                >
                  <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>
                      {experimentResult.groupC?.scores?.compositeScore}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>综合写作质感分 (满分5.0)</Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">因果动机充分度:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.causalMotivation}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">对话自然潜台词:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.dialogueNaturalness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">反机械说教度:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.antiPreachiness}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">人物行为连贯性:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.characterConsistency}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">白描克制感官度:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.sensoryRestraint}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">场景制度得体度:</Text>
                      <Text strong style={{ color: '#16a34a' }}>{experimentResult.groupC?.scores?.contextAppropriateness}</Text>
                    </div>
                  </div>

                  {experimentResult.groupC?.sampleProse && (
                    <div style={{ marginTop: 12, padding: '8px 10px', background: isDark ? 'rgba(0,0,0,0.25)' : '#ffffff', borderRadius: 6, border: isDark ? '1px solid #15803d' : '1px solid #bbf7d0' }}>
                      <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 4, color: isDark ? '#4ade80' : '#15803d' }}>
                        📝 正文样章盲测实测片段:
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: isDark ? '#bbf7d0' : '#14532d' }}>
                        {experimentResult.groupC.sampleProse}
                      </Paragraph>
                    </div>
                  )}

                  {experimentResult.groupC?.evidenceBreakdown && (
                    <Collapse
                      ghost
                      size="small"
                      style={{ marginTop: 10, background: isDark ? 'rgba(0,0,0,0.2)' : '#dcfce7', borderRadius: 6 }}
                      items={[
                        {
                          key: 'evidence-c',
                          label: (
                            <Text style={{ fontSize: 11, color: isDark ? '#4ade80' : '#15803d' }}>
                              🔍 展开评分依据与文本特征溯源
                            </Text>
                          ),
                          children: (
                            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>套路词检出:</Text>
                                {experimentResult.groupC.evidenceBreakdown.clicheMatches?.length > 0 ? (
                                  experimentResult.groupC.evidenceBreakdown.clicheMatches.map((w, idx) => (
                                    <Tag key={idx} color="error" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>零套路词 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>说教/点透词:</Text>
                                {experimentResult.groupC.evidenceBreakdown.preachyMatches?.length > 0 ? (
                                  experimentResult.groupC.evidenceBreakdown.preachyMatches.map((w, idx) => (
                                    <Tag key={idx} color="warning" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="success" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>无说教灌输 (0)</Tag>
                                )}
                              </div>
                              <div>
                                <Text type="secondary" style={{ marginRight: 4 }}>动作物理支点:</Text>
                                {experimentResult.groupC.evidenceBreakdown.actionMatches?.length > 0 ? (
                                  experimentResult.groupC.evidenceBreakdown.actionMatches.slice(0, 6).map((w, idx) => (
                                    <Tag key={idx} color="processing" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>{w}</Tag>
                                  ))
                                ) : (
                                  <Tag color="default" style={{ fontSize: 10, margin: '1px 2px', padding: '0 4px' }}>动作偏少</Tag>
                                )}
                              </div>
                              <Divider style={{ margin: '4px 0' }} />
                              <div>
                                <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 2 }}>维度打分理由:</div>
                                {Object.entries(experimentResult.groupC.evidenceBreakdown.scoreReasons || {}).map(([dim, data]: [string, any]) => {
                                  if (!data || !data.factors || data.factors.length === 0) return null;
                                  const dimLabel = dim === 'causalMotivation' ? '因果动机' :
                                                   dim === 'dialogueNaturalness' ? '对话自然' :
                                                   dim === 'antiPreachiness' ? '反机械说教' :
                                                   dim === 'sensoryRestraint' ? '感官克制' :
                                                   dim === 'contextAppropriateness' ? '场景得体' : dim;
                                  return (
                                    <div key={dim} style={{ lineHeight: 1.4, marginBottom: 3 }}>
                                      <Text strong style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>[{dimLabel} {data.score}]: </Text>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{data.factors.join('；')}</Text>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}

                  {Array.isArray(experimentResult.groupC?.ruleSnapshot) && experimentResult.groupC.ruleSnapshot.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        实证规约: {experimentResult.groupC.ruleSnapshot.map(r => r.ruleName).join('、')}
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 双核指标深入洞察与规约副作用警戒卡片 */}
            {experimentResult.dualCoreComparison && (
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: isDark ? '#1e293b' : '#fafafa',
                  borderColor: experimentResult.dualCoreComparison.hasSideEffectWarning ? '#f59e0b' : '#10b981',
                  borderLeftWidth: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <Space align="center">
                    <Text strong style={{ fontSize: 14 }}>
                      ⚖️ 双核深度对比：对话自然度 vs 叙事反说教倾向
                    </Text>
                    {experimentResult.dualCoreComparison.hasSideEffectWarning ? (
                      <Tag color="warning">⚠️ 检出高密度规约副作用</Tag>
                    ) : (
                      <Tag color="success">✅ 双核指标均衡</Tag>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    防过拟合与留白自检机制
                  </Text>
                </div>

                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <div style={{ padding: '8px 12px', background: isDark ? '#27272a' : '#f8fafc', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong>🗣️ 对话自然度 (生活化松弛感)</Text>
                        <Space>
                          <Text type="secondary">A基线: {experimentResult.dualCoreComparison.dialogueNaturalness.groupA}</Text>
                          <Text type="secondary">C实证: {experimentResult.dualCoreComparison.dialogueNaturalness.groupC}</Text>
                          <Tag color={experimentResult.dualCoreComparison.dialogueNaturalness.deltaCA >= 0 ? 'green' : 'red'}>
                            差值 (C-A): {experimentResult.dualCoreComparison.dialogueNaturalness.deltaCA > 0 ? '+' : ''}
                            {experimentResult.dualCoreComparison.dialogueNaturalness.deltaCA}
                          </Tag>
                        </Space>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {experimentResult.dualCoreComparison.dialogueNaturalness.deltaCA < 0
                          ? '受26条规约约束，C组对白过密承载博弈算计，生活化松弛度略逊于无规约的A组基线。'
                          : '对白潜台词与生活化松弛感维持良好平衡。'}
                      </Text>
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ padding: '8px 12px', background: isDark ? '#27272a' : '#f8fafc', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong>🤐 反机械说教度 (叙事克制与留白)</Text>
                        <Space>
                          <Text type="secondary">A基线: {experimentResult.dualCoreComparison.antiPreachiness.groupA}</Text>
                          <Text type="secondary">C实证: {experimentResult.dualCoreComparison.antiPreachiness.groupC}</Text>
                          <Tag color={experimentResult.dualCoreComparison.antiPreachiness.deltaCA >= 0 ? 'green' : 'red'}>
                            差值 (C-A): {experimentResult.dualCoreComparison.antiPreachiness.deltaCA > 0 ? '+' : ''}
                            {experimentResult.dualCoreComparison.antiPreachiness.deltaCA}
                          </Tag>
                        </Space>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {experimentResult.dualCoreComparison.antiPreachiness.deltaCA < 0
                          ? '规约强化“逢三必解·点透玄机”，容易促使大模型旁白过多解释幕后心机，产生轻微说教感与留白不足。'
                          : '叙事克制得当，无上帝视角生硬说教。'}
                      </Text>
                    </div>
                  </Col>
                </Row>

                {experimentResult.dualCoreComparison.hasSideEffectWarning && experimentResult.dualCoreComparison.warningMessage && (
                  <Alert
                    message={experimentResult.dualCoreComparison.warningMessage}
                    type="warning"
                    showIcon
                  />
                )}
              </Card>
            )}

            <Alert
              message="对比实验量化结论"
              description={experimentResult.conclusion}
              type="success"
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* 单条规约 A/B 配对效果实验台弹窗 */}
      <Modal
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ fontSize: 16 }}>单条写作规约 A/B 配对效果实测台</Text>
            {singleExpRule && <Tag color="blue">{singleExpRule.ruleName}</Tag>}
          </Space>
        }
        open={isSingleExpModalOpen}
        onCancel={() => setIsSingleExpModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnClose
        zIndex={1100}
      >
        {singleExpRule && (
          <div>
            {/* 规约核心信息摘要卡 */}
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              }}
            >
              <Row gutter={12} align="middle">
                <Col span={16}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14, color: isDark ? '#ffd666' : '#0f172a' }}>
                      【{singleExpRule.ruleName}】
                    </Text>
                    <Tag color="cyan" style={{ marginLeft: 6 }}>{singleExpRule.genre}</Tag>
                    <Tag color="geekblue">{singleExpRule.targetDimension}</Tag>
                    {singleExpRule.scopeType === 'cross_chapter' ? (
                      <Tag color="purple">跨章普遍规律</Tag>
                    ) : (
                      <Tag color="blue">局部精妙观察</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155' }}>
                    <Text type="secondary">规约要旨: </Text>
                    {singleExpRule.ruleText}
                  </div>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Space direction="vertical" size={2} align="end">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      证据核验: {singleExpRule.evidenceVerified ? '🟢 物理语料实证通过' : '⚪ 待实证印证'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      当前使用状态: {singleExpRule.trialActive ? '🟠 个人试用中' : '⚪ 未开启试用'}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* 配对实验控制栏 */}
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: isDark ? '#182234' : '#eff6ff',
                borderColor: isDark ? '#1e3a8a' : '#bfdbfe',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <Space wrap>
                  <Text strong style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>实验基准情境:</Text>
                  <Select
                    value={singleExpScene}
                    onChange={(val) => setSingleExpScene(val)}
                    style={{ width: 230 }}
                  >
                    <Option value="dialogue">🗣️ 非正式茶叙试探 (对话自然度)</Option>
                    <Option value="conflict">⚡ 公文签批责任交锋 (权力博弈冲突)</Option>
                    <Option value="daily">🍵 初入股室文书报到 (行政日常过场)</Option>
                  </Select>

                  <Text strong style={{ color: isDark ? '#93c5fd' : '#1e40af', marginLeft: 8 }}>配对样本组数:</Text>
                  <Select
                    value={singleExpSampleCount}
                    onChange={(val) => setSingleExpSampleCount(val)}
                    style={{ width: 140 }}
                  >
                    <Option value={1}>1 组配对 (生成2篇)</Option>
                    <Option value={2}>2 组配对 (生成4篇)</Option>
                    <Option value={3}>3 组配对 (生成6篇)</Option>
                  </Select>
                </Space>

                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  loading={singleExpLoading}
                  onClick={handleExecuteSingleExperiment}
                  style={{ fontWeight: 500 }}
                >
                  {singleExpLoading ? '大模型正在推理创作中...' : '启动大模型真实配对盲测'}
                </Button>
              </div>
            </Card>

            {/* 真实大模型推理中的骨架/提示 */}
            {singleExpLoading && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="🤖 正在调用大模型进行实时创作推理..."
                description="系统正在向本地大模型发起成对并发创作：同时生成 Group A（原生基线）与 Group B（仅注入本笔法）两篇小说正文片段，并由质检引擎进行实时客观物理指标分析，约需 5~15 秒，请稍候。"
              />
            )}

            {/* 实测结果档案展示 */}
            {singleExpResult && (
              <div>
                {/* 核心结论 Banner */}
                <Alert
                  style={{ marginBottom: 16 }}
                  type={
                    singleExpResult.effectStatus === 'positive'
                      ? 'success'
                      : singleExpResult.effectStatus === 'negative'
                      ? 'error'
                      : singleExpResult.effectStatus === 'context_dependent'
                      ? 'warning'
                      : 'info'
                  }
                  showIcon
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>
                          实测结论:{' '}
                          {singleExpResult.effectStatus === 'positive' && '🟢 实测正向 (Positive)'}
                          {singleExpResult.effectStatus === 'negative' && '🔴 实测负向 (Negative)'}
                          {singleExpResult.effectStatus === 'context_dependent' && '⚠️ 场景依赖 (Context-Dependent)'}
                          {singleExpResult.effectStatus === 'neutral' && '⚪ 实测中性 (Neutral)'}
                          {singleExpResult.effectStatus === 'insufficient_evidence' && '❔ 待实测补充'}
                        </Text>
                        <Tag color="cyan">
                          情境: {singleExpResult.sceneName || singleExpResult.sceneType}
                        </Tag>
                        <Tag color="purple">
                          样本: {singleExpResult.sampleCount} 组配对盲评
                        </Tag>
                        {singleExpResult.mode === 'live' && (
                          <Tag color="geekblue">大模型真实端到端生成</Tag>
                        )}
                        {singleExpResult.evaluatorVersion === '2.0.0' ? (
                          <Tag color="blue">v2.0 客观内容实测</Tag>
                        ) : (
                          <Tag color="orange">旧版评分机制 (建议重测)</Tag>
                        )}
                      </Space>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 6 }}>
                      <Paragraph style={{ margin: '0 0 8px 0', fontSize: 13, lineHeight: '1.6' }}>
                        {singleExpResult.recommendation}
                      </Paragraph>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>创作者手动定调修正 (落盘物理数据库):</Text>
                        <Button
                          size="small"
                          type={singleExpResult.effectStatus === 'positive' ? 'primary' : 'default'}
                          onClick={() => handleManualOverrideEffect(singleExpRule?.id, 'positive')}
                        >
                          🟢 确认为正向
                        </Button>
                        <Button
                          size="small"
                          danger
                          type={singleExpResult.effectStatus === 'negative' ? 'primary' : 'default'}
                          onClick={() => handleManualOverrideEffect(singleExpRule?.id, 'negative')}
                        >
                          🔴 判定为负向
                        </Button>
                        <Button
                          size="small"
                          style={{ borderColor: '#d97706', color: '#d97706' }}
                          onClick={() => handleManualOverrideEffect(singleExpRule?.id, 'context_dependent')}
                        >
                          ⚠️ 标为场景依赖
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleManualOverrideEffect(singleExpRule?.id, 'neutral')}
                        >
                          ⚪ 标为实测中性
                        </Button>
                      </div>
                    </div>
                  }
                />

                {/* 1. 真实大模型生成正文盲评对决（完整可见，左右对比） */}
                {(() => {
                  const sampleList = singleExpResult.samples || singleExpResult.samplePairs || [];
                  if (!Array.isArray(sampleList) || sampleList.length === 0) return null;

                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space align="center">
                          <Text strong style={{ fontSize: 14, color: isDark ? '#93c5fd' : '#1e40af' }}>
                            📖 大模型真实生成样章现场对决
                          </Text>
                          <Tag color="blue">{sampleList.length} 组配对</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          同一情境同种子：左栏原生自然基线 vs 右栏引入笔法约束
                        </Text>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {sampleList.map((sample: any, sIdx: number) => {
                          const deltaComp = sample.scoresA && sample.scoresB
                            ? parseFloat((sample.scoresB.compositeScore - sample.scoresA.compositeScore).toFixed(2))
                            : null;

                          return (
                            <Card
                              key={sIdx}
                              size="small"
                              style={{
                                background: isDark ? '#1a2234' : '#fafafa',
                                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                              }}
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Space>
                                    <Tag color="geekblue" style={{ fontSize: 12 }}>配对样本 #{sample.pairIndex || sIdx + 1}</Tag>
                                    <Text strong style={{ fontSize: 13 }}>
                                      情境：{singleExpResult.sceneName || '基准情境'}
                                    </Text>
                                  </Space>
                                  <Space size={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      A基线分: <Text strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{sample.scoresA?.compositeScore ?? '-'}</Text>
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      B单规分: <Text strong style={{ color: isDark ? '#86efac' : '#15803d' }}>{sample.scoresB?.compositeScore ?? '-'}</Text>
                                    </Text>
                                    {deltaComp !== null && (
                                      <Tag color={deltaComp >= 0 ? 'green' : 'red'}>
                                        净差值: {deltaComp >= 0 ? '+' : ''}{deltaComp}
                                      </Tag>
                                    )}
                                  </Space>
                                </div>
                              }
                            >
                              <Row gutter={16}>
                                {/* Group A: 原生基线 */}
                                <Col span={12}>
                                  <div
                                    style={{
                                      borderRadius: 6,
                                      background: isDark ? '#1e293b' : '#ffffff',
                                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding: '8px 12px',
                                        background: isDark ? '#273549' : '#f1f5f9',
                                        borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Space>
                                        <Tag color="default">Group A</Tag>
                                        <Text strong style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>
                                          原生自然基线 (未注入任何规则)
                                        </Text>
                                      </Space>
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        {sample.wordCountA || sample.textA?.length} 字
                                      </Text>
                                    </div>
                                    <div
                                      style={{
                                        padding: '12px 14px',
                                        fontSize: 13.5,
                                        lineHeight: '1.8',
                                        color: isDark ? '#e2e8f0' : '#1e293b',
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: 450,
                                        overflowY: 'auto',
                                      }}
                                    >
                                      {sample.textA}
                                    </div>
                                  </div>
                                </Col>

                                {/* Group B: 引入本条规约 */}
                                <Col span={12}>
                                  <div
                                    style={{
                                      borderRadius: 6,
                                      background: isDark ? '#142a20' : '#f0fdf4',
                                      border: isDark ? '1px solid #166534' : '1px solid #bbf7d0',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding: '8px 12px',
                                        background: isDark ? '#1b3b2c' : '#dcfce7',
                                        borderBottom: isDark ? '1px solid #166534' : '1px solid #bbf7d0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Space>
                                        <Tag color="green">Group B</Tag>
                                        <Text strong style={{ fontSize: 13, color: isDark ? '#86efac' : '#166534' }}>
                                          引入【{singleExpRule.ruleName}】约束
                                        </Text>
                                      </Space>
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        {sample.wordCountB || sample.textB?.length} 字
                                      </Text>
                                    </div>
                                    <div
                                      style={{
                                        padding: '12px 14px',
                                        fontSize: 13.5,
                                        lineHeight: '1.8',
                                        color: isDark ? '#f0fdf4' : '#14532d',
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: 450,
                                        overflowY: 'auto',
                                      }}
                                    >
                                      {sample.textB}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. 收益与副作用对照两栏 */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <CheckCircleOutlined style={{ color: '#16a34a' }} />
                          <span style={{ color: isDark ? '#86efac' : '#15803d' }}>
                            检出明确正向收益 (Δ ≥ +0.2)
                          </span>
                        </Space>
                      }
                      style={{
                        height: '100%',
                        background: isDark ? 'rgba(22, 101, 52, 0.15)' : '#f0fdf4',
                        borderColor: isDark ? '#166534' : '#bbf7d0',
                      }}
                    >
                      {Array.isArray(singleExpResult.evidenceBackedGains) && singleExpResult.evidenceBackedGains.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {singleExpResult.evidenceBackedGains.map((gain: any, gIdx: number) => (
                            <div key={gIdx} style={{ fontSize: 12 }}>
                              <div style={{ color: isDark ? '#86efac' : '#15803d', fontWeight: 500 }}>
                                • {gain.reason || gain}
                              </div>
                              {gain.evidenceSnippet && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    marginLeft: 12,
                                    padding: '4px 8px',
                                    background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                                    borderLeft: '3px solid #16a34a',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    color: isDark ? '#bbf7d0' : '#14532d',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  正文支撑证据: “{gain.evidenceSnippet}”
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : Array.isArray(singleExpResult.gainsObserved) && singleExpResult.gainsObserved.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#14532d' }}>
                          {singleExpResult.gainsObserved.map((gain: string, gIdx: number) => (
                            <li key={gIdx} style={{ marginBottom: 4 }}>{gain}</li>
                          ))}
                        </ul>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>未检出具有统计学显著意义的维度提升 (差值均在 ±0.2 以内)</Text>
                      )}
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <StopOutlined style={{ color: '#dc2626' }} />
                          <span style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
                            检出潜在负向副作用 (Δ ≤ -0.2)
                          </span>
                        </Space>
                      }
                      style={{
                        height: '100%',
                        background: isDark ? 'rgba(153, 27, 27, 0.15)' : '#fef2f2',
                        borderColor: isDark ? '#991b1b' : '#fecaca',
                      }}
                    >
                      {Array.isArray(singleExpResult.evidenceBackedSideEffects) && singleExpResult.evidenceBackedSideEffects.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {singleExpResult.evidenceBackedSideEffects.map((side: any, sIdx: number) => (
                            <div key={sIdx} style={{ fontSize: 12 }}>
                              <div style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontWeight: 500 }}>
                                • {side.reason || side}
                              </div>
                              {side.evidenceSnippet && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    marginLeft: 12,
                                    padding: '4px 8px',
                                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                                    borderLeft: '3px solid #dc2626',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    color: isDark ? '#fca5a5' : '#7f1d1d',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  负面证据片段: “{side.evidenceSnippet}”
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : Array.isArray(singleExpResult.sideEffectsObserved) && singleExpResult.sideEffectsObserved.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#7f1d1d' }}>
                          {singleExpResult.sideEffectsObserved.map((side: string, sIdx: number) => (
                            <li key={sIdx} style={{ marginBottom: 4 }}>{side}</li>
                          ))}
                        </ul>
                      ) : (
                        <Text style={{ fontSize: 12, color: isDark ? '#86efac' : '#15803d' }}>
                          ✓ 未检出显著负向衰减，无生硬说教或过度过拟合风险
                        </Text>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* 3. 8 维度均值与差值 Δ 对比网格 */}
                {singleExpResult.dimensionDeltas && singleExpResult.metricAverages && (
                  <Card
                    size="small"
                    title="8 维量化指标：基线 (A) vs 单规约介入 (B) 差值 Δ (B - A)"
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={[12, 12]}>
                      {Object.keys(singleExpResult.dimensionDeltas).map((key) => {
                        const delta = singleExpResult.dimensionDeltas[key];
                        const aVal = singleExpResult.metricAverages.groupA?.[key] ?? '-';
                        const bVal = singleExpResult.metricAverages.groupB?.[key] ?? '-';
                        const isGain = delta >= 0.2;
                        const isDrop = delta <= -0.2;

                        const DIM_MAP: Record<string, string> = {
                          dialogueNaturalness: '对话生活化自然度',
                          causalMotivation: '因果动机完整度',
                          antiPreachiness: '反机械说教度 (留白)',
                          sceneVividness: '场景白描与制度推演',
                          subtextDepth: '潜台词博弈丰富度',
                          pacingControl: '叙事节奏张弛度',
                          humanVoice: '语言去AI机械味',
                          characterConsistency: '角色口吻一致性',
                        };

                        return (
                          <Col span={6} key={key}>
                            <div
                              style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                background: isDark ? '#1e293b' : '#f8fafc',
                                border: isGain
                                  ? '1px solid #16a34a'
                                  : isDrop
                                  ? '1px solid #dc2626'
                                  : isDark
                                  ? '1px solid #334155'
                                  : '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 12 }}>{DIM_MAP[key] || key}</Text>
                                <Tag
                                  color={isGain ? 'green' : isDrop ? 'red' : 'default'}
                                  style={{ margin: 0, fontSize: 11 }}
                                >
                                  Δ {delta > 0 ? `+${delta}` : delta}
                                </Tag>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>A基线: {aVal}</span>
                                <span style={{ color: isDark ? '#cbd5e1' : '#334155', fontWeight: 500 }}>B单规: {bVal}</span>
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 批量全量实测控制台弹窗 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#2563eb' }} />
            <Text strong style={{ fontSize: 16 }}>批量写作笔法 A/B 效果实测控制台</Text>
            <Tag color="blue">{selectedGenre !== 'all' ? selectedGenre : '全部题材'}</Tag>
            <Tag color="orange">待测规约: {untestedRules.length} 条</Tag>
          </Space>
        }
        open={isBatchExpModalOpen}
        onCancel={() => {
          if (batchExpRunning) {
            Modal.confirm({
              title: '批量实测正在进行中',
              content: '关闭弹窗不会中断已完成的规约保存，但将中止后续规约测试。确认中止并关闭吗？',
              okText: '中止并关闭',
              cancelText: '继续运行',
              okType: 'danger',
              onOk: () => {
                handleAbortBatchExperiment();
                setIsBatchExpModalOpen(false);
              },
            });
          } else {
            setIsBatchExpModalOpen(false);
          }
        }}
        footer={null}
        width={1050}
        destroyOnClose
      >
        <Alert
          message="一键大模型成对盲测机制（解决逐条测试耗时慢痛点）"
          description="系统将为您批量选中的未测试写作规约，依次向大模型发起成对真实创作：生成【原生基线 A 组】与【引入该规约的 B 组】两篇小说正文，由双核客观质检引擎全自动盲评打分，得出【🟢 实测正向】、【⚠️ 场景依赖】或【🔴 负向副作用】客观结论并持久化写入数据库。测试完成后，您可以在下方列表中逐条点击查看样章，也可返回主工作台分类检阅。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 顶部运行配置与总览栏 */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: isDark ? '#1e293b' : '#f8fafc',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          }}
        >
          <Row gutter={[16, 12]} align="middle">
            <Col span={14}>
              <Space wrap size="middle">
                <div>
                  <Text strong style={{ marginRight: 6 }}>基准场景:</Text>
                  <Select
                    value={batchScene}
                    onChange={setBatchScene}
                    disabled={batchExpRunning}
                    style={{ width: 190 }}
                  >
                    <Option value="auto">🎯 智能自适应维度场景</Option>
                    <Option value="dialogue">🗣️ 非正式茶叙试探</Option>
                    <Option value="conflict">⚡ 公文责任交锋博弈</Option>
                    <Option value="daily">🍵 行政文书报到过场</Option>
                  </Select>
                </div>

                <div>
                  <Text strong style={{ marginRight: 6 }}>配对组数:</Text>
                  <Select
                    value={batchSampleCount}
                    onChange={setBatchSampleCount}
                    disabled={batchExpRunning}
                    style={{ width: 140 }}
                  >
                    <Option value={1}>1 组配对 (生成2篇)</Option>
                    <Option value={2}>2 组配对 (生成4篇)</Option>
                  </Select>
                </div>
              </Space>
            </Col>

            <Col span={10} style={{ textAlign: 'right' }}>
              <Space>
                {batchExpRunning ? (
                  <Button
                    danger
                    icon={<PauseCircleOutlined />}
                    onClick={handleAbortBatchExperiment}
                  >
                    中止批量测试 (已完成 {batchResults.length} 条)
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    disabled={selectedBatchRuleIds.length === 0 || untestedRules.length === 0}
                    loading={batchExpFetching}
                    onClick={handleStartBatchExperiment}
                    style={{ backgroundColor: '#2563eb', borderColor: '#2563eb', fontWeight: 500 }}
                  >
                    {batchResults.length > 0 ? '重新开始批量实测' : `开始批量实测 (${selectedBatchRuleIds.length} 条)`}
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 运行中的实时进度条 */}
        {(batchExpRunning || batchProgress.current > 0) && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: isDark ? '#172554' : '#eff6ff',
              borderColor: isDark ? '#1e40af' : '#bfdbfe',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Space>
                {batchExpRunning ? (
                  <Spin size="small" />
                ) : (
                  <CheckCircleOutlined style={{ color: '#16a34a' }} />
                )}
                <Text strong style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>
                  {batchExpRunning ? '大模型正在实时推理成对样章中...' : '🎉 批量实测全部完成！'}
                </Text>
                {batchProgress.currentRuleName && (
                  <Tag color="blue">当前: {batchProgress.currentRuleName}</Tag>
                )}
              </Space>
              <Text strong style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>
                {batchProgress.current} / {batchProgress.total} ({Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%)
              </Text>
            </div>
            <Progress
              percent={Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}
              status={batchExpRunning ? 'active' : 'success'}
              strokeColor={{ '0%': '#2563eb', '100%': '#10b981' }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
              {batchProgress.step}
            </div>
          </Card>
        )}

        {/* 待测规约勾选区 (未运行或测试前展示) */}
        {!batchExpRunning && batchResults.length === 0 && (
          <Card
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Checkbox
                    checked={selectedBatchRuleIds.length === untestedRules.length && untestedRules.length > 0}
                    indeterminate={selectedBatchRuleIds.length > 0 && selectedBatchRuleIds.length < untestedRules.length}
                    onChange={handleToggleSelectAllBatch}
                  >
                    全选全部未测规约
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    已勾选 {selectedBatchRuleIds.length} / {untestedRules.length} 条
                  </Text>
                </Space>
                {untestedRules.length === 0 && !batchExpFetching && (
                  <Tag color="success">当前题材下所有规约均已完成效果实测！</Tag>
                )}
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            {batchExpFetching ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Spin tip="正在检索未测试规约列表..." />
              </div>
            ) : untestedRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: isDark ? '#94a3b8' : '#64748b' }}>
                <CheckCircleOutlined style={{ fontSize: 28, color: '#10b981', marginBottom: 8 }} />
                <div>当前题材下暂无待测规约，全部规约均已生成实测样章与量化档案！</div>
              </div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 8 }}>
                <Row gutter={[12, 10]}>
                  {untestedRules.map((r) => {
                    const isChecked = selectedBatchRuleIds.includes(r.id);
                    return (
                      <Col span={12} key={r.id}>
                        <div
                          onClick={() => handleToggleSelectRule(r.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            background: isChecked
                              ? (isDark ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff')
                              : (isDark ? '#1e293b' : '#f8fafc'),
                            border: isChecked
                              ? '1px solid #3b82f6'
                              : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
                            transition: 'all 0.2s',
                          }}
                        >
                          <Checkbox checked={isChecked} style={{ marginTop: 2 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <Text strong style={{ fontSize: 13, color: isDark ? '#ffd666' : '#0f172a' }}>
                                {r.ruleName}
                              </Text>
                              <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{r.targetDimension}</Tag>
                            </div>
                            <div style={{ fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.65)' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.ruleText}
                            </div>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )}
          </Card>
        )}

        {/* 实测完成/进行中流式结果列表 (测试完我再一个一个看) */}
        {batchResults.length > 0 && (
          <Card
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <Text strong style={{ fontSize: 14 }}>
                    已完成规约效果检阅流 ({batchResults.length}/{batchProgress.total})
                  </Text>
                  <Tag color="success">🟢 正向有效: {batchResults.filter((b) => b.effectStatus === 'positive').length}</Tag>
                  <Tag color="warning">⚠️ 场景依赖: {batchResults.filter((b) => b.effectStatus === 'context_dependent').length}</Tag>
                  <Tag color="error">🔴 负向副作用: {batchResults.filter((b) => b.effectStatus === 'negative').length}</Tag>
                  <Tag color="default">⚪ 中性: {batchResults.filter((b) => b.effectStatus === 'neutral').length}</Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  点击右侧按钮即可查看对应规约的真实生成样章与 8 维对比
                </Text>
              </div>
            }
          >
            <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
              <List
                dataSource={batchResults}
                renderItem={(item) => {
                  const isPositive = item.effectStatus === 'positive';
                  const isContext = item.effectStatus === 'context_dependent';
                  const isNegative = item.effectStatus === 'negative';
                  return (
                    <List.Item
                      key={item.ruleId}
                      style={{
                        padding: '12px 14px',
                        marginBottom: 10,
                        borderRadius: 6,
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      }}
                      actions={[
                        <Button
                          key="inspect"
                          type="primary"
                          ghost
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleInspectFromBatch(item)}
                        >
                          检阅真实样章与对比
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong style={{ fontSize: 14, color: isDark ? '#ffd666' : '#0f172a' }}>
                              【{item.ruleName}】
                            </Text>
                            <Tag color="geekblue">{item.targetDimension}</Tag>
                            <Tag color="cyan">{item.genre}</Tag>
                            {isPositive && <Tag color="success">🟢 实测正向有效</Tag>}
                            {isContext && <Tag color="warning">⚠️ 场景依赖</Tag>}
                            {isNegative && <Tag color="error">🔴 检出负向副作用</Tag>}
                            {item.effectStatus === 'neutral' && <Tag color="default">⚪ 实测中性不明显</Tag>}
                            {(item.evaluatorVersion === '2.0.0' || item.data?.evaluatorVersion === '2.0.0') && (
                              <Tag color="blue">v2.0 客观内容实测</Tag>
                            )}
                            {item.status === 'failed' && <Tag color="error">❌ 测试失败: {item.error}</Tag>}
                          </Space>
                        }
                        description={
                          <div style={{ marginTop: 4 }}>
                            {item.recommendation && (
                              <div style={{ fontSize: 12, color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155', marginBottom: 4 }}>
                                <Text type="secondary">质检建议: </Text>{item.recommendation}
                              </div>
                            )}
                            {Array.isArray(item.evidenceBackedGains) && item.evidenceBackedGains.length > 0 ? (
                              <div style={{ fontSize: 11, color: isDark ? '#86efac' : '#16a34a', marginBottom: 2 }}>
                                收益亮点: {item.evidenceBackedGains.map((g: any) => g.evidenceSnippet ? `${g.reason}（证据: “${g.evidenceSnippet}”）` : (g.reason || g)).join('；')}
                              </div>
                            ) : item.gainsObserved && item.gainsObserved.length > 0 ? (
                              <div style={{ fontSize: 11, color: isDark ? '#86efac' : '#16a34a', marginBottom: 2 }}>
                                收益亮点: {item.gainsObserved.join('；')}
                              </div>
                            ) : null}
                            {Array.isArray(item.evidenceBackedSideEffects) && item.evidenceBackedSideEffects.length > 0 ? (
                              <div style={{ fontSize: 11, color: isDark ? '#fca5a5' : '#dc2626' }}>
                                副作用预警: {item.evidenceBackedSideEffects.map((s: any) => s.evidenceSnippet ? `${s.reason}（证据: “${s.evidenceSnippet}”）` : (s.reason || s)).join('；')}
                              </div>
                            ) : item.sideEffectsObserved && item.sideEffectsObserved.length > 0 ? (
                              <div style={{ fontSize: 11, color: isDark ? '#fca5a5' : '#dc2626' }}>
                                副作用预警: {item.sideEffectsObserved.join('；')}
                              </div>
                            ) : null}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          </Card>
        )}
      </Modal>
    </div>
  );
};
