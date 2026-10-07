import React from 'react';
import { Modal, Tag, Button, Input, Row, Col, Card, Rate } from 'antd';
import { ThunderboltOutlined, SyncOutlined } from '@ant-design/icons';
import { PaperTheme, PlotProposal, SuggestedPlotData } from '../types';

export interface SuggestPlotModalProps {
  open: boolean;
  onCancel: () => void;
  suggestedPlotData: SuggestedPlotData;
  suggestingPlot: boolean;
  refineInstruction: string;
  setRefineInstruction: (val: string) => void;
  onFetchPlotSuggestion: (instruction?: string) => void;
  onAdoptSuggestion: (suggestion: string) => void;
  paperTheme?: PaperTheme;
}

interface ProposalStyleMeta {
  typeKey: string;
  typeName: string;
  badgeIcon: string;
  tagColor: string;
  borderColor: string;
  buttonColor: string;
  accentColor: string;
}

const getProposalMeta = (p: PlotProposal, index: number): ProposalStyleMeta => {
  const typeKey = (p.typeKey || '').toLowerCase();
  const type = (p.type || '').toUpperCase();
  const name = p.typeName || '';

  // 1. 💥 爽点逆袭型 (REVERSAL_FACE_SLAP)
  if (
    typeKey === 'counterattack' ||
    type === 'REVERSAL_FACE_SLAP' ||
    name.includes('爽点') ||
    name.includes('逆袭')
  ) {
    return {
      typeKey: 'counterattack',
      typeName: p.typeName || '爽点逆袭型',
      badgeIcon: '💥',
      tagColor: 'volcano',
      borderColor: '#fa541c',
      buttonColor: '#fa541c',
      accentColor: '#fa541c'
    };
  }

  // 2. 🕵️ 悬疑伏笔型 (SUSPENSE_FORESHADOW)
  if (
    typeKey === 'suspense' ||
    type === 'SUSPENSE_FORESHADOW' ||
    name.includes('悬疑') ||
    name.includes('伏笔')
  ) {
    return {
      typeKey: 'suspense',
      typeName: p.typeName || '悬疑伏笔型',
      badgeIcon: '🕵️',
      tagColor: 'purple',
      borderColor: '#722ed1',
      buttonColor: '#722ed1',
      accentColor: '#9254de'
    };
  }

  // 3. ⚡ 反转破局型 (TWIST_BREAKTHROUGH)
  if (
    typeKey === 'twist' ||
    type === 'TWIST_BREAKTHROUGH' ||
    name.includes('反转') ||
    name.includes('破局')
  ) {
    return {
      typeKey: 'twist',
      typeName: p.typeName || '反转破局型',
      badgeIcon: '⚡',
      tagColor: 'cyan',
      borderColor: '#13c2c2',
      buttonColor: '#08979c',
      accentColor: '#13c2c2'
    };
  }

  // Fallback by index
  if (index === 0) {
    return {
      typeKey: 'counterattack',
      typeName: p.typeName || '爽点逆袭型',
      badgeIcon: '💥',
      tagColor: 'volcano',
      borderColor: '#fa541c',
      buttonColor: '#fa541c',
      accentColor: '#fa541c'
    };
  }
  if (index === 1) {
    return {
      typeKey: 'suspense',
      typeName: p.typeName || '悬疑伏笔型',
      badgeIcon: '🕵️',
      tagColor: 'purple',
      borderColor: '#722ed1',
      buttonColor: '#722ed1',
      accentColor: '#9254de'
    };
  }
  return {
    typeKey: 'twist',
    typeName: p.typeName || '反转破局型',
    badgeIcon: '⚡',
    tagColor: 'cyan',
    borderColor: '#13c2c2',
    buttonColor: '#08979c',
    accentColor: '#13c2c2'
  };
};

