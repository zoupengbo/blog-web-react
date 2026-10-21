import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Button,
  Space,
  Form,
  Typography,
  Divider,
  Alert,
  message,
  Badge,
  Tooltip,
  Pagination,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  getDistillRules,
  reviewDistillRule,
  batchReviewDistillRules,
  DistillRuleItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const RuleAuditConsole: React.FC = () => {
  const [rules, setRules] = useState<DistillRuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRule, setSelectedRule] = useState<DistillRuleItem | null>(null);

  // 分页状态
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // 筛选器
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  const [editForm] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const fetchRules = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const params: any = { page: targetPage, pageSize: targetPageSize };
      if (filterGenre !== 'all') params.genre = filterGenre;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterDimension !== 'all') params.dimension = filterDimension;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await getDistillRules(params);
      if (res.code === 200) {
        const items = res.data.items || [];
        setRules(items);
        setTotal(res.data.total || 0);
        if (items.length > 0) {
          if (!selectedRule || !items.find((i) => i.id === selectedRule.id)) {
            setSelectedRule(items[0]);
            editForm.setFieldsValue(items[0]);
          } else {
            const current = items.find((i) => i.id === selectedRule.id);
            setSelectedRule(current || null);
            editForm.setFieldsValue(current || {});
          }
        } else {
          setSelectedRule(null);
          editForm.resetFields();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchRules(1, pageSize);
  }, [filterGenre, filterStatus, filterDimension]);

  const handleSelectRule = (r: DistillRuleItem) => {
    setSelectedRule(r);
    editForm.setFieldsValue(r);
  };

  const handleSaveEdits = async () => {
    if (!selectedRule) return;
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);
      const res = await reviewDistillRule(selectedRule.id, values);
      if (res.code === 200) {
        message.success('规则内容精修保存成功');
        fetchRules();
      }
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAuditDecision = async (status: 'verified' | 'rejected' | 'merged') => {
    if (!selectedRule) return;
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);
      const res = await reviewDistillRule(selectedRule.id, {
        ...values,
        status,
      });
      if (res.code === 200) {
        message.success(`规则已裁决为: ${status === 'verified' ? '审核通过入库' : status === 'rejected' ? '已驳回' : '已合并'}`);
        fetchRules();
      }
    } catch (e: any) {
      message.error(e.message || '裁决失败');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={filterGenre}
              onChange={setFilterGenre}
              placeholder="按题材筛选"
            >
              <Option value="all">全部题材</Option>
              <Option value="体制官场">体制官场</Option>
              <Option value="都市职场">都市职场</Option>
              <Option value="社会现实">社会现实</Option>
              <Option value="悬疑刑侦">悬疑刑侦</Option>
              <Option value="科幻未来">科幻未来</Option>
              <Option value="历史演义">历史演义</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="审核状态"
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">待审核草稿 (Draft)</Option>
              <Option value="verified">审核已入库 (Verified)</Option>
              <Option value="rejected">已驳回 (Rejected)</Option>
              <Option value="merged">已合并 (Merged)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              value={filterDimension}
              onChange={setFilterDimension}
              placeholder="能力维度"
            >
              <Option value="all">全部维度</Option>
              <Option value="dialogue">一、对话潜台词与机锋</Option>
              <Option value="pacing">二、叙事留白与节奏</Option>
              <Option value="subtext">三、因果动机与心理</Option>
              <Option value="scene">四、场景白描与制度</Option>
              <Option value="style">五、语言风格与去AI味</Option>
              <Option value="general">六、综合叙事实战军规</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Input.Search
                placeholder="搜索规则关键词"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={() => {
                  setPage(1);
                  fetchRules(1, pageSize);
                }}
                style={{ width: 180 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchRules(page, pageSize)}
                loading={loading}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <div className="audit-layout">
        {/* 左侧：候选规则列表 */}
        <div className="rule-list-panel">
          <div style={{ padding: '4px 4px 8px', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 13, borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
            <span>规则列表 (共 {total} 条)</span>
            <span>第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页</span>
          </div>

          <div className="rule-items-container">
            {rules.map((r) => {
              const isSelected = selectedRule?.id === r.id;
              return (
                <div
                  key={r.id}
                  className={`rule-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectRule(r)}
                >
                  <div className="item-title">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                      {r.ruleName}
                    </span>
                    {r.status === 'verified' && <Tag color="success" style={{ margin: 0 }}>已入库</Tag>}
                    {r.status === 'draft' && <Tag color="warning" style={{ margin: 0 }}>待审</Tag>}
                    {r.status === 'rejected' && <Tag color="error" style={{ margin: 0 }}>驳回</Tag>}
                  </div>
                  <div className="item-meta">
                    <Space direction="horizontal" size={4}>
                      <span style={{ color: '#0284c7' }}>{r.targetDimension}</span>
                      {r.isConflict && (
                        <Tooltip title="与同题材已有规则存在语义互斥冲突">
                          <Tag color="error" style={{ margin: 0, padding: '0 4px' }}>冲突</Tag>
                        </Tooltip>
                      )}
                    </Space>
                    <span>置信度: {(r.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(newPage) => {
                setPage(newPage);
                fetchRules(newPage, pageSize);
              }}
              showSizeChanger={false}
              simple={total > 40}
            />
          </div>
        </div>

        {/* 中间：规则精修与责编审核工作台 */}
        <div className="rule-edit-panel">
          {selectedRule ? (
            <Form form={editForm} layout="vertical">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <Text strong style={{ fontSize: 18 }}>规则精修与定型</Text>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                    ID: #{selectedRule.id} · 题材: {selectedRule.genre}
                  </span>
                </div>
                <Space direction="horizontal">
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveEdits}
                    loading={saveLoading}
                  >
                    暂存精修
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleAuditDecision('rejected')}
                    loading={saveLoading}
                  >
                    驳回
                  </Button>
                  <Button
                    type="primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleAuditDecision('verified')}
                    loading={saveLoading}
                  >
                    审核通过并入库
                  </Button>
                </Space>
              </div>

              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="ruleName" label="规则定名 (25字以内)" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="targetDimension" label="归属能力维度" rules={[{ required: true }]}>
                    <Select>
                      <Option value="dialogue">一、对话潜台词与机锋</Option>
                      <Option value="pacing">二、叙事留白与节奏</Option>
                      <Option value="subtext">三、因果动机与心理</Option>
                      <Option value="scene">四、场景白描与制度</Option>
                      <Option value="style">五、语言风格与去AI味</Option>
                      <Option value="general">六、综合叙事实战军规</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="conditionPattern" label="触发场景 / 适用前置条件" rules={[{ required: true }]}>
                <Input placeholder="例如：面对上位者私下含蓄施压或合规账目核查时适用" />
              </Form.Item>

              <Form.Item name="ruleText" label="核心叙事军规与因果逻辑" rules={[{ required: true }]}>
                <TextArea rows={3} placeholder="详述该笔法背后的现实逻辑、制度因果或读者心理机制" />
              </Form.Item>

              <Form.Item name="antiAiPattern" label="破除 AI 油腻套路模式 (Anti-AI Directive)">
                <TextArea rows={2} placeholder="指明当前大语言模型最容易出现的假大空与模板化问题" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="positiveExemplar" label="真人典范正例 (Human Positive Example)">
                    <TextArea rows={3} placeholder="人类优秀作者的克制、真实白描写法" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="negativeExemplar" label="严禁出现负例 (AI Negative Example)">
                    <TextArea rows={3} placeholder="典型 AI 模板化、背诵动机式错误写法" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="auditNotes" label="责编审核批注与调整意见">
                <TextArea rows={2} placeholder="记录本次审核的调整理由或合并指引" />
              </Form.Item>
            </Form>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
              请在左侧选择需要审核的候选规则
            </div>
          )}
        </div>

        {/* 右侧：证据链溯源与多维质量评估 */}
        <div className="rule-evidence-panel">
          <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 16 }}>
            原文证据追溯与质量评估
          </Text>

          {selectedRule ? (
            <div>
              {/* 规则多维质量评估看板 */}
              {(() => {
                const firstSnap = selectedRule.contextSnapshots?.[0];
                const metrics = firstSnap?.qualityMetrics || {
                  evidenceScore: selectedRule.evidenceMatchRate || (selectedRule.evidenceVerified ? 1.0 : 0.0),
                  specificityScore: 0.85,
                  crossChapterCount: selectedRule.contextSnapshots?.length || 1,
                  crossChapterScore: (selectedRule.contextSnapshots?.length || 1) >= 2 ? 1.0 : 0.65,
                  conflictScore: selectedRule.isConflict ? 0.2 : 1.0,
                };

                return (
                  <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>规约质检可信度得分</span>
                      <Tag color={selectedRule.confidenceScore >= 0.8 ? 'success' : 'orange'} style={{ fontWeight: 700 }}>
                        综合置信度: {Math.round((selectedRule.confidenceScore || 0.85) * 100)}%
                      </Tag>
                    </div>
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <div style={{ padding: '6px 8px', background: '#fff', borderRadius: 4, border: '1px solid #f1f5f9', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>证据实证: </span>
                          <span style={{ fontWeight: 600, color: '#16a34a' }}>
                            {Math.round((metrics.evidenceScore || 0) * 100)}%
                          </span>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: '6px 8px', background: '#fff', borderRadius: 4, border: '1px solid #f1f5f9', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>实战具体: </span>
                          <span style={{ fontWeight: 600, color: '#0284c7' }}>
                            {Math.round((metrics.specificityScore || 0.8) * 100)}%
                          </span>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: '6px 8px', background: '#fff', borderRadius: 4, border: '1px solid #f1f5f9', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>跨章印证: </span>
                          <span style={{ fontWeight: 600, color: (metrics.crossChapterCount || 1) >= 2 ? '#16a34a' : '#d97706' }}>
                            {(metrics.crossChapterCount || 1) >= 2 ? `通过 (${metrics.crossChapterCount} 章)` : '单章'}
                          </span>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: '6px 8px', background: '#fff', borderRadius: 4, border: '1px solid #f1f5f9', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>冲突状态: </span>
                          <span style={{ fontWeight: 600, color: selectedRule.isConflict ? '#dc2626' : '#16a34a' }}>
                            {selectedRule.isConflict ? '有互斥' : '无冲突'}
                          </span>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                );
              })()}

              {/* 语料原文精确切片证据 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>原文切片证据链追踪</span>
                  {selectedRule.evidenceVerified ? (
                    <Tag color="success" icon={<SafetyCertificateOutlined />}>已在库实机核实</Tag>
                  ) : (
                    <Tag color="orange" icon={<WarningOutlined />}>存疑 / 局部未命中</Tag>
                  )}
                </div>

                {(!selectedRule.contextSnapshots || selectedRule.contextSnapshots.length === 0) ? (
                  (selectedRule.evidenceSnippets || []).length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>无原文证据切片引用</Text>
                  ) : (
                    (selectedRule.evidenceSnippets || []).map((sn: any, idx: number) => {
                      const text = typeof sn === 'string' ? sn : sn.snippet || sn.text;
                      return (
                        <div key={idx} className="evidence-box" style={{ marginBottom: 8 }}>
                          <Paragraph style={{ margin: 0 }} copyable={{ text }}>
                            "{text}"
                          </Paragraph>
                        </div>
                      );
                    })
                  )
                ) : (
                  selectedRule.contextSnapshots.map((snap: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        marginBottom: 10,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                          《{snap.workTitle || selectedRule.genre}》第{snap.chapterNumber}章 {snap.chapterTitle || ''}
                        </span>
                        <Space size={4}>
                          {snap.sliceId && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{snap.sliceId}</Tag>}
                          {snap.startOffset !== undefined && (
                            <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
                              偏移 [{snap.startOffset} ~ {snap.endOffset}]
                            </Tag>
                          )}
                        </Space>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 4, borderLeft: '3px solid #0284c7', marginBottom: 6 }}>
                        <Paragraph style={{ margin: 0, fontSize: 13, color: '#0f172a' }} copyable={{ text: snap.snippet }}>
                          "{snap.snippet}"
                        </Paragraph>
                      </div>

                      {snap.contextWindow && (
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, wordBreak: 'break-all' }}>
                          <b>上下文快照：</b> {snap.contextWindow}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <Divider style={{ margin: '16px 0' }} />

              {/* 冲突检测分析 */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  跨规则语义冲突矩阵
                </span>
                {selectedRule.isConflict ? (
                  <div className="conflict-box">
                    <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <WarningOutlined /> 检测到潜在规则互斥冲突
                    </div>
                    <div style={{ lineHeight: 1.5 }}>
                      {selectedRule.conflictNotes || '该规则的核心指令与既有规则存在语义对立，需责编介入调整适用情境或执行合并。'}
                    </div>
                  </div>
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    message="通过语义冲突检测"
                    description="与当前题材规则库中其他规则不存在互斥矛盾。"
                  />
                )}
              </div>
            </div>
          ) : (
            <Text type="secondary">暂无选中规则</Text>
          )}
        </div>
      </div>
    </div>
  );
};
