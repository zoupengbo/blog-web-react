import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal, Button, Input, Select, Space, Tag, Spin, Alert,
  Progress, Divider, Tooltip, InputNumber, Steps, Card
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
  const [targetWords, setTargetWords] = useState<number>(2500);
  const [startChapterNum, setStartChapterNum] = useState<number>(lastChapterNum + 1);

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
    const expandRatio = 4;
    return Math.max(1, Math.min(Math.ceil(freeText.trim().length * expandRatio / targetWords), 30));
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
    fetch(`${baseUrl}/api/v1/ai-novel/free-write-split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novelId,
        freeText: freeText.trim(),
        targetWords,
        startChapterNum,
        enableAuditor: false
      })
    }).then(response => {
      if (!response.body) throw new Error('服务器响应异常');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processChunk = ({ done, value }: { done: boolean; value?: Uint8Array }) => {
        if (done) {
          setGeneratingDone(true);
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7);
          } else if (trimmed.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              handleSseEvent(currentEvent, data);
              if (currentEvent === 'all_done') {
                setGeneratingDone(true);
                return;
              }
            } catch (e) {}
            currentEvent = '';
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
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="自由创作模式"
        description="在下方自由书写剧情内容，不用考虑分章节，只需把故事讲完。写完后，AI 会自动分析并拆分成连贯的章节正文。"
        style={{ marginBottom: 16 }}
      />

      <TextArea
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder={`在此自由书写您的剧情构思...

例如：
  李峥接到通知，正式转正为正式民警。仪式简短，但苏晴随后递来借调函，推荐他去刑侦支队技术中队。赵铁柱拍了拍他的肩，说了句"少说话，多做事"，然后走了。
  
  周末，赵铁柱突然约李峥在街边小馆吃饭，两人吃到一半，赵铁柱放下筷子，认真说：局里有人觉得你查案太快，让你低调点，不然会有麻烦...

（不限长度，写到自然结束即可）`}
        autoSize={{ minRows: 14 }}
        style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 12 }}
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

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Tooltip title="AI 先拆出细纲，由您确认后再生成正文">
          <Button
            icon={<EyeOutlined />}
            onClick={handleSplitOutline}
            loading={loadingOutline}
            disabled={!freeText.trim()}
            style={{ fontWeight: 600 }}
          >
            先看细纲再生成
          </Button>
        </Tooltip>
        <Tooltip title="直接拆分并生成章节正文，一步完成">
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={startGenerate}
            disabled={!freeText.trim()}
            style={{ fontWeight: 600, backgroundColor: '#b45309', borderColor: '#b45309' }}
          >
            🚀 一键拆分生成正文
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
