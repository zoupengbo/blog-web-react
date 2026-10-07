import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Radio,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Checkbox,
  Modal,
  Divider,
  Empty,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  MobileOutlined,
  BulbOutlined,
  PictureOutlined,
  WechatOutlined,
  CopyOutlined,
  ExportOutlined
} from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DraftArticleItem } from '../types';
import { MediaMatrixApi } from '../services/mediaMatrixApi';

const { Text, Paragraph } = Typography;

interface ArticleEditorTabProps {
  article: DraftArticleItem | null;
  onSaved: (article: DraftArticleItem) => void;
  onPushed: () => void;
}

const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // 如果是 /uploads/... 等相对路径，在本地开发环境或缺少代理时拼接完整地址
  return url.startsWith('/') ? url : `/${url}`;
};

export const ArticleEditorTab: React.FC<ArticleEditorTabProps> = ({
  article,
  onSaved,
  onPushed
}) => {
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [digest, setDigest] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [author, setAuthor] = useState<string>('AI 资讯精选');
  const [coverImage, setCoverImage] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [pushing, setPushing] = useState<boolean>(false);
  const [generatingImage, setGeneratingImage] = useState<boolean>(false);
  const [autoGenerateImageOnPush, setAutoGenerateImageOnPush] = useState<boolean>(true);
  const [pushModalVisible, setPushModalVisible] = useState<boolean>(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['wechat', 'toutiao']);

  useEffect(() => {
    if (article) {
      setCurrentTitle(article.title || '');
      setDigest(article.digest || '');
      setContent(article.content || '');
      setAuthor(article.author || 'AI 资讯精选');
      setCoverImage(article.coverImage || '');
    }
  }, [article]);

  const parseArray = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  const candidateTitles = parseArray(article?.candidateTitles);
  const quotes = parseArray(article?.quotes);
  const imagePrompts = parseArray(article?.imagePrompts);

  if (!article) {
    return (
      <Card style={{ borderRadius: 8, padding: 60, textAlign: 'center' }}>
        <Empty
          description="暂无正在编辑的草稿文章"
        >
          <Text type="secondary">
            请前往「热点追踪与聚合」选项卡，选择感兴趣的热搜话题并点击「AI 深度写稿」
          </Text>
        </Empty>
      </Card>
    );
  }

  const handleSave = async () => {
    if (!article) return;
    setSaving(true);
    try {
      const res: any = await MediaMatrixApi.updateArticle(article.id, {
        title: currentTitle,
        digest,
        content,
        author,
        coverImage
      });
      if (res && res.data) {
        message.success('文章修改已保存');
        onSaved(res.data);
      }
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateImage = async (insertToContent = false) => {
    if (!article) return;
    setGeneratingImage(true);
    const hide = message.loading('Gemini AI 正在深入理解文章并渲染高质量大片...', 0);
    try {
      const res: any = await MediaMatrixApi.generateArticleImage(article.id, {
        insertToContent
      });
      if (res && res.data) {
        setCoverImage(res.data.coverImage);
        if (res.data.article) {
          setContent(res.data.article.content || content);
          onSaved(res.data.article);
        }
        message.success(res.data.isFallback ? '已生成专属主题视觉卡片！' : 'Gemini 专属配图已成功生成并设为封面！');
      }
    } catch (err: any) {
      message.error(err.message || 'Gemini 生图失败');
    } finally {
      hide();
      setGeneratingImage(false);
    }
  };

  const handleInsertImageToContent = () => {
    if (!coverImage) return;
    const imgTag = `<div style="text-align: center; margin: 24px 0;"><img src="${coverImage}" alt="${currentTitle}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 0 auto; display: block;" /><p style="color: #888; font-size: 13px; margin-top: 8px;">▲ ${currentTitle}</p></div>`;
    if (!content.includes(coverImage)) {
      setContent(prev => prev + imgTag);
      message.success('已将配图追加至正文末尾，可在上方富文本编辑器中调整位置');
    } else {
      message.info('当前正文中已包含该配图');
    }
  };

  const handleCopyForToutiao = () => {
    // 复制富文本内容与标题至剪贴板
    try {
      const fullHtml = `<h2>${currentTitle}</h2>\n${content}`;
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([currentTitle + '\n\n' + content.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
        const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
        const item = new window.ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob
        });
        navigator.clipboard.write([item]).then(() => {
          message.success('已复制整篇精美图文排版（包含标题、格式与配图）！正在为您打开头条发文后台...');
          setTimeout(() => {
            window.open('https://mp.toutiao.com/profile_v4/graphic/publish', '_blank');
          }, 600);
        }).catch(() => {
          // fallback to text
          navigator.clipboard.writeText(fullHtml);
          message.success('已复制文章内容！正在为您打开头条发文后台...');
          window.open('https://mp.toutiao.com/profile_v4/graphic/publish', '_blank');
        });
      } else {
        navigator.clipboard.writeText(fullHtml);
        message.success('已复制文章内容！正在为您打开头条发文后台...');
        window.open('https://mp.toutiao.com/profile_v4/graphic/publish', '_blank');
      }
    } catch (e: any) {
      message.error('复制失败，请手动在编辑器中选择复制: ' + e.message);
    }
  };

  const handleDoPush = async () => {
    if (selectedChannels.length === 0) {
      message.warning('请至少选择一个推送渠道');
      return;
    }
    setPushing(true);
    try {
      // 先自动保存当前修改
      await MediaMatrixApi.updateArticle(article.id, {
        title: currentTitle,
        digest,
        content,
        author,
        coverImage
      });

      const res: any = await MediaMatrixApi.pushDraft({
        draftArticleId: article.id,
        channels: selectedChannels,
        autoGenerateImage: autoGenerateImageOnPush
      });

      if (res && res.code === 200) {
        message.success('已成功推送到指定自媒体草稿箱！');
      } else {
        message.info(res?.msg || '推送处理完成');
      }
      setPushModalVisible(false);
      onPushed();
    } catch (err: any) {
      message.error(err.message || '推送失败');
    } finally {
      setPushing(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link', 'clean']
    ]
  };

  return (
    <div>
      {/* 顶部操作条 */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center">
            <Tag color="purple" style={{ fontSize: 13, padding: '4px 10px' }}>
              风格预设: {article.stylePreset || 'viral'}
            </Tag>
            <Tag color={article.status === 'published' ? 'green' : 'gold'}>
              {article.status === 'published' ? '已推送至渠道' : '草稿未推送'}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {article.id} | 生成时间: {article.createdAt}
            </Text>
          </Space>

          <Space>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存修改
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleCopyForToutiao}
              style={{ borderColor: '#f5222d', color: '#f5222d' }}
            >
              复制排版直达头条发文
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setPushModalVisible(true)}
              style={{ background: 'linear-gradient(135deg, #52c41a 0%, #1890ff 100%)', border: 'none' }}
            >
              一键推送到自媒体草稿箱
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        {/* 左侧编辑区域 */}
        <Col xs={24} lg={14}>
          <Card title="文章信息与标题优化" style={{ marginBottom: 16, borderRadius: 8 }}>
            {candidateTitles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  AI 爆款备选标题（点击即可快速采用）：
                </Text>
                <Radio.Group
                  value={currentTitle}
                  onChange={e => setCurrentTitle(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {candidateTitles.map((t, idx) => (
                      <Radio key={idx} value={t} style={{ width: '100%', whiteSpace: 'normal' }}>
                        <Text style={{ fontSize: 14 }}>{t}</Text>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                主标题（直接编辑）：
              </Text>
              <Input
                value={currentTitle}
                onChange={e => setCurrentTitle(e.target.value)}
                placeholder="请输入文章主标题"
                style={{ fontWeight: 600, fontSize: 15 }}
              />
            </div>

            <Row gutter={12}>
              <Col span={16}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    文章摘要 / 导语卡片：
                  </Text>
                  <Input.TextArea
                    rows={2}
                    value={digest}
                    onChange={e => setDigest(e.target.value)}
                    placeholder="请输入导语或摘要内容"
                  />
                </div>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    署名作者：
                  </Text>
                  <Input
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="如：AI 资讯精选"
                  />
                </div>
              </Col>
            </Row>
          </Card>

          <Card title="正文富文本排版编辑" style={{ borderRadius: 8, marginBottom: 16 }}>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              style={{ minHeight: 350 }}
            />
          </Card>

          {/* AI 灵感辅助 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <span>核心金句提炼</span>
                  </Space>
                }
                style={{ borderRadius: 8, marginBottom: 16 }}
              >
                {quotes.length > 0 ? (
                  quotes.map((q, idx) => (
                    <Paragraph key={idx} style={{ fontSize: 12, marginBottom: 6, color: '#4b5563' }}>
                      • {q}
                    </Paragraph>
                  ))
                ) : (
                  <Text type="secondary">暂无金句</Text>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <PictureOutlined style={{ color: '#1890ff' }} />
                    <span>Gemini 封面与配图生成</span>
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    loading={generatingImage}
                    onClick={() => handleGenerateImage(false)}
                    icon={<PictureOutlined />}
                  >
                    {coverImage ? '重新生图' : '调用 Gemini 生图'}
                  </Button>
                }
                style={{ borderRadius: 8, marginBottom: 16 }}
              >
                {coverImage ? (
                  <div style={{ marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                      <img
                        src={formatImageUrl(coverImage)}
                        alt="文章封面"
                        onError={(e) => {
                          const target = e.currentTarget;
                          // 如果 /uploads 没有被前端转发，回退使用后端实际地址
                          if (!target.src.includes(':3000') && coverImage.startsWith('/uploads/')) {
                            target.src = `http://localhost:3000${coverImage}`;
                          }
                        }}
                        style={{
                          width: '100%',
                          maxHeight: 180,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          display: 'block'
                        }}
                      />
                      <Tag color="cyan" style={{ position: 'absolute', top: 8, left: 8 }}>
                        Gemini 专属配图
                      </Tag>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Button
                          size="small"
                          onClick={handleInsertImageToContent}
                        >
                          插入至正文
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          danger
                          onClick={() => setCoverImage('')}
                        >
                          清除
                        </Button>
                      </Space>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 8px', textAlign: 'center', background: '#fafafa', borderRadius: 6, marginBottom: 12 }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                      文章当前尚未生成专属图片
                    </Text>
                    <Button
                      type="primary"
                      size="small"
                      loading={generatingImage}
                      onClick={() => handleGenerateImage(false)}
                      icon={<PictureOutlined />}
                      style={{ background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', border: 'none' }}
                    >
                      立即调用 Gemini AI 生成专属封面
                    </Button>
                  </div>
                )}

                {imagePrompts.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                      AI 推荐生图提示词：
                    </Text>
                    {imagePrompts.map((p, idx) => (
                      <Paragraph key={idx} style={{ fontSize: 12, marginBottom: 4, color: '#4b5563' }}>
                        📷 {p}
                      </Paragraph>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 右侧手机端模拟排版预览 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <MobileOutlined style={{ color: '#52c41a' }} />
                <span>图文排版实机预览</span>
              </Space>
            }
            extra={
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyForToutiao}
              >
                复制排版并直达头条
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            {/* 手机外壳容器 */}
            <div
              style={{
                width: '100%',
                maxWidth: 380,
                margin: '0 auto',
                border: '12px solid #222',
                borderRadius: 36,
                padding: '16px 14px',
                background: '#ffffff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                minHeight: 560,
                maxHeight: 700,
                overflowY: 'auto'
              }}
            >
              {/* 微信图文头部 */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', lineHeight: 1.4, margin: '0 0 8px 0' }}>
                  {currentTitle || '暂无标题'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 12, marginBottom: 10 }}>
                  <span style={{ color: '#576b95', fontWeight: 500 }}>{author}</span>
                  <span>刚刚</span>
                </div>
                {coverImage && (
                  <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <img
                      src={formatImageUrl(coverImage)}
                      alt="文章封面大图"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes(':3000') && coverImage.startsWith('/uploads/')) {
                          target.src = `http://localhost:3000${coverImage}`;
                        }
                      }}
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}
              </div>

              {/* 微信正文区域 */}
              <div
                dangerouslySetInnerHTML={{ __html: content }}
                style={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: '#2b2b2b',
                  wordBreak: 'break-word'
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 推送渠道选择弹窗 */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#1890ff' }} />
            <span>推送到自媒体平台草稿箱</span>
          </Space>
        }
        open={pushModalVisible}
        onCancel={() => setPushModalVisible(false)}
        onOk={handleDoPush}
        confirmLoading={pushing}
        okText="立即安全推送"
        cancelText="取消"
      >
        <div style={{ margin: '16px 0' }}>
          <Paragraph>
            即将把当前经过 AI 加工并确认的文章推送到目标平台草稿箱，进入草稿箱后可安全由人工复核。
          </Paragraph>

          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            选择推送目标渠道：
          </Text>

          <Checkbox.Group
            value={selectedChannels}
            onChange={(checkedValues) => setSelectedChannels(checkedValues as string[])}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox value="wechat">
                <Space>
                  <Tag color="green" icon={<WechatOutlined />}>微信公众号</Tag>
                  <Text>官方草稿箱接口 (draft/add)</Text>
                </Space>
              </Checkbox>
              <Checkbox value="toutiao">
                <Space>
                  <Tag color="red">今日头条</Tag>
                  <Text>头条号开放平台图文草稿接口</Text>
                </Space>
              </Checkbox>
            </Space>
          </Checkbox.Group>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ marginBottom: 14 }}>
            <Checkbox
              checked={autoGenerateImageOnPush}
              onChange={e => setAutoGenerateImageOnPush(e.target.checked)}
            >
              <Space>
                <Text strong>自动自带图片：</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>若未设置封面，发表时自动调用 Gemini 生成专属配图并上传至平台素材库</Text>
              </Space>
            </Checkbox>
          </div>

          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 12, borderRadius: 6 }}>
            <Text type="success" style={{ fontSize: 13 }}>
              🛡️ <strong>安全保障</strong>：系统默认提供沙盒模拟与真实凭证双模切换。若尚未在「渠道凭据配置」中关闭模拟模式，系统将进行无风险沙盒推演并记录日志，确保您的账号安全。
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};
