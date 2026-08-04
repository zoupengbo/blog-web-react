import React from 'react';
import { Modal, Form, InputNumber, Space, Button, Radio, Input } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface BatchChaptersModalProps {
  open: boolean;
  onCancel: () => void;
  batchChapterCount: number;
  setBatchChapterCount: (val: number) => void;
  batchGenerateMode: 'append' | 'overwrite';
  setBatchGenerateMode: (mode: 'append' | 'overwrite') => void;
  plotDirection: string;
  setPlotDirection: (val: string) => void;
  suggestingPlot: boolean;
  onFetchPlotSuggestion: () => void;
  isBatchGenerating: boolean;
  onBatchGenerateChapters: () => void;
}

export const BatchChaptersModal: React.FC<BatchChaptersModalProps> = ({
  open,
  onCancel,
  batchChapterCount,
  setBatchChapterCount,
  batchGenerateMode,
  setBatchGenerateMode,
  plotDirection,
  setPlotDirection,
  suggestingPlot,
  onFetchPlotSuggestion,
  isBatchGenerating,
  onBatchGenerateChapters,
}) => {
  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RocketOutlined style={{ color: '#d4b106' }} />
          智能剧情批量大纲规划案
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={540}
      className="batch-chapters-modal"
      centered
    >
      <Form layout="vertical" style={{ marginTop: 15 }}>
        <Form.Item
          label={<span>📋 目标规划拆分章节数</span>}
          tooltip="先选择或输入您本次想要生成的大纲章节数"
        >
          <Space size="middle">
            <InputNumber
              min={1}
              max={50}
              value={batchChapterCount}
              onChange={(val) => setBatchChapterCount(val || 1)}
              size="middle"
              style={{ width: 100 }}
            />
            <Space wrap>
              <Button size="middle" onClick={() => setBatchChapterCount(1)}>1 章 (推荐)</Button>
              <Button size="middle" onClick={() => setBatchChapterCount(2)}>2 章</Button>
              <Button size="middle" onClick={() => setBatchChapterCount(3)}>3 章</Button>
              <Button size="middle" onClick={() => setBatchChapterCount(5)}>5 章</Button>
              <Button size="middle" onClick={() => setBatchChapterCount(10)}>10 章</Button>
            </Space>
          </Space>
        </Form.Item>
        <Form.Item
          label={<span>🗺️ 规划大纲策略</span>}
          tooltip="【接着往后写】：在当前已有章节的最后，继续增加生成新的章节大纲；【重写未写大纲】：如果您修改了前面章节的剧情，此模式会保留已写完的章节，并根据最新剧情重新生成后面所有未写章节的大纲，避免割裂。"
        >
          <Radio.Group
            value={batchGenerateMode}
            onChange={e => setBatchGenerateMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="append">➕ 接着往后写 (不影响前面)</Radio.Button>
            <Radio.Button value="overwrite">🔄 重写未写大纲 (联动最新剧情修改)</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>💥 接下来的大段剧情演进说明</span>
              <Button
                size="small"
                type="link"
                icon={<RocketOutlined />}
                loading={suggestingPlot}
                onClick={onFetchPlotSuggestion}
                style={{ padding: 0 }}
              >
                🪄 召唤 AI 给点剧情建议
              </Button>
            </div>
          }
          tooltip="输入您脑海中想要在接下来演绎的长情节事件，或直接点击右侧按钮，AI 将根据分章数为您推荐剧情"
        >
          <TextArea
            value={plotDirection}
            onChange={e => setPlotDirection(e.target.value)}
            placeholder="例如：主角在急诊查房时偶遇突发心梗的芒果台毒舌导师岳父，林逸顶住压力施展中西医手法紧急施救。陈墨百般嘲笑并阻拦，但林逸三分钟内稳定住病情，导师看到后满面愧疚与感激，陈墨面如死灰。苏清雪在旁暗赞，为第四章导师的公开道歉和反转打脸埋下完美前奏..."
            rows={6}
          />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            loading={isBatchGenerating}
            onClick={onBatchGenerateChapters}
            style={{ background: 'linear-gradient(135deg, #d4b106 0%, #b29100 100%)', border: 'none', color: '#fff', fontWeight: 700 }}
          >
            {batchGenerateMode === 'overwrite' ? '一键智能拆章并更新大纲' : '一键智能拆章并往后新增'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
