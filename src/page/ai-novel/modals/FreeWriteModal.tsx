import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal, Button, Input, Select, Space, Tag, Spin, Alert,
  Progress, Divider, Tooltip, InputNumber, Steps, Card, Checkbox
} from 'antd';
import {
  EditOutlined, ScissorOutlined, CheckCircleFilled,
  WarningOutlined, LoadingOutlined, InfoCircleOutlined,
  RocketOutlined, EyeOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

interface FreeWriteSegment {
  segmentIndex: number;
  suggestedTitle: string;
  segmentLength: number;
}

interface OutlinePreviewItem {
  chapterNumber: number;
  title: string;
  outline: string;
  segmentText: string;
  status: string;
}

interface FreeWriteModalProps {
  open: boolean;
  onCancel: () => void;
  novelId: number | null;
  lastChapterNum: number; // 当前已有的最大章节号
  onChaptersGenerated: () => void; // 生成完毕后刷新章节列表
}

type WorkflowStep = 'write' | 'preview' | 'generating';

export const FreeWriteModal: React.FC<FreeWriteModalProps> = ({
  open,
  onCancel,
  novelId,
  lastChapterNum,
  onChaptersGenerated,
}) => {
  // Step state
  const [step, setStep] = useState<WorkflowStep>('write');

  // Write step state
  const [freeText, setFreeText] = useState('');
  const [aiStoryInstruction, setAiStoryInstruction] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [targetWords, setTargetWords] = useState<number>(2500);
  const [startChapterNum, setStartChapterNum] = useState<number>(lastChapterNum + 1);
  const [enableAuditor, setEnableAuditor] = useState<boolean>(false);

  // Preview step state
  const [outlinePreviews, setOutlinePreviews] = useState<OutlinePreviewItem[]>([]);
  const [loadingOutline, setLoadingOutline] = useState(false);

  // Generate step state (SSE)
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [segments, setSegments] = useState<FreeWriteSegment[]>([]);
  const [chapterProgress, setChapterProgress] = useState<Record<number, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [generatingDone, setGeneratingDone] = useState(false);
  const [failedChapters, setFailedChapters] = useState<any[]>([]);

  const eventSourceRef = useRef<any>(null);
  const statusEndRef = useRef<HTMLDivElement>(null);

  // Sync startChapterNum when lastChapterNum changes
  useEffect(() => {
    if (open) {
      setStartChapterNum(lastChapterNum + 1);
    }
  }, [open, lastChapterNum]);

  // Auto-scroll status area
  useEffect(() => {
    if (statusEndRef.current) {
      statusEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [statusMessages]);

  // Estimated chapter count
  const estimatedChapters = useMemo(() => {
    if (!freeText.trim()) return 0;
    return Math.max(1, Math.ceil(freeText.trim().length / targetWords));
  }, [freeText, targetWords]);

  const wordCount = freeText.length;

  // ───────── Reset ─────────
  const handleReset = () => {
    setStep('write');
    setFreeText('');
    setOutlinePreviews([]);
    setStatusMessages([]);
    setSegments([]);
    setChapterProgress({});
    setGeneratingDone(false);
    setFailedChapters([]);
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (e) {}
      eventSourceRef.current = null;
    }
  };

  const handleClose = () => {
    handleReset();
    onCancel();
  };

  // ───────── Step 0: 一句话让 AI 自动生成剧情长稿白稿 ─────────
  const handleGenerateAiDraft = () => {
    if (!aiStoryInstruction.trim() || !novelId) return;

    setIsGeneratingDraft(true);
    setFreeText(''); // 清空旧白稿

    const baseUrl = (window as any).__API_BASE__ || '';
    fetch(`${baseUrl}/api/ai-novel/free-write-generate-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || ''
      },
      body: JSON.stringify({
        novelId,
        userPrompt: aiStoryInstruction.trim()
      })
    }).then(response => {
      if (!response.body) throw new Error('服务器响应异常');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'chunk';

      const processChunk = ({ done, value }: { done: boolean; value?: Uint8Array }) => {
        if (done) {
          setIsGeneratingDraft(false);
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
          } else if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (currentEvent === 'chunk' && data.text) {
                // 过滤完结与元标签
                const cleanText = data.text.replace(/\[完结\]|【完结】|\[完\]|【完】|\[End\]|【End】|\[全剧终\]|【全剧终】/gi, '');
                if (cleanText) setFreeText(prev => prev + cleanText);
              } else if (currentEvent === 'done') {
                if (data.fullText) {
                  const cleanFull = data.fullText.replace(/\[完结\]|【完结】|\[完\]|【完】|\[End\]|【End】|\[全剧终\]|【全剧终】/gi, '').trim();
                  setFreeText(cleanFull);
                }
                setIsGeneratingDraft(false);
              } else if (currentEvent === 'error') {
                import('antd').then(({ message }) => message.error('AI 生成长稿失败：' + data.message));
                setIsGeneratingDraft(false);
              }
            } catch (e) {}
          }
        }

        reader.read().then(processChunk).catch(() => {
          setIsGeneratingDraft(false);
        });
      };

      reader.read().then(processChunk).catch(() => {
        setIsGeneratingDraft(false);
      });
    }).catch((err: any) => {
      import('antd').then(({ message }) => message.error('请求失败：' + err.message));
      setIsGeneratingDraft(false);
    });
  };

  // ───────── Step 1: 先获取细纲预览（先拆细纲再确认） ─────────
  const handleSplitOutline = async () => {
    if (!freeText.trim() || !novelId) return;
    setLoadingOutline(true);

    try {
      const { default: httpService } = await import('../../../common/request');
      const res: any = await httpService.post('/ai-novel/free-write-split-outline', {
        novelId,
        freeText: freeText.trim(),
        targetWords,
        startChapterNum
      });

      if (res && res.code === 200 && res.data) {
        setOutlinePreviews(res.data.outlines || []);
        setStep('preview');
      } else {
        throw new Error(res?.msg || '获取细纲失败');
      }
    } catch (err: any) {
      import('antd').then(({ message }) => message.error('拆分细纲失败：' + (err.message || '未知错误')));
    } finally {
      setLoadingOutline(false);
    }
  };

  // ───────── 直接生成 / 或 从预览确认后生成（SSE） ─────────
  const startGenerate = () => {
    if (!freeText.trim() || !novelId) return;

    setStep('generating');
    setStatusMessages(['🚀 连接服务器，准备开始生成...']);
    setSegments([]);
    setChapterProgress({});
    setGeneratingDone(false);
    setFailedChapters([]);

    // 用 fetch SSE（因为 EventSource 不支持 POST）
    const baseUrl = (window as any).__API_BASE__ || '';
    fetch(`${baseUrl}/api/ai-novel/free-write-split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || ''
      },
      body: JSON.stringify({
        novelId,
        freeText: freeText.trim(),
        targetWords,
        startChapterNum,
        enableAuditor
      })
    }).then(response => {
      if (!response.body) throw new Error('服务器响应异常');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'status';

      const processChunk = ({ done, value }: { done: boolean; value?: Uint8Array }) => {
        if (done) {
          setGeneratingDone(true);
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
          } else if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              handleSseEvent(currentEvent, data);
              if (currentEvent === 'all_done') {
                setGeneratingDone(true);
                return;
              }
            } catch (e) {}
          }
        }

        reader.read().then(processChunk).catch((err: any) => {
          setStatusMessages(prev => [...prev, `⚠️ 连接中断: ${err.message}`]);
          setGeneratingDone(true);
        });
      };

      reader.read().then(processChunk).catch((err: any) => {
        setStatusMessages(prev => [...prev, `⚠️ 读取流失败: ${err.message}`]);
        setGeneratingDone(true);
      });
    }).catch((err: any) => {
      setStatusMessages(prev => [...prev, `❌ 请求失败: ${err.message}`]);
      setGeneratingDone(true);
    });
  };


  const handleSseEvent = (event: string, data: any) => {
    switch (event) {
      case 'status':
        setStatusMessages(prev => [...prev, data.message || '']);
        break;
      case 'plan_ready':
        setSegments(data.segments || []);
        const initProgress: Record<number, 'pending'> = {};
        (data.segments || []).forEach((_: any, idx: number) => {
          initProgress[data.startChapterNum + idx] = 'pending';
        });
        setChapterProgress(initProgress);
        break;
      case 'chapter_start':
        setChapterProgress(prev => ({ ...prev, [data.chapterNumber]: 'generating' }));
        setStatusMessages(prev => [...prev, `✍️ 正在撰写第 ${data.chapterNumber} 章《${data.title}》（${data.chapterNumber}/${data.total}）...`]);
        break;
      case 'chapter_done':
        setChapterProgress(prev => ({ ...prev, [data.chapterNumber]: 'done' }));
        setStatusMessages(prev => [...prev, `✅ 第 ${data.chapterNumber} 章《${data.title}》完成（${data.wordCount} 字）`]);
        break;
      case 'chapter_error':
        setChapterProgress(prev => ({ ...prev, [data.chapterNumber]: 'error' }));
        setStatusMessages(prev => [...prev, `❌ 第 ${data.chapterNumber} 章生成失败：${data.error}`]);
        break;
      case 'all_done':
        setFailedChapters(data.failedChapters || []);
        setStatusMessages(prev => [...prev, `🎉 全部完成！成功生成 ${data.successChapters} 章${data.failedChapters?.length ? `，${data.failedChapters.length} 章失败` : ''}`]);
        setGeneratingDone(true);
        onChaptersGenerated();
        break;
      case 'error':
        setStatusMessages(prev => [...prev, `❌ 错误：${data.message}`]);
        setGeneratingDone(true);
        break;
    }
  };

  // ───────── Render ─────────

  const doneCount = Object.values(chapterProgress).filter(s => s === 'done').length;
  const totalCount = Object.keys(chapterProgress).length;

  const renderWriteStep = () => (
    <div>
      <Card
        size="small"
        style={{ background: '#fcf8ff', border: '1px solid #e9d5ff', borderRadius: 8, marginBottom: 14 }}
      >
        <div style={{ fontWeight: 700, color: '#6b21a8', fontSize: 13, marginBottom: 8 }}>
          🪄 选项 A：一句话让 AI 自动写完本段剧情长稿（推荐）
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={aiStoryInstruction}
            onChange={e => setAiStoryInstruction(e.target.value)}
            placeholder="例如：介绍下作者是怎么穿越的，并在异界首次触发金手指完成反转打脸"
            disabled={isGeneratingDraft}
            onPressEnter={handleGenerateAiDraft}
            style={{ borderRadius: '6px 0 0 6px' }}
          />
          <Button
            type="primary"
            loading={isGeneratingDraft}
            onClick={handleGenerateAiDraft}
            disabled={!aiStoryInstruction.trim()}
            style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', fontWeight: 600 }}
          >
            🤖 召唤 AI 自动写剧情长稿
          </Button>
        </Space.Compact>
      </Card>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
        <span>✍️ 选项 B：自由编辑 / 审核修改剧情长稿（下面可实时编辑，写完后一键拆分成章）：</span>
        {isGeneratingDraft && <span style={{ color: '#7c3aed' }}><LoadingOutlined spin /> AI 正在流式生成长稿...</span>}
      </div>

      <TextArea
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder={`在此自由书写或贴入您的剧情白稿/草稿...

支持以下两种方式：
  1. 上方输入一句话，点击【🤖 召唤 AI 自动写剧情长稿】，看 AI 实时写完整段剧情；
  2. 自己在此手动书写或粘贴任意长度的故事白稿。

（内容不限长度，写完后点击下方【一键拆分生成正文】或【先看细纲】即可自动切割拆分成章！）`}
        autoSize={{ minRows: 12, maxRows: 22 }}
        style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 12, fontFamily: 'monospace' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#888', fontSize: 13 }}>
          已输入 <strong>{wordCount}</strong> 字 · 预计拆分为{' '}
          <strong style={{ color: estimatedChapters > 0 ? '#d97706' : '#aaa' }}>
            {estimatedChapters > 0 ? `约 ${estimatedChapters} 章` : '—'}
          </strong>
        </span>
        <Space>
          <span style={{ fontSize: 13, color: '#666' }}>每章目标字数：</span>
          <Select
            value={targetWords}
            onChange={setTargetWords}
            style={{ width: 120 }}
            options={[
              { label: '1500 字', value: 1500 },
              { label: '2000 字', value: 2000 },
              { label: '2500 字（默认）', value: 2500 },
              { label: '3000 字', value: 3000 },
            ]}
          />
          <span style={{ fontSize: 13, color: '#666' }}>追加到第</span>
          <InputNumber
            value={startChapterNum}
            onChange={val => setStartChapterNum(val || 1)}
            min={1}
            max={999}
            style={{ width: 70 }}
          />
          <span style={{ fontSize: 13, color: '#666' }}>章</span>
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Checkbox
          checked={enableAuditor}
          onChange={e => setEnableAuditor(e.target.checked)}
          style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}
        >
          🛡️ 开启 AI 逻辑审核官（自修连续因果漏洞与字数强校验）
        </Checkbox>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Tooltip title="AI 先按剧情断点规划细纲，由您确认后再拆分成章">
          <Button
            icon={<EyeOutlined />}
            onClick={handleSplitOutline}
            loading={loadingOutline}
            disabled={!freeText.trim()}
            style={{ fontWeight: 600 }}
          >
            先看细纲规划
          </Button>
        </Tooltip>
        <Tooltip title="将白稿按黄金留钩点直接切割拆分为章节正文（保留原汁原味，零注水）">
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={startGenerate}
            disabled={!freeText.trim()}
            style={{ fontWeight: 600, backgroundColor: '#0e7490', borderColor: '#0e7490' }}
          >
            🚀 智能拆章（白稿直出正文）
          </Button>
        </Tooltip>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      <Alert
        type="success"
        showIcon
        message={`AI 已规划出 ${outlinePreviews.length} 个章节，请确认章节细纲后再生成正文`}
        style={{ marginBottom: 16 }}
      />

      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {outlinePreviews.map((item, idx) => (
          <Card
            key={item.chapterNumber}
            size="small"
            style={{ borderRadius: 8, border: '1px solid #e8d5a3', background: '#fffdf5' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color="orange" style={{ fontWeight: 700, fontSize: 12 }}>第 {item.chapterNumber} 章</Tag>
                <Input
                  value={item.title}
                  onChange={e => {
                    const updated = [...outlinePreviews];
                    updated[idx] = { ...updated[idx], title: e.target.value };
                    setOutlinePreviews(updated);
                  }}
                  style={{ fontWeight: 600, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
                />
              </div>
            }
          >
            <TextArea
              value={item.outline}
              onChange={e => {
                const updated = [...outlinePreviews];
                updated[idx] = { ...updated[idx], outline: e.target.value };
                setOutlinePreviews(updated);
              }}
              autoSize={{ minRows: 2, maxRows: 5 }}
              style={{ fontSize: 12, color: '#555', border: 'none', background: 'transparent', resize: 'none', padding: 0 }}
            />
          </Card>
        ))}
      </div>

      <Divider style={{ margin: '14px 0' }} />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <Button onClick={() => setStep('write')}>← 返回修改白稿</Button>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={startGenerate}
          style={{ fontWeight: 600, backgroundColor: '#b45309', borderColor: '#b45309' }}
        >
          ✅ 确认细纲，开始生成正文
        </Button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div>
      {/* 进度条 */}
      {totalCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#666' }}>
            <span>章节生成进度</span>
            <span>{doneCount} / {totalCount} 章</span>
          </div>
          <Progress
            percent={totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0}
            status={generatingDone && failedChapters.length > 0 ? 'exception' : (generatingDone ? 'success' : 'active')}
            strokeColor={generatingDone && failedChapters.length === 0 ? '#52c41a' : '#d97706'}
          />
          {/* 章节状态小格 */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {Object.entries(chapterProgress).map(([num, status]) => (
              <Tooltip key={num} title={`第 ${num} 章`}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: status === 'done' ? '#52c41a' : status === 'generating' ? '#d97706' : status === 'error' ? '#ff4d4f' : '#e0e0e0',
                  color: status === 'pending' ? '#999' : '#fff',
                  fontWeight: 700
                }}>
                  {status === 'done' ? '✓' : status === 'error' ? '✕' : status === 'generating' ? '⋯' : num}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* 状态日志 */}
      <div style={{
        background: '#1a1a2e', color: '#e0e0e0', borderRadius: 8,
        padding: '10px 14px', maxHeight: 280, overflowY: 'auto',
        fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7
      }}>
        {statusMessages.map((msg, idx) => (
          <div key={idx} style={{
            color: msg.startsWith('✅') ? '#52c41a'
              : msg.startsWith('❌') ? '#ff6b6b'
              : msg.startsWith('⚠️') ? '#ffa940'
              : msg.startsWith('🎉') ? '#95de64'
              : '#e0e0e0'
          }}>{msg}</div>
        ))}
        {!generatingDone && (
          <div style={{ color: '#888' }}><LoadingOutlined spin /> 运行中...</div>
        )}
        <div ref={statusEndRef} />
      </div>

      {/* 完成后的操作按钮 */}
      {generatingDone && (
        <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {failedChapters.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${failedChapters.length} 章生成失败，可手动重试`}
              style={{ flex: 1, marginRight: 8 }}
            />
          )}
          <Button onClick={handleClose}>关闭</Button>
          <Button type="primary" icon={<CheckCircleFilled />} onClick={handleClose}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
            完成，去查看章节
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditOutlined style={{ color: '#d97706', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>📝 自由创作 → 智能拆章</span>
          {step === 'preview' && (
            <Tag color="blue" style={{ fontWeight: 600, fontSize: 12 }}>预览细纲</Tag>
          )}
          {step === 'generating' && (
            <Tag color="orange" style={{ fontWeight: 600, fontSize: 12 }}>
              {generatingDone ? '已完成' : '生成中'}
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={step === 'generating' && !generatingDone ? undefined : handleClose}
      closable={step !== 'generating' || generatingDone}
      maskClosable={step !== 'generating' || generatingDone}
      footer={null}
      width={740}
      centered
      destroyOnClose
      styles={{ body: { padding: '16px 24px 20px' } }}
    >
      {/* 步骤指示器 */}
      {step !== 'generating' && (
        <Steps
          current={step === 'write' ? 0 : step === 'preview' ? 1 : 2}
          size="small"
          style={{ marginBottom: 18 }}
          items={[
            { title: '自由书写', icon: <EditOutlined /> },
            { title: '确认细纲（可选）', icon: <EyeOutlined /> },
            { title: '生成正文', icon: <RocketOutlined /> }
          ]}
        />
      )}

      {step === 'write' && renderWriteStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'generating' && renderGeneratingStep()}
    </Modal>
  );
};
