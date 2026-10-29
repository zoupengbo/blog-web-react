import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Space, Button, Select, Radio, Tag, Switch, Input } from 'antd';
import { RocketOutlined, RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { PaperTheme, NovelOutline } from '../types';

interface AutoCruiseModalProps {
  open: boolean;
  onCancel: () => void;
  defaultStartChapter: number;
  selectedOutline: NovelOutline;
  wordCountLimit: number;
  onStartCruise: (params: {
    startChapterNum: number;
    targetCount: number;
    wordCountLimit: number;
    useMultiAgent?: boolean;
    authorGuidance?: string;
    isRewriteMode?: boolean;
    lockOutline?: boolean;
  }) => void;
  paperTheme?: PaperTheme;
  lastInterruptedSession?: {
    chapterNum: number;
    remainingCount: number;
    limit: number;
    useMultiAgent: boolean;
    reason: string;
  } | null;
  onClearInterruptedSession?: () => void;
}

export const AutoCruiseModal: React.FC<AutoCruiseModalProps> = ({
  open,
  onCancel,
  defaultStartChapter = 1,
  selectedOutline,
  wordCountLimit: initialWordCount = 2500,
  onStartCruise,
  paperTheme = 'dark',
  lastInterruptedSession,
  onClearInterruptedSession
}) => {
  const [startChapterNum, setStartChapterNum] = useState<number>(defaultStartChapter);
  const [targetCount, setTargetCount] = useState<number>(3);
  const [selectedWordLimit, setSelectedWordLimit] = useState<number>(initialWordCount);
  const [useMultiAgent, setUseMultiAgent] = useState<boolean>(true);
  const [authorGuidance, setAuthorGuidance] = useState<string>('');

  // 智能识别当前选中的起始章节是否属于历史已存在/已完成章节（重写场景）
  const chList = (selectedOutline?.chaptersOutline || []) as any[];
  const targetChapter = chList.find(c => parseInt(c.chapterNumber, 10) === startChapterNum);
  const isRewrite = Boolean(targetChapter && (targetChapter.status === 'completed' || (targetChapter.wordCount && targetChapter.wordCount > 0)));

  // 当弹窗打开时，优先采用当前正在查看的活动章节，方便直接针对当前章启动连写/重写
  useEffect(() => {
    if (open) {
      if (defaultStartChapter && defaultStartChapter > 0) {
        setStartChapterNum(defaultStartChapter);
      } else {
        const firstPending = chList.find(c => c.status !== 'completed');
        if (firstPending && firstPending.chapterNumber) {
          setStartChapterNum(firstPending.chapterNumber);
        } else {
          const maxCh = chList.reduce((max, c) => Math.max(max, parseInt(c.chapterNumber, 10) || 0), 0);
          setStartChapterNum(maxCh > 0 ? maxCh + 1 : 1);
        }
      }
    }
  }, [open, defaultStartChapter]);

  const handleStart = () => {
    onStartCruise({
      startChapterNum: startChapterNum || 1,
      targetCount: targetCount || 3,
      wordCountLimit: selectedWordLimit,
      useMultiAgent,
      authorGuidance: authorGuidance.trim() || undefined,
      isRewriteMode: isRewrite,
      lockOutline: true
    });
  };

  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 700, color: '#ffd666', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RocketOutlined style={{ color: '#d4b106' }} />
          全自动连写巡航控制台
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
      className="auto-cruise-modal"
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
      centered
    >
      <div style={{ marginTop: 12 }}>
        {isRewrite && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 16,
              background: 'rgba(82, 196, 26, 0.12)',
              border: '1px solid rgba(82, 196, 26, 0.45)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12
            }}
          >
            <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#73d13d' }}>
                🔁 历史章节重写模式已激活
              </div>
              <div style={{ color: '#d9d9d9', marginTop: 2, lineHeight: '18px' }}>
                检测到第 {startChapterNum} 章已有大纲或正文。已强制启用【大纲只读锁定】（严禁私自篡改大纲），巡航将严格按现有细纲顺序重写正文。
              </div>
            </div>
          </div>
        )}

        {lastInterruptedSession && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 16,
              background: 'rgba(250, 140, 22, 0.12)',
              border: '1px solid rgba(250, 140, 22, 0.45)',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#ffa940', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠️ 检测到上次连写在【第 {lastInterruptedSession.chapterNum} 章】中断</span>
              </div>
              <div style={{ fontSize: 12, color: '#d9d9d9', marginTop: 4 }}>
                剩余 {lastInterruptedSession.remainingCount} 章未完成 · 原因：{lastInterruptedSession.reason || '网络波动或质检打回'}
              </div>
            </div>
            <Space>
              <Button
                type="primary"
                size="small"
                style={{
                  background: 'linear-gradient(135deg, #fa8c16, #fa541c)',
                  borderColor: '#fa541c',
                  fontWeight: 600
                }}
                onClick={() => {
                  setStartChapterNum(lastInterruptedSession.chapterNum);
                  setTargetCount(lastInterruptedSession.remainingCount);
                  setSelectedWordLimit(lastInterruptedSession.limit || 2500);
                  setUseMultiAgent(lastInterruptedSession.useMultiAgent !== false);
                  if (onClearInterruptedSession) onClearInterruptedSession();
                }}
              >
                🔄 一键填入续接
              </Button>
            </Space>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            marginBottom: 16,
            background: 'rgba(31, 36, 48, 0.65)',
            border: '1px solid rgba(43, 108, 176, 0.4)',
            borderRadius: 8
          }}
        >
          <span style={{ fontWeight: 600, color: '#63b3ed', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <RobotOutlined />
            多 Agent 协同巡航模式
          </span>
          <Switch
            checked={useMultiAgent}
            onChange={setUseMultiAgent}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </div>

        <Form layout="vertical">
          <Form.Item label={<b>📍 起始连写章节</b>}>
            <Space>
              <InputNumber
                min={1}
                max={9999}
                value={startChapterNum}
                onChange={val => setStartChapterNum(val || 1)}
                style={{ width: 140 }}
                addonBefore="第"
                addonAfter="章"
              />
              <Tag color="blue">当前待写起点</Tag>
            </Space>
          </Form.Item>

          <Form.Item label={<b>🎯 目标连写章节数</b>}>
            <Space size="middle" direction="vertical" style={{ width: '100%' }}>
              <Radio.Group
                value={targetCount}
                onChange={e => setTargetCount(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value={1}>1 章</Radio.Button>
                <Radio.Button value={3}>3 章</Radio.Button>
                <Radio.Button value={5}>5 章</Radio.Button>
                <Radio.Button value={10}>10 章</Radio.Button>
              </Radio.Group>
              <Space>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>自定义：</span>
                <InputNumber
                  min={1}
                  max={50}
                  value={targetCount}
                  onChange={val => setTargetCount(val || 1)}
                  style={{ width: 110 }}
                  addonAfter="章"
                />
              </Space>
            </Space>
          </Form.Item>

          <Form.Item label={<b>📏 单章目标字数</b>} style={{ marginBottom: 16 }}>
            <Select
              value={selectedWordLimit}
              onChange={setSelectedWordLimit}
              style={{ width: '100%' }}
            >
              <Select.Option value={0}>不限字数</Select.Option>
              <Select.Option value={1500}>1500 字 (快节奏短篇)</Select.Option>
              <Select.Option value={2000}>2000 字 (标准爽文单章)</Select.Option>
              <Select.Option value={2500}>2500 字 (推荐标准)</Select.Option>
              <Select.Option value={3000}>3000 字 (深度剧情)</Select.Option>
              <Select.Option value={4000}>4000 字 (大长章推进)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label={<b>📝 本批次创作指导 / 阶段推进要求 (可选)</b>} style={{ marginBottom: 16 }}>
            <Input.TextArea
              rows={2}
              value={authorGuidance}
              onChange={e => setAuthorGuidance(e.target.value)}
              placeholder="例如：本批次侧重排查账目疑点与各部门推诿，重点留存线索，不急于结案；依规推进，严禁越权。"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <div
            style={{
              padding: '10px 14px',
              marginBottom: 20,
              background: 'rgba(24, 144, 255, 0.08)',
              borderLeft: '3px solid #1890ff',
              borderRadius: '0 6px 6px 0',
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.6
            }}
          >
            💡 <b>因果规划铁律</b>：连写章数仅代表本次生成的章节范围，系统将根据因果律自然推进，绝不在最后一章强行制造机械反转或提前结案。
          </div>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onCancel} size="middle">
            取消
          </Button>
          <Button
            type="primary"
            size="middle"
            icon={<RocketOutlined />}
            onClick={handleStart}
            style={{
              background: 'linear-gradient(135deg, #1890ff, #722ed1)',
              borderColor: '#722ed1',
              fontWeight: 600,
              padding: '0 24px'
            }}
          >
            {useMultiAgent ? `🚀 启动多 Agent 巡航 (${targetCount} 章)` : `🚀 启动连写 (${targetCount} 章)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
