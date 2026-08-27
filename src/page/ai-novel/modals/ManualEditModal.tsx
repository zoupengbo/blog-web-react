import React from 'react';
import { Modal, Input } from 'antd';
import { PaperTheme } from '../types';

const { TextArea } = Input;

interface ManualEditModalProps {
  open: boolean;
  onCancel: () => void;
  title: string;
  value: string;
  setValue: (val: string) => void;
  onSave: () => void;
  paperTheme?: PaperTheme;
}

export const ManualEditModal: React.FC<ManualEditModalProps> = ({
  open,
  onCancel,
  title,
  value,
  setValue,
  onSave,
  paperTheme = 'dark',
}) => {
  return (
    <Modal
      title={`📝 编辑 - ${title}`}
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      width={900}
      centered
      okText="保存内容"
      cancelText="取消"
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
      styles={{ body: { paddingTop: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>您可以在这个宽敞的弹窗内流畅地编辑、梳理和优化小说大纲与设定。编辑完毕后点击“保存内容”即可。</span>
        <TextArea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={16}
          style={{ fontSize: 14, lineHeight: 1.6, padding: 12 }}
          placeholder={`请输入${title}的完整内容...`}
        />
      </div>
    </Modal>
  );
};
