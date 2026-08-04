import React from 'react';
import { Button, Card, Form, Select, Input, Spin } from 'antd';
import { ArrowLeftOutlined, RocketOutlined, InteractionOutlined } from '@ant-design/icons';
import { Idea } from '../types';

const { TextArea } = Input;

interface IdeaViewProps {
  onBackToList: () => void;
  category: string;
  setCategory: (cat: string) => void;
  customCategory: string;
  setCustomCategory: (cat: string) => void;
  tone: string[];
  setTone: (tone: string[]) => void;
  keywords: string;
  setKeywords: (kw: string) => void;
  ideas: Idea[];
  setIdeas: React.Dispatch<React.SetStateAction<Idea[]>>;
  loading: boolean;
  editingIdeaIndex: number | null;
  onGenerateIdeas: () => void;
  onToggleEditIdea: (e: React.MouseEvent, index: number) => void;
  onBuildOutline: (idea: Idea) => void;
}

export const IdeaView: React.FC<IdeaViewProps> = ({
  onBackToList,
  category,
  setCategory,
  customCategory,
  setCustomCategory,
  tone,
  setTone,
  keywords,
  setKeywords,
  ideas,
  setIdeas,
  loading,
  editingIdeaIndex,
  onGenerateIdeas,
  onToggleEditIdea,
  onBuildOutline,
}) => {
  return (
    <div className="novel-idea-view">
      <div className="back-bar">
        <Button icon={<ArrowLeftOutlined />} onClick={onBackToList} type="text" className="back-btn">
          返回创作库
        </Button>
      </div>

      <div className="inspiration-layout">
        <Card className="form-card" title="💡 配置灵感触发器">
          <Form layout="vertical">
            <Form.Item label="✍️ 小说类型">
              <Select value={category} onChange={setCategory} size="large">
                <Select.Option value="custom">✏️ 自定义类型...</Select.Option>
                <Select.OptGroup label="🌌 玄幻仙侠">
                  <Select.Option value="修真玄幻">修真玄幻</Select.Option>
                  <Select.Option value="洪荒仙侠">洪荒仙侠</Select.Option>
                  <Select.Option value="异界大陆">异界大陆</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🌆 都市生活">
                  <Select.Option value="都市神医">都市神医</Select.Option>
                  <Select.Option value="爽文逆袭">爽文逆袭</Select.Option>
                  <Select.Option value="职场生活">职场生活</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🚀 科幻末世">
                  <Select.Option value="赛博朋克">赛博朋克</Select.Option>
                  <Select.Option value="末世科幻">末世科幻</Select.Option>
                  <Select.Option value="星际飞升">星际飞升</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🕵️ 悬疑解密">
                  <Select.Option value="悬疑烧脑">悬疑烧脑</Select.Option>
                  <Select.Option value="无限密室">无限密室</Select.Option>
                  <Select.Option value="诡异解密">诡异解密</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🌸 轻小说">
                  <Select.Option value="轻小说">轻小说</Select.Option>
                  <Select.Option value="异世界穿越">异世界穿越</Select.Option>
                  <Select.Option value="系统女帝">系统女帝</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🎮 游戏体育">
                  <Select.Option value="网游虚拟">网游虚拟</Select.Option>
                  <Select.Option value="职业电竞">职业电竞</Select.Option>
                  <Select.Option value="体育竞技">体育竞技</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="📜 历史架空">
                  <Select.Option value="穿越历史">穿越历史</Select.Option>
                  <Select.Option value="权谋争霸">权谋争霸</Select.Option>
                  <Select.Option value="种田致富">种田致富</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🔮 奇幻神话">
                  <Select.Option value="剑与魔法">剑与魔法</Select.Option>
                  <Select.Option value="上古神话">上古神话</Select.Option>
                  <Select.Option value="诸神黄昏">诸神黄昏</Select.Option>
                </Select.OptGroup>
                <Select.OptGroup label="🎭 同人脑洞">
                  <Select.Option value="动漫同人">动漫同人</Select.Option>
                  <Select.Option value="影视衍生">影视衍生</Select.Option>
                  <Select.Option value="脑洞同人">脑洞同人</Select.Option>
                </Select.OptGroup>
              </Select>
              {category === 'custom' && (
                <Input
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="请输入您的自定义类型，如：都市探案、末世种田"
                  size="large"
                  style={{ marginTop: 8 }}
                />
              )}
            </Form.Item>

            <Form.Item label="🎭 整体故事基调">
              <Select
                mode="tags"
                size="large"
                style={{ width: '100%' }}
                placeholder="请选择或直接输入自定义基调（按回车添加）"
                value={tone}
                onChange={setTone}
              >
                <Select.Option value="热血爽文">热血爽文</Select.Option>
                <Select.Option value="幽默爆笑">幽默爆笑</Select.Option>
                <Select.Option value="反转悬疑">反转悬疑</Select.Option>
                <Select.Option value="深沉暗黑">深沉暗黑</Select.Option>
                <Select.Option value="狗粮恋爱">狗粮恋爱</Select.Option>
                <Select.Option value="轻松种田">轻松种田</Select.Option>
                <Select.Option value="硬核极客">硬核极客</Select.Option>
                <Select.Option value="无敌碾压">无敌碾压</Select.Option>
                <Select.Option value="唯美治愈">唯美治愈</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="🔮 一句话灵感闪光 (可选)">
              <TextArea
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="例如：一个少年体内藏有全宇宙的智能核心，在修仙界用量子纠缠修炼；或者提供您独特的关键词..."
                rows={4}
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              icon={<RocketOutlined />}
              size="large"
              block
              onClick={onGenerateIdeas}
              loading={loading}
              className="generate-btn"
            >
              让 AI 捕捉脑洞灵感
            </Button>
          </Form>
        </Card>

        <div className="ideas-container">
          {loading && ideas.length === 0 ? (
            <div className="spinner-box">
              <Spin size="large" tip="AI 脑电波高度共振中，正在孵化创意小样..." />
            </div>
          ) : ideas.length === 0 ? (
            <div className="ideas-empty">
              <InteractionOutlined className="empty-icon-spin" />
              <h3>创意小样将在右侧孵化</h3>
              <p>在左侧配置小说背景，一键“让 AI 捕捉脑洞灵感”即可在右侧获得 3 个精彩的爆款小说创意模型！</p>
            </div>
          ) : (
            <div className="ideas-grid">
              <h2 className="title-ideas">🔮 创意孵化成果 (点击任意卡片架构完整大纲)</h2>
              {ideas.map((idea, index) => {
                const isEditing = editingIdeaIndex === index;
                return (
                  <Card
                    key={index}
                    className={`idea-card ${isEditing ? 'editing-active' : ''}`}
                    hoverable={!isEditing}
                    onClick={() => {
                      if (!isEditing) {
                        onBuildOutline(idea);
                      }
                    }}
                  >
                    <div className="card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, overflow: 'hidden' }}>
                        <span className="badge-index" style={{ flexShrink: 0 }}>创意 #{index + 1}</span>
                        {isEditing ? (
                          <Input
                            value={idea.title}
                            onChange={e => {
                              const newIdeas = [...ideas];
                              newIdeas[index].title = e.target.value;
                              setIdeas(newIdeas);
                            }}
                            className="idea-edit-input title-edit"
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'rgba(0, 0, 0, 0.4)', color: '#fff', border: '1px solid rgba(212, 177, 6, 0.4)', borderRadius: 4, height: 32, fontSize: 16, fontWeight: 700 }}
                          />
                        ) : (
                          <h3 className="idea-title" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.title}</h3>
                        )}
                      </div>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        onClick={(e) => onToggleEditIdea(e, index)}
                        style={{ borderColor: isEditing ? '#52c41a' : 'rgba(212, 177, 6, 0.5)', color: isEditing ? '#52c41a' : '#d4b106', flexShrink: 0 }}
                      >
                        {isEditing ? '💾 保存' : '📝 修改脑洞'}
                      </Button>
                    </div>

                    <div className="field-group" style={{ marginTop: 15 }}>
                      <div className="field-label">✨ 金手指脑洞：</div>
                      {isEditing ? (
                        <TextArea
                          value={idea.concept}
                          onChange={e => {
                            const newIdeas = [...ideas];
                            newIdeas[index].concept = e.target.value;
                            setIdeas(newIdeas);
                          }}
                          rows={2}
                          onClick={e => e.stopPropagation()}
                          style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 4 }}
                        />
                      ) : (
                        <div className="field-val">{idea.concept}</div>
                      )}
                    </div>

                    <div className="field-group">
                      <div className="field-label">👤 主角设定：</div>
                      {isEditing ? (
                        <TextArea
                          value={idea.protagonist}
                          onChange={e => {
                            const newIdeas = [...ideas];
                            newIdeas[index].protagonist = e.target.value;
                            setIdeas(newIdeas);
                          }}
                          rows={2}
                          onClick={e => e.stopPropagation()}
                          style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 4 }}
                        />
                      ) : (
                        <div className="field-val">{idea.protagonist}</div>
                      )}
                    </div>

                    <div className="field-group">
                      <div className="field-label">💥 核心爽点：</div>
                      {isEditing ? (
                        <TextArea
                          value={idea.goldLine}
                          onChange={e => {
                            const newIdeas = [...ideas];
                            newIdeas[index].goldLine = e.target.value;
                            setIdeas(newIdeas);
                          }}
                          rows={2}
                          onClick={e => e.stopPropagation()}
                          style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#fef08a', border: '1px solid rgba(212, 177, 6, 0.2)', borderRadius: 4 }}
                        />
                      ) : (
                        <div className="field-val" style={{ color: '#d4b106', fontWeight: 600 }}>“ {idea.goldLine} ”</div>
                      )}
                    </div>

                    <div className="field-group">
                      <div className="field-label">📖 剧情概要：</div>
                      {isEditing ? (
                        <TextArea
                          value={idea.summary}
                          onChange={e => {
                            const newIdeas = [...ideas];
                            newIdeas[index].summary = e.target.value;
                            setIdeas(newIdeas);
                          }}
                          rows={3}
                          onClick={e => e.stopPropagation()}
                          style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 4 }}
                        />
                      ) : (
                        <div className="field-val">{idea.summary}</div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="idea-edit-actions" style={{ marginTop: 15, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <Button
                          size="middle"
                          onClick={(e) => onToggleEditIdea(e, index)}
                          style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#a0aec0' }}
                        >
                          暂存修改
                        </Button>
                        <Button
                          type="primary"
                          size="middle"
                          icon={<RocketOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEditIdea(e, index);
                            onBuildOutline(idea);
                          }}
                          style={{ background: 'linear-gradient(135deg, #d4b106 0%, #b29100 100%)', border: 'none', color: '#0b0f19', fontWeight: 700 }}
                        >
                          确认并架构大纲
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
