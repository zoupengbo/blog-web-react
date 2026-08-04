import React from 'react';
import { Modal, Button, Input } from 'antd';
import { NovelOutline, Novel } from '../types';

const { TextArea } = Input;

interface AiModifyModalProps {
  open: boolean;
  onCancel: () => void;
  modifyField: 'worldSetting' | 'mainLine' | 'characterSetting';
  modifyReqs: string;
  setModifyReqs: (val: string) => void;
  modifyResult: string;
  setModifyResult: (val: string) => void;
  modifyLoading: boolean;
  onAiModifySetting: () => void;
  onApplyModifySetting: () => void;
  view: 'list' | 'idea' | 'outline' | 'editor';
  draftOutline: NovelOutline | null;
  selectedOutline: NovelOutline | null;
}

export const AiModifyModal: React.FC<AiModifyModalProps> = ({
  open,
  onCancel,
  modifyField,
  modifyReqs,
  setModifyReqs,
  modifyResult,
  setModifyResult,
  modifyLoading,
  onAiModifySetting,
  onApplyModifySetting,
  view,
  draftOutline,
  selectedOutline,
}) => {
  return (
    <Modal
      title={
        <span>
          🪄 AI 智能修改【
          {modifyField === 'worldSetting' ? '世界观设定' : modifyField === 'mainLine' ? '命运主线大纲' : '人物卡设定'}
          】
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        modifyResult && (
          <Button
            key="apply"
            type="primary"
            onClick={onApplyModifySetting}
            style={{ background: '#d4b106', borderColor: '#d4b106', color: '#fff' }}
          >
            采用修改
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          loading={modifyLoading}
          onClick={onAiModifySetting}
          style={modifyResult ? { background: '#f5f5f5', color: '#666', borderColor: '#d9d9d9' } : { background: '#d4b106', borderColor: '#d4b106', color: '#fff' }}
        >
          {modifyResult ? '重新修改' : '开始 AI 修改'}
        </Button>
      ]}
      width={800}
      className="ai-modify-modal"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>原设定内容预览：</span>
          <div style={{ maxHeight: 150, overflowY: 'auto', background: '#fafafa', padding: 12, borderRadius: 6, fontSize: 13, border: '1px solid #f0f0f0', whiteSpace: 'pre-wrap' }}>
            {view === 'outline'
              ? (draftOutline ? draftOutline[modifyField] : '（当前为空）')
              : (selectedOutline ? selectedOutline[modifyField] : '（当前为空）')}
          </div>
        </div>

        <div>
          <span style={{ fontWeight: 600, display: 'block', marginBottom: 6, color: '#d4b106' }}>请输入您的修改与优化期望：</span>
          <TextArea
            placeholder="例如：'请在背景设定中增加一些赛博朋克与机械飞升的力量体系'，或者'请让第三卷的主线大纲发生反转，主角被背叛后开始反击'..."
            rows={4}
            value={modifyReqs}
            onChange={e => setModifyReqs(e.target.value)}
          />
        </div>

        {modifyResult && (
          <div>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: 6, color: '#52c41a' }}>AI 智能优化后的设定预览：</span>
            <TextArea
              value={modifyResult}
              onChange={e => setModifyResult(e.target.value)}
              rows={10}
              style={{ background: '#f6ffed', border: '1px solid #b7eb8f', fontSize: 13 }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