export const SuggestPlotModal: React.FC<SuggestPlotModalProps> = ({
  open,
  onCancel,
  suggestedPlotData,
  suggestingPlot,
  refineInstruction,
  setRefineInstruction,
  onFetchPlotSuggestion,
  onAdoptSuggestion,
  paperTheme = 'dark',
}) => {
  const rawProposals = suggestedPlotData.proposals;
  const displayProposals: PlotProposal[] = (Array.isArray(rawProposals) && rawProposals.length > 0)
    ? rawProposals
    : [
        {
          id: 'fallback_single_proposal',
          type: 'REVERSAL_FACE_SLAP',
          typeKey: 'counterattack',
          typeName: '推荐剧情走向',
          title: '总策划推荐走向',
          tagline: '因果逻辑闭环推进',
          summary: suggestedPlotData.suggestion || '暂无建议内容',
          tensionRating: 5,
          causalChain: {
            cause: '承接前情未解冲突与核心动线',
            obstacle: '遭遇当前阻碍与敌对威胁',
            confrontation: '正向博弈应对，化解危机',
            outcome: '确凿战果达成，格局演进',
            hook: '章尾留下新悬念与后续引子'
          }
        }
      ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            🪄 总策划 Agent (ArcArchitect) 灵感智囊工作台
          </span>
          {suggestedPlotData.hasCorrected ? (
            <Tag color="orange" style={{ fontSize: 12, padding: '2px 8px' }}>
              🔧 已自动纠偏并完成审核
            </Tag>
          ) : (
            <Tag color="green" style={{ fontSize: 12, padding: '2px 8px' }}>
              ✅ 已通过因果链深度审核
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>,
        <Button
          key="regenerate"
          icon={<SyncOutlined spin={suggestingPlot} />}
          loading={suggestingPlot}
          onClick={() => onFetchPlotSuggestion(refineInstruction)}
          style={{ fontWeight: 600 }}
        >
          🔄 结合最高指导意见重构提案
        </Button>
      ]}
      width={1200}
      centered
      zIndex={1100}
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
      style={{ maxWidth: '96vw', top: 20 }}
    >
      <div style={{ padding: '4px 0' }}>
        {/* Top: 作者最高指导意见 */}
        <div
          className="modal-tip-banner"
          style={{
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 14
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#ffd666',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
            <span>⚡ 作者最高指导意见（最高优先级，AI 重构时将 100% 严格遵循您的指示）：</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Input.TextArea
              rows={2}
              placeholder="请输入您希望 AI 重新构思或微调的明确要求（例如：增加主角与反派在死者仓库里的正面智斗线索；或者：揭晓死者身上藏着的秘密档案...）"
              value={refineInstruction}
              onChange={e => setRefineInstruction(e.target.value)}
              style={{ borderRadius: 6, flex: 1 }}
              onPressEnter={e => {
                if (e.ctrlKey || e.metaKey) {
                  onFetchPlotSuggestion(refineInstruction);
                }
              }}
            />
            <Button
              type="primary"
              icon={<SyncOutlined spin={suggestingPlot} />}
              loading={suggestingPlot}
              onClick={() => onFetchPlotSuggestion(refineInstruction)}
              style={{
                height: 54,
                borderRadius: 6,
                fontWeight: 600,
                backgroundColor: '#d97706',
                borderColor: '#d97706',
                whiteSpace: 'normal',
                lineHeight: 1.2,
                padding: '4px 14px',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <span>🔄 结合指导意见</span>
              <span>重构3组提案</span>
            </Button>
          </div>
        </div>

        {/* Logic Audit: 逻辑审核官因果链校验报告 */}
        <div
          className="modal-tip-banner"
          style={{
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: suggestedPlotData.hasCorrected ? '#fa8c16' : '#52c41a',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔍 逻辑审核官因果链校验报告：</span>
            </div>
            {suggestedPlotData.hasCorrected ? (
              <Tag color="orange" style={{ fontSize: 11, padding: '0 6px', margin: 0 }}>
                🔧 逻辑已自动纠偏并完成闭环审核
              </Tag>
            ) : (
              <Tag color="green" style={{ fontSize: 11, padding: '0 6px', margin: 0 }}>
                ✅ 逻辑审核官因果链一致性通过
              </Tag>
            )}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
            {suggestedPlotData.auditMessage ||
              '已完成多轮因果链与前文一致性对比审核，剔除了前文未铺垫的硬凹断言，剧情承接自然合规。'}
          </div>
        </div>

        {/* Header for 3-Card Grid */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: '#ffd666',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>💡 差异化冲突走向提案工作台</span>
            <Tag color="blue" style={{ fontSize: 11, padding: '0 6px' }}>
              {displayProposals.length} 组独立推演走向
            </Tag>
          </div>
          <span style={{ fontSize: 12, color: '#a1a1aa' }}>
            选择您心仪的剧情走向，点击卡片下方按钮一键采纳
          </span>
        </div>

        {/* 3-Card Grid */}
        <Row gutter={[16, 16]}>
          {displayProposals.map((proposal, idx) => {
            const meta = getProposalMeta(proposal, idx);
            const chain = proposal.causalChain || {};
            const hasChain = !!(
              chain.cause ||
              chain.obstacle ||
              chain.confrontation ||
              chain.outcome ||
              chain.hook
            );

            return (
              <Col
                xs={24}
                lg={displayProposals.length === 1 ? 24 : 8}
                key={proposal.id || proposal.type || idx}
              >
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${meta.borderColor}55`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                    transition: 'all 0.3s ease'
                  }}
                  bodyStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '14px 14px'
                  }}
                >
                  {/* Card Header: Type Tag, Tagline, Tension Rating */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      gap: 4
                    }}
                  >
                    <Tag
                      color={meta.tagColor}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '2px 8px',
                        margin: 0
                      }}
                    >
                      {meta.badgeIcon} {proposal.typeName || meta.typeName}
                    </Tag>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: '#ffd666', fontWeight: 600 }}>
                        张力:
                      </span>
                      <Rate
                        count={5}
                        disabled
                        value={proposal.tensionRating || (idx === 1 ? 4 : 5)}
                        style={{ fontSize: 12, color: '#faad14' }}
                      />
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  {proposal.title && (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#f4f4f5',
                        marginBottom: 4
                      }}
                    >
                      {proposal.title}
                    </div>
                  )}
                  {proposal.tagline && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#a1a1aa',
                        fontWeight: 500,
                        marginBottom: 8
                      }}
                    >
                      ⚡ {proposal.tagline}
                    </div>
                  )}

                  {/* Causal Chain 5 Steps */}
                  {hasChain && (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.28)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        marginBottom: 10,
                        fontSize: 12
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#ffd666',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>⛓️ 因果逻辑链（起因 ➔ 阻力 ➔ 博弈 ➔ 战果 ➔ 留钩）：</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          lineHeight: 1.5
                        }}
                      >
                        {chain.cause && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Tag
                              color="default"
                              style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}
                            >
                              起因
                            </Tag>
                            <span style={{ color: '#d4d4d8', wordBreak: 'break-word' }}>
                              {chain.cause}
                            </span>
                          </div>
                        )}
                        {chain.obstacle && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Tag
                              color="error"
                              style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}
                            >
                              阻力
                            </Tag>
                            <span style={{ color: '#d4d4d8', wordBreak: 'break-word' }}>
                              {chain.obstacle}
                            </span>
                          </div>
                        )}
                        {chain.confrontation && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Tag
                              color="warning"
                              style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}
                            >
                              博弈
                            </Tag>
                            <span style={{ color: '#d4d4d8', wordBreak: 'break-word' }}>
                              {chain.confrontation}
                            </span>
                          </div>
                        )}
                        {chain.outcome && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Tag
                              color="success"
                              style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}
                            >
                              战果
                            </Tag>
                            <span style={{ color: '#d4d4d8', wordBreak: 'break-word' }}>
                              {chain.outcome}
                            </span>
                          </div>
                        )}
                        {chain.hook && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Tag
                              color="processing"
                              style={{ margin: 0, fontSize: 11, padding: '0 4px', flexShrink: 0 }}
                            >
                              留钩
                            </Tag>
                            <span style={{ color: '#d4d4d8', wordBreak: 'break-word' }}>
                              {chain.hook}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Plot Summary */}
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#ffd666',
                      marginBottom: 4
                    }}
                  >
                    📖 剧情白描事实流：
                  </div>
                  <div
                    className="modal-preview-box"
                    style={{
                      borderRadius: 6,
                      padding: '10px 12px',
                      fontSize: 13,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      minHeight: 110,
                      maxHeight: 180,
                      overflowY: 'auto',
                      marginBottom: 12,
                      flex: 1
                    }}
                  >
                    {proposal.summary}
                  </div>

                  {/* Action Button: 采纳此方案 */}
                  <Button
                    type="primary"
                    block
                    size="middle"
                    style={{
                      backgroundColor: meta.buttonColor,
                      borderColor: meta.buttonColor,
                      fontWeight: 700,
                      marginTop: 'auto',
                      height: 38,
                      borderRadius: 6,
                      boxShadow: `0 2px 8px ${meta.accentColor}33`
                    }}
                    onClick={() => onAdoptSuggestion(proposal.summary)}
                  >
                    ✅ 采纳此方案
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </Modal>
  );
};
