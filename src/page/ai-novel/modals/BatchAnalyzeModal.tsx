import React from 'react';
import { Modal, Checkbox, Space, Button, Tag } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { NovelOutline, ChapterOutline, PaperTheme } from '../types';

interface BatchAnalyzeModalProps {
  open: boolean;
  onCancel: () => void;
  onRunBatchAnalyze: () => void;
  isBatchAnalyzing: boolean;
  batchAnalyzeSelectedChapters: number[];
  setBatchAnalyzeSelectedChapters: React.Dispatch<React.SetStateAction<number[]>>;
  batchAnalyzeTypes: string[];
  setBatchAnalyzeTypes: (types: string[]) => void;
  selectedOutline: NovelOutline | null;
  paperTheme?: PaperTheme;
}

export const BatchAnalyzeModal: React.FC<BatchAnalyzeModalProps> = ({
  open,
  onCancel,
  onRunBatchAnalyze,
  isBatchAnalyzing,
  batchAnalyzeSelectedChapters,
  setBatchAnalyzeSelectedChapters,
  batchAnalyzeTypes,
  setBatchAnalyzeTypes,
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
          <CheckCircleFilled style={{ color: '#ffd666', fontSize: 18 }} />
          <span>批量勾选章节 AI 深度分析</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={onRunBatchAnalyze}
      confirmLoading={isBatchAnalyzing}
      okText={isBatchAnalyzing ? "正在深度分析中..." : `开始分析 (${batchAnalyzeSelectedChapters.length} 章)`}
      cancelText="取消"
      width={640}
      destroyOnClose
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        <div className="modal-tip-banner" style={{ padding: '10px 14px', borderRadius: 6 }}>
          <div style={{ fontSize: 12 }}>
            💡 <b>功能说明</b>：勾选你需要分析的章节，AI 将按顺序读取这些章节的正文内容，自动识别并提取主角修为突破、系统金手指解锁以及人物关系演进，并自动存库更新！
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#ffd666' }}>1. 选择分析维度：</div>
          <Checkbox.Group
            value={batchAnalyzeTypes}
            onChange={(checkedValues) => setBatchAnalyzeTypes(checkedValues as string[])}
          >
            <Space size="large">
              <Checkbox value="sys">⚡ 战力境界与系统金手指</Checkbox>
              <Checkbox value="rel">⛓️ 人物关系网演进</Checkbox>
            </Space>
          </Checkbox.Group>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#ffd666' }}>
              2. 勾选要分析的章节 ({batchAnalyzeSelectedChapters.length} / {chs.length} 章)：
            </div>
            <Space size="small">
              <Button
                size="small"
                onClick={() => setBatchAnalyzeSelectedChapters(chs.map(c => c.chapterNumber))}
              >
                全选
              </Button>
              <Button
                size="small"
                type="primary"
                ghost
                onClick={() => setBatchAnalyzeSelectedChapters(chs.filter(c => c.status === 'completed').map(c => c.chapterNumber))}
              >
                仅已写章节
              </Button>
              <Button
                size="small"
                onClick={() => setBatchAnalyzeSelectedChapters([])}
              >
                清空
              </Button>
            </Space>
          </div>

          <div className="modal-preview-box" style={{
            maxHeight: 260,
            overflowY: 'auto',
            padding: 12,
            borderRadius: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px 12px'
          }}>
            {chs.length === 0 ? (
              <div style={{ color: '#71717a', gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>暂无章节数据</div>
            ) : (
              chs.map(chap => {
                const isChecked = batchAnalyzeSelectedChapters.includes(chap.chapterNumber);
                const isCompleted = chap.status === 'completed';
                return (
                  <div
                    key={chap.chapterNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (isChecked) {
                        setBatchAnalyzeSelectedChapters(prev => prev.filter(n => n !== chap.chapterNumber));
                      } else {
                        setBatchAnalyzeSelectedChapters(prev => [...prev, chap.chapterNumber]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setBatchAnalyzeSelectedChapters(prev => [...prev, chap.chapterNumber]);
                        } else {
                          setBatchAnalyzeSelectedChapters(prev => prev.filter(n => n !== chap.chapterNumber));
                        }
                      }}
                    />
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {chap.title || `第 ${chap.chapterNumber} 章`}
                    </span>
                    {isCompleted ? (
                      <Tag color="success" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>已写完</Tag>
                    ) : (
                      <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>待写</Tag>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
