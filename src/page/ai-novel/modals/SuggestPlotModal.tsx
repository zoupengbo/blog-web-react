import React from 'react';
import { Modal, Tag, Button, Input } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

interface SuggestPlotModalProps {
  open: boolean;
  onCancel: () => void;
  suggestedPlotData: {
    suggestion: string;
    auditMessage: string;
    hasCorrected?: boolean;
  };
  suggestingPlot: boolean;
  refineInstruction: string;
  setRefineInstruction: (val: string) => void;
  onFetchPlotSuggestion: (instruction?: string) => void;
  onAdoptSuggestion: (suggestion: string) => void;
}

export const SuggestPlotModal: React.FC<SuggestPlotModalProps> = ({
  open,
  onCancel,
  suggestedPlotData,
  suggestingPlot,
  refineInstruction,
  setRefineInstruction,
  onFetchPlotSuggestion,
  onAdoptSuggestion,
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1f1f1f' }}>🪄 AI 剧情建议与逻辑审核报告</span>
          {suggestedPlotData.hasCorrected ? (
            <Tag color="orange" style={{ fontSize: 12, padding: '2px 8px' }}>🔧 已自动纠偏并完成审核</Tag>
          ) : (
            <Tag color="green" style={{ fontSize: 12, padding: '2px 8px' }}>✅ 已通过 AI 深度逻辑审核</Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button
          key="regenerate"
          loading={suggestingPlot}
          onClick={() => onFetchPlotSuggestion(refineInstruction)}
          style={{ fontWeight: 600 }}
        >
          🔄 结合最高指导重构一版
        </Button>,
        <Button
          key="adopt"
          type="primary"
          style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 600 }}
          onClick={() => onAdoptSuggestion(suggestedPlotData.suggestion)}
        >
          ✅ 采纳并填入剧情说明框
        </Button>
      ]}
      width={680}
      centered
      zIndex={1100}
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{
          background: '#fffbe6',
          border: '1px solid #ffe58f',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#d46b08', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
            <span>⚡ 作者最高指导意见（最高优先级，AI 重构时将 100% 严格遵循您的指示）：</span>
          </div>
          <Input.TextArea
            rows={2}
            placeholder="请输入您希望 AI 重新构思或微调的明确要求（例如：增加主角与反派在死者仓库里的正面智斗线索；或者：揭晓死者身上藏着的秘密档案...）"
            value={refineInstruction}
            onChange={e => setRefineInstruction(e.target.value)}
            style={{ borderRadius: 6, background: '#fff' }}
          />
        </div>

        <div style={{
          background: suggestedPlotData.hasCorrected ? '#fffbe6' : '#f6ffed',
          border: `1px solid ${suggestedPlotData.hasCorrected ? '#ffe58f' : '#b7eb8f'}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 600, color: suggestedPlotData.hasCorrected ? '#d46b08' : '#389e0d', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔍 逻辑审核官校验报告：</span>
          </div>
          <div style={{ color: suggestedPlotData.hasCorrected ? '#873800' : '#274916', fontSize: 13, lineHeight: 1.6 }}>
            {suggestedPlotData.auditMessage || '已完成多轮因果链与前文一致性对比审核，剔除了前文未铺垫的硬凹断言，剧情承接自然合规。'}
          </div>
        </div>

        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#1f1f1f' }}>
          📝 AI 经过逻辑修补与审核后的剧情推进建议：
        </div>
        <div style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
          fontSize: 14,
          lineHeight: 1.8,
          color: '#262626',
          whiteSpace: 'pre-wrap',
          maxHeight: 320,
          overflowY: 'auto'
        }}>
          {suggestedPlotData.suggestion}
        </div>
      </div>
    </Modal>
  );
};
