import React from 'react';
import { Modal, Card, Checkbox, Space, Button, Tag } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { NovelOutline, ChapterOutline } from '../types';

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
          <CheckCircleFilled style={{ color: '#1890ff', fontSize: 18 }} />
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
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#389e0d' }}>
            💡 <b>功能说明</b>：勾选你需要分析的章节，AI 将按顺序读取这些章节的正文内容，自动识别并提取主角修为突破、系统金手指解锁以及人物关系演进，并自动存库更新！
          </div>
        </Card>

        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>1. 选择分析维度：</div>
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
            <div style={{ fontWeight: 600, fontSize: 13 }}>
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

          <div style={{
            maxHeight: 260,
            overflowY: 'auto',
            border: '1px solid #f0f0f0',
            padding: 12,
            borderRadius: 6,
            background: '#fafafa',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px 12px'
          }}>
            {chs.length === 0 ? (
              <div style={{ color: '#ccc', gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>暂无章节数据</div>
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
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: isChecked ? '#e6f7ff' : '#fff',
                      border: isChecked ? '1px solid #91d5ff' : '1px solid #e8e8e8',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (isChecked) {
                        setBatchAnalyzeSelectedChapters(batchAnalyzeSelectedChapters.filter(n => n !== chap.chapterNumber));
                      } else {
                        setBatchAnalyzeSelectedChapters([...batchAnalyzeSelectedChapters, chap.chapterNumber]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setBatchAnalyzeSelectedChapters([...batchAnalyzeSelectedChapters, chap.chapterNumber]);
                        } else {
                          setBatchAnalyzeSelectedChapters(batchAnalyzeSelectedChapters.filter(n => n !== chap.chapterNumber));
                        }
                      }}
                    />
                    <span style={{ fontSize: 12, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isChecked ? 600 : 400 }}>
                      第 {chap.chapterNumber} 章 {chap.title}
                    </span>
                    <Tag color={isCompleted ? "success" : "default"} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                      {isCompleted ? "正文" : "大纲"}
                    </Tag>
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
