import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Tag, Drawer, Typography, Button } from 'antd';
import {
  BookOutlined,
  ThunderboltOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  DownOutlined,
  UpOutlined,
  LoadingOutlined,
  FireOutlined,
  MessageOutlined,
  LikeOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { StoryArc, CriticReport, AgentNodeState, WildReaderFeedback } from '../types';
import { PixelAgentsOffice } from './PixelAgentsOffice';

const { Text } = Typography;

interface MultiAgentConsoleProps {
  isOpen?: boolean;
  currentArc: StoryArc | null;
  currentChapterNum: number;
  agentNodes: Record<string, AgentNodeState>;
  criticReport: CriticReport | null;
  wildReaderFeedback?: WildReaderFeedback | null;
  agentThoughts: Array<{ agent: string; thought: string; timestamp?: string }>;
  isGenerating: boolean;
  onStartWrite?: () => void;
}

export const MultiAgentConsole: React.FC<MultiAgentConsoleProps> = ({
  isOpen = true,
  currentArc,
  currentChapterNum,
  agentNodes,
  criticReport,
  wildReaderFeedback,
  agentThoughts,
  isGenerating,
  onStartWrite
}) => {
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [isWhiteboardDrawerOpen, setIsWhiteboardDrawerOpen] = useState<boolean>(false);
  const [isPrinterDrawerOpen, setIsPrinterDrawerOpen] = useState<boolean>(false);
  const [isDailyTasksExpanded, setIsDailyTasksExpanded] = useState<boolean>(true);
  const [isReaderCardMinimized, setIsReaderCardMinimized] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 6 大工位元数据配置（含野生真实读者）
  const deskDefs = useMemo(() => [
    {
      key: 'arc_architect',
      name: '总策划',
      title: '主编 · 大事件架构',
      code: 'ARCHITECT',
      color: '#c084fc',
      icon: <BookOutlined />,
      taskName: '推演3D冲突与大事件弧光',
      defaultSpeech: '大纲长线因果与3D冲突已锁定！'
    },
    {
      key: 'episode_director',
      name: '弧光分镜',
      title: '编剧 · 期待卡分镜',
      code: 'DIRECTOR',
      color: '#fbbf24',
      icon: <ThunderboltOutlined />,
      taskName: '读者追读期待卡与立体分镜',
      defaultSpeech: '本章期待卡与断章令下发完毕！'
    },
    {
      key: 'prose_writer',
      name: '动词写手',
      title: '主笔 · 白描初稿',
      code: 'WRITER',
      color: '#38bdf8',
      icon: <EditOutlined />,
      taskName: '动词白描与初稿高速撰写',
      defaultSpeech: '字字见动词，拒绝假大空！'
    },
    {
      key: 'critic_auditor',
      name: '对抗责编',
      title: '总编 · 质检盖章',
      code: 'CRITIC',
      color: '#fb7185',
      icon: <SafetyCertificateOutlined />,
      taskName: 'AI套话与章末留钩断章质检',
      defaultSpeech: '用放大镜扫视套话与平淡结尾！'
    },
    {
      key: 'deslop_agent',
      name: '去AI味特审',
      title: '主编 · 7 Gate 深度精修',
      code: 'DESLOP',
      color: '#a855f7',
      icon: <span style={{ fontSize: 13 }}>✨</span>,
      taskName: '7 Gate 切除假深刻与官腔套话',
      defaultSpeech: '7 Gate 深度精修，彻底切除 AI 腔！'
    },
    {
      key: 'wild_reader',
      name: '剧情监察官',
      title: '主审 · 因果与看点裁决',
      code: 'SUPERVISOR',
      color: '#f97316',
      icon: <SafetyCertificateOutlined />,
      taskName: '因果合理性与商业看点一票否决质检',
      defaultSpeech: '公事公办，好就是好，不好就是不好！'
    },
    {
      key: 'lorekeeper',
      name: '档案官',
      title: '馆长 · 记忆沉淀',
      code: 'LOREKEEPER',
      color: '#34d399',
      icon: <RobotOutlined />,
      taskName: '世界线档案与进度落盘入库',
      defaultSpeech: '全书设定与进度已安全入库！'
    }
  ], []);

  // 自动滚到最新日志
  useEffect(() => {
    if (terminalEndRef.current && isPrinterDrawerOpen) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentThoughts, isPrinterDrawerOpen]);

  const getBeatTypeName = (type: string) => {
    switch (type) {
      case 'SETUP': return '铺垫章';
      case 'DEVELOPMENT': return '发酵章';
      case 'ESCALATION': return '升级章';
      case 'CLIMAX': return '高潮章';
      case 'AFTERMATH': return '收束幕';
      default: return '推进章';
    }
  };

  const getBeatTension = (type: string) => {
    switch (type) {
      case 'SETUP': return 25;
      case 'DEVELOPMENT': return 50;
      case 'ESCALATION': return 75;
      case 'CLIMAX': return 98;
      case 'AFTERMATH': return 35;
      default: return 40;
    }
  };

  const currentBeatIndex = currentArc?.beats
    ? currentArc.beats.findIndex((_, idx) => (currentArc.startChapter || 1) + idx === currentChapterNum)
    : -1;
  const currentBeat = currentArc?.beats && currentBeatIndex >= 0 ? currentArc.beats[currentBeatIndex] : null;
  const currentTension = currentBeat ? getBeatTension(currentBeat.beatType) : 35;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      background: '#070a12',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ============================================================== */}
      {/* 顶部独立赛博状态栏 (Dedicated Cyberpunk Header Bar - No Overlap!) */}
      {/* ============================================================== */}
      <div style={{
        width: '100%',
        padding: '10px 18px',
        background: 'linear-gradient(180deg, #0e172a 0%, #090e1a 100%)',
        borderBottom: '2px solid #1e3a5f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 20
      }}>
        {/* 左侧：品牌徽标 + 章节张力胶囊 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 赛博像素品牌徽标: 🤖 AGENTS WORK · CREATE · GROW */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 95, 0.9))',
            border: '1.5px solid rgba(56, 189, 248, 0.6)',
            borderRadius: 6,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)'
          }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 900, letterSpacing: '1px', lineHeight: 1.1 }}>
                AGENTS
              </span>
              <span style={{ color: '#94a3b8', fontSize: 7, fontWeight: 700, letterSpacing: '0.5px' }}>
                WORK · CREATE · GROW
              </span>
            </div>
          </div>

          {/* 章节与张力胶囊 */}
          <div
            onClick={() => setIsWhiteboardDrawerOpen(true)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 20,
              padding: '4px 12px',
              color: '#f8fafc',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            <span style={{ color: '#38bdf8' }}>第 {currentChapterNum} 章</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#fbbf24' }}>{currentBeat ? getBeatTypeName(currentBeat.beatType) : '发酵章'}</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: currentTension >= 80 ? '#f43f5e' : '#38bdf8' }}>张力 {currentTension}%</span>
            <Tag color="blue" style={{ fontSize: 9, margin: 0, padding: '0 4px', lineHeight: '16px' }}>查看目标</Tag>
          </div>
        </div>

        {/* 右侧：生成启动按钮 + 协同状态 + 终端流水 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 直接在多 Agent 办公室一键启动生成 */}
          {onStartWrite && !isGenerating && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onStartWrite}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                border: '1px solid #38bdf8',
                borderRadius: 20,
                fontWeight: 700,
                fontSize: 11,
                height: 28,
                padding: '0 14px',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
              }}
            >
              ⚡ 启动第 {currentChapterNum} 章协同生成
            </Button>
          )}


          {/* 终端流水按钮 */}
          <div
            onClick={() => setIsPrinterDrawerOpen(true)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1.5px solid rgba(148, 163, 184, 0.3)',
              borderRadius: 20,
              padding: '4px 10px',
              color: '#cbd5e1',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <PrinterOutlined style={{ color: '#38bdf8' }} />
            <span>终端流水 ({agentThoughts.length})</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2.5D 虚拟办公室沙盒区域 (Canvas + Floating Overlays) */}
      {/* ============================================================== */}
      <div style={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#070a12'
      }}>
        <PixelAgentsOffice
          isOpen={isOpen}
          currentArc={currentArc}
          currentChapterNum={currentChapterNum}
          agentNodes={agentNodes}
          criticReport={criticReport}
          wildReaderFeedback={wildReaderFeedback}
          agentThoughts={agentThoughts}
          isGenerating={isGenerating}
          onSelectAgent={(agentKey) => setSelectedAgentKey(agentKey)}
          selectedAgentKey={selectedAgentKey}
          onOpenWhiteboard={() => setIsWhiteboardDrawerOpen(true)}
          onOpenPrinter={() => setIsPrinterDrawerOpen(true)}
        />

        {/* 左下角【本章任务流水线】真实业务卡片 */}
        <div style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          background: 'rgba(11, 20, 38, 0.98)',
          border: '1.5px solid #0284c7',
          borderRadius: 6,
          width: 310,
          boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 16px rgba(2, 132, 199, 0.25)',
          zIndex: 25,
          overflow: 'hidden'
        }}>
        {/* 卡片头部 */}
        <div
          onClick={() => setIsDailyTasksExpanded(!isDailyTasksExpanded)}
          style={{
            padding: '7px 12px',
            background: 'linear-gradient(90deg, #102a4a, #0b1426)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: isDailyTasksExpanded ? '1px solid #1e3a5f' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>📋</span>
            <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 800, letterSpacing: '0.5px' }}>
              任务流水线
            </span>
            <Tag color="cyan" style={{ fontSize: 10, margin: 0, padding: '0 5px', height: 18, lineHeight: '18px', borderRadius: 3, fontWeight: 700 }}>
              第 {currentChapterNum} 章
            </Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600 }}>
              {deskDefs.filter(d => agentNodes[d.key]?.status === 'done').length}/{deskDefs.length}
            </span>
            <span style={{ color: '#38bdf8', fontSize: 11 }}>
              {isDailyTasksExpanded ? <DownOutlined /> : <UpOutlined />}
            </span>
          </div>
        </div>

        {/* 任务列表 */}
        {isDailyTasksExpanded && (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {deskDefs.map(def => {
              const node = agentNodes[def.key];
              const isRunning = node?.status === 'running';
              const isDone = node?.status === 'done';

              return (
                <div
                  key={def.key}
                  onClick={() => setSelectedAgentKey(def.key)}
                  title={def.taskName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    padding: '4px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: selectedAgentKey === def.key ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: selectedAgentKey === def.key ? `1px solid ${def.color}80` : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* 复选框勾选状态 (☑️ / ⬜) */}
                  {isDone ? (
                    <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 900 }}>☑️</span>
                  ) : isRunning ? (
                    <LoadingOutlined style={{ color: def.color, fontSize: 12 }} />
                  ) : (
                    <span style={{ color: '#64748b', fontSize: 13 }}>⬜</span>
                  )}

                  {/* 任务名称 */}
                  <span style={{
                    color: isDone ? '#94a3b8' : isRunning ? '#38bdf8' : '#e2e8f0',
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontWeight: isRunning ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {def.taskName}
                  </span>

                  {/* 完成绿色对勾标记 (✔) */}
                  {isDone && (
                    <span style={{ color: '#10b981', fontSize: 12, fontWeight: 900 }}>✔</span>
                  )}

                  {/* 角色标识 */}
                  <span style={{ fontSize: 9, color: def.color, fontWeight: 700, flexShrink: 0 }}>
                    {def.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* ============================================================== */}
      {/* 🌟 首席剧情监察官 · 因果与商业看点客观裁决看板 (Plot Supervisor Board) */}
      {/* ============================================================== */}
      {wildReaderFeedback && (
        <div style={{
          position: 'absolute',
          bottom: 18,
          right: 18,
          background: 'rgba(15, 23, 42, 0.98)',
          border: wildReaderFeedback.vetoTriggered ? '1.5px solid #ef4444' : '1.5px solid #f97316',
          borderRadius: 8,
          width: isReaderCardMinimized ? 220 : 360,
          boxShadow: wildReaderFeedback.vetoTriggered
            ? '0 12px 36px rgba(0,0,0,0.85), 0 0 20px rgba(239, 68, 68, 0.35)'
            : '0 12px 36px rgba(0,0,0,0.85), 0 0 20px rgba(249, 115, 22, 0.3)',
          zIndex: 25,
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* 卡片头部 */}
          <div
            onClick={() => setIsReaderCardMinimized(!isReaderCardMinimized)}
            style={{
              padding: '8px 12px',
              background: wildReaderFeedback.vetoTriggered
                ? 'linear-gradient(90deg, #450a0a, #1e293b)'
                : 'linear-gradient(90deg, #431407, #1e293b)',
              borderBottom: isReaderCardMinimized ? 'none' : (wildReaderFeedback.vetoTriggered ? '1px solid #7f1d1d' : '1px solid #7c2d12'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{wildReaderFeedback.readerAvatar || '⚖️'}</span>
              <span style={{ color: '#fed7aa', fontWeight: 800, fontSize: 12 }}>
                {wildReaderFeedback.readerName || '剧情监察官'}
              </span>
              <Tag
                color={wildReaderFeedback.vetoTriggered ? 'red' : 'orange'}
                style={{ fontSize: 9, margin: 0, padding: '0 4px', lineHeight: '16px' }}
              >
                {wildReaderFeedback.vetoTriggered ? '🚨 一票否决 (自愈中)' : (wildReaderFeedback.readerTag || '客观裁决')}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                color: wildReaderFeedback.rating >= 80 ? '#4ade80' : wildReaderFeedback.rating >= 60 ? '#facc15' : '#f87171',
                fontWeight: 900,
                fontSize: 12
              }}>
                {wildReaderFeedback.rating}分
              </span>
              <span style={{ color: '#fdba74', fontSize: 10 }}>
                {isReaderCardMinimized ? <UpOutlined /> : <DownOutlined />}
              </span>
            </div>
          </div>

          {/* 展开内容 */}
          {!isReaderCardMinimized && (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 若触发一票否决：突出警报与归因 */}
              {wildReaderFeedback.vetoTriggered && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 10,
                  color: '#fca5a5'
                }}>
                  <div style={{ fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🚨 严重硬伤否决：</span>
                    <span>{wildReaderFeedback.vetoReason || '剧情硬伤'}</span>
                  </div>
                  <div style={{ marginTop: 2, color: '#fecaca', fontSize: 9 }}>
                    归因：{wildReaderFeedback.rootCauseCategory === 'outline_flaw' ? '细纲规划缺陷（已触发总策划重构大纲）' : '写手表现力不足（已下发写手督办令）'} ➔ 联动二阶自愈中
                  </div>
                </div>
              )}

              {/* 三大维度量化打分条 (因果、爽感、角色智商) */}
              <div style={{
                display: 'flex',
                gap: 6,
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '5px 8px',
                borderRadius: 4,
                border: '1px solid #334155'
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>因果自洽</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: (wildReaderFeedback.reasonableness ?? 85) >= 80 ? '#38bdf8' : '#fb7185' }}>
                    {wildReaderFeedback.reasonableness ?? 85}分
                  </div>
                </div>
                <div style={{ width: 1, background: '#334155' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>商业爽感</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: (wildReaderFeedback.interestAndEngagement ?? 85) >= 80 ? '#fbbf24' : '#fb7185' }}>
                    {wildReaderFeedback.interestAndEngagement ?? 85}分
                  </div>
                </div>
                <div style={{ width: 1, background: '#334155' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>角色智商</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: (wildReaderFeedback.characterAgency ?? 85) >= 80 ? '#34d399' : '#fb7185' }}>
                    {wildReaderFeedback.characterAgency ?? 85}分
                  </div>
                </div>
              </div>

              {/* 冷峻客观裁决一句话 */}
              <div style={{
                background: 'rgba(251, 146, 60, 0.1)',
                borderLeft: '3px solid #f97316',
                padding: '6px 8px',
                borderRadius: '0 4px 4px 0',
                fontSize: 11,
                color: '#ffedd5',
                lineHeight: 1.4,
                fontWeight: 600
              }}>
                ⚖️ "{wildReaderFeedback.verdictSummary || wildReaderFeedback.oneLineVerdict}"
              </div>

              {/* 客观诊断明细 (因果/节奏/角色互动) */}
              {wildReaderFeedback.bulletComments && wildReaderFeedback.bulletComments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageOutlined style={{ color: '#f97316' }} />
                    <span>监察客观诊断 ({wildReaderFeedback.bulletComments.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 85, overflowY: 'auto' }}>
                    {wildReaderFeedback.bulletComments.map((comment: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(249, 115, 22, 0.25)',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 10,
                          color: '#e2e8f0',
                          lineHeight: 1.3
                        }}
                      >
                        <span>{comment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 监察整改令 */}
              {wildReaderFeedback.remedyDirectives && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 4,
                  padding: '5px 8px',
                  fontSize: 10,
                  color: '#fef3c7',
                  border: '1px dashed #f59e0b'
                }}>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>🛠️ 监察整改令：</span>
                  <span>{wildReaderFeedback.remedyDirectives}</span>
                </div>
              )}

              {/* 下章期待 */}
              {wildReaderFeedback.nextChapterExpectation && (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  borderRadius: 4,
                  padding: '5px 8px',
                  fontSize: 10,
                  color: '#cbd5e1',
                  border: '1px dashed #475569'
                }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>🎯 下章期待：</span>
                  <span>{wildReaderFeedback.nextChapterExpectation}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ============================================================== */}
      {/* 抽屉 1：📋 战役大纲与 5 阶段节拍白板抽屉 */}
      {/* ============================================================== */}
      <Drawer
        title={<span style={{ color: '#fde047', fontWeight: 800 }}>📋 战役白板：{currentArc?.title || `【第 ${currentChapterNum} 章大纲推进】`}</span>}
        placement="top"
        height={220}
        onClose={() => setIsWhiteboardDrawerOpen(false)}
        open={isWhiteboardDrawerOpen}
        bodyStyle={{ background: '#0f172a', padding: '14px 20px', color: '#f8fafc' }}
        headerStyle={{ background: '#1e293b', borderBottom: '2px solid #334155' }}
      >
        {currentArc?.goal && (
          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 12, background: '#1e293b', padding: '6px 12px', borderLeft: '4px solid #eab308', borderRadius: 2 }}>
            <span style={{ color: '#eab308', fontWeight: 700 }}>战略目标：</span>
            {currentArc.goal}
          </div>
        )}

        {currentArc?.beats && currentArc.beats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentArc.beats.map((beat, idx) => {
              const beatChapNum = (currentArc.startChapter || 1) + idx;
              const isCurrent = beatChapNum === currentChapterNum;
              const isDone = currentArc.completedChapters?.includes(beatChapNum);

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: isCurrent ? '#0c4a6e' : isDone ? '#064e3b' : '#1e293b',
                    border: isCurrent ? '2px solid #38bdf8' : isDone ? '1px solid #10b981' : '1px solid #334155',
                    padding: '8px 10px',
                    borderRadius: 4
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: '1px 4px', background: isCurrent ? '#0284c7' : '#475569', color: '#fff', borderRadius: 2, fontWeight: 700 }}>
                      {getBeatTypeName(beat.beatType)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? '#38bdf8' : '#e2e8f0' }}>
                      第{beatChapNum}章
                    </span>
                    {isDone && <CheckCircleOutlined style={{ color: '#34d399', fontSize: 12 }} />}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                    {beat.name}
                  </div>
                  {beat.guideline && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {beat.guideline}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* ============================================================== */}
      {/* 抽屉 2：📠 针式打印机终端流水抽屉 */}
      {/* ============================================================== */}
      <Drawer
        title={<span style={{ color: '#38bdf8', fontWeight: 800 }}>📠 针式打印机 · 实时终端思维流水</span>}
        placement="bottom"
        height={260}
        onClose={() => setIsPrinterDrawerOpen(false)}
        open={isPrinterDrawerOpen}
        bodyStyle={{ background: '#090d16', padding: '12px 16px', color: '#f8fafc', fontFamily: 'Courier New, monospace' }}
        headerStyle={{ background: '#1e293b', borderBottom: '2px solid #334155' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, lineHeight: 1.5 }}>
          {agentThoughts.map((t, idx) => {
            let agentColor = '#38bdf8';
            if (t.agent.includes('architect')) agentColor = '#c084fc';
            else if (t.agent.includes('director')) agentColor = '#fbbf24';
            else if (t.agent.includes('writer')) agentColor = '#38bdf8';
            else if (t.agent.includes('critic')) agentColor = '#fb7185';
            else if (t.agent.includes('lore')) agentColor = '#34d399';

            return (
              <div key={idx} style={{ color: '#cbd5e1', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#64748b', flexShrink: 0 }}>[{t.timestamp || 'LIVE'}]</span>
                <span style={{ color: agentColor, fontWeight: 800, flexShrink: 0 }}>[{t.agent.toUpperCase()}] &gt;&gt;</span>
                <span style={{ wordBreak: 'break-all' }}>{t.thought}</span>
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>
      </Drawer>
    </div>
  );
};

export default MultiAgentConsole;
