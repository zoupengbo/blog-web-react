import React from 'react';
import { Modal, Select, Input } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import { NovelOutline, ChapterOutline, PaperTheme } from '../types';

interface InsertChapterModalProps {
  open: boolean;
  onCancel: () => void;
  onRunInsertChapter: () => void;
  isInsertingChapter: boolean;
  insertAfterChapterNum: number;
  setInsertAfterChapterNum: (num: number) => void;
  insertUserInstruction: string;
  setInsertUserInstruction: (val: string) => void;
  selectedOutline: NovelOutline | null;
  paperTheme?: PaperTheme;
}

export const InsertChapterModal: React.FC<InsertChapterModalProps> = ({
  open,
  onCancel,
  onRunInsertChapter,
  isInsertingChapter,
  insertAfterChapterNum,
  setInsertAfterChapterNum,
  insertUserInstruction,
  setInsertUserInstruction,
  selectedOutline,
  paperTheme = 'dark',
}) => {
  const getChaptersList = (): ChapterOutline[] => {
    if (!selectedOutline?.chaptersOutline) return [];
    try {
      const rawChs = selectedOutline.chaptersOutline as any;
      return typeof rawChs === 'string' ? JSON.parse(rawChs) : (Array.isArray(rawChs) ? rawChs : []);
    } catch (e) {
      return [];
    }
  };

  const chs = getChaptersList();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusCircleOutlined style={{ color: '#ffd666', fontSize: 18 }} />
          <span>智能插入章节 (符合前后文上下文)</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onRunInsertChapter}
      confirmLoading={isInsertingChapter}
      okText={isInsertingChapter ? "AI 连贯构思中..." : `确认插入 (作为第 ${insertAfterChapterNum + 1} 章)`}
      cancelText="取消"
      width={560}
      destroyOnClose
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        <div className="modal-tip-banner" style={{ padding: '10px 14px', borderRadius: 6 }}>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            💡 <b>智能承上启下</b>：选择要插入的位置后，AI 将读取<b>【前一章】</b>（包括真实正文末尾片段）与<b>【后一章】</b>的大纲上下文，自动构思逻辑连贯的过渡章节标题与细纲，并自动将后续章节序号及大纲整体顺延 +1！
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#ffd666' }}>1. 选择插入位置：</div>
          <Select
            style={{ width: '100%' }}
            value={insertAfterChapterNum}
            onChange={(val) => setInsertAfterChapterNum(val)}
          >
            <Select.Option value={0}>
              🎯 在【最前面】插入（作为全新第 1 章，原第 1 章顺延为第 2 章）
            </Select.Option>
            {chs.map(chap => (
              <Select.Option key={chap.chapterNumber} value={chap.chapterNumber}>
                在 第 {chap.chapterNumber} 章 《{chap.title}》 【之后插入】（作为新第 {chap.chapterNumber + 1} 章）
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#ffd666' }}>
            2. 作者的方向提示/过场指示（可选）：
          </div>
          <Input.TextArea
            rows={3}
            placeholder="可选输入，例如：安排张虎在此章主动挑衅主角，主角暂且忍让为后续打脸做铺垫..."
            value={insertUserInstruction}
            onChange={(e) => setInsertUserInstruction(e.target.value)}
            style={{ fontSize: 13, borderRadius: 6 }}
          />
        </div>
      </div>
    </Modal>
  );
};
