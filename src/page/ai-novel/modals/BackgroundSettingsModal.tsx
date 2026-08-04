import React from 'react';
import { Modal, Tabs, Space, Button, Input, Card, Badge, Tag, Popconfirm } from 'antd';
import {
  BookOutlined, RocketOutlined, LoadingOutlined, CheckCircleFilled,
  PlusOutlined, SortAscendingOutlined, SortDescendingOutlined, UserAddOutlined,
  UserDeleteOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { NovelOutline, Novel, CharacterRelationship } from '../types';
import { isPastCharacter } from '../utils/volumeParser';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface BackgroundSettingsModalProps {
  open: boolean;
  onCancel: () => void;
  selectedOutline: NovelOutline | null;
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>;
  selectedNovel: Novel | null;
  httpService: any;
  message: any;
  setModifyField: (field: 'worldSetting' | 'mainLine' | 'characterSetting') => void;
  setIsModifyModalOpen: (open: boolean) => void;
  isAnalyzingSys: boolean;
  onAnalyzeSystemAndCultivation: () => void;
  onOpenBatchAnalyzeModal: (type?: 'sys' | 'rel') => void;
  onStartAddRelationship: () => void;
  relSortAsc: boolean;
  setRelSortAsc: React.Dispatch<React.SetStateAction<boolean>>;
  isAnalyzingRel: boolean;
  onAnalyzeRelationships: () => void;
  getProtagonistName: () => string;
  activeRelNode: CharacterRelationship | null;
  setActiveRelNode: (node: CharacterRelationship | null) => void;
  onTogglePastStatus: (relName: string) => Promise<void>;
  onStartEditRelationship: (rel: CharacterRelationship) => void;
  onDeleteRelationship: (name: string) => void;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  open,
  onCancel,
  selectedOutline,
  setSelectedOutline,
  selectedNovel,
  httpService,
  message,
  setModifyField,
  setIsModifyModalOpen,
  isAnalyzingSys,
  onAnalyzeSystemAndCultivation,
  onOpenBatchAnalyzeModal,
  onStartAddRelationship,
  relSortAsc,
  setRelSortAsc,
  isAnalyzingRel,
  onAnalyzeRelationships,
  getProtagonistName,
  activeRelNode,
  setActiveRelNode,
  onTogglePastStatus,
  onStartEditRelationship,
  onDeleteRelationship,
}) => {
  return (
    <Modal
      title={
        <span style={{ fontSize: 18, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#d4b106' }} />
          🌌 小说背景设定与修改 (大窗口工作区)
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width="92vw"
      style={{ top: 20, maxWidth: 1600 }}
      centered={false}
      styles={{ body: { paddingTop: 10, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ marginBottom: 15, padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, color: '#666', fontSize: 13 }}>
        💡 <strong>使用提示：</strong> 在大窗口中可以更宽敞地编辑世界观与人物设定。文本框编辑后在失去焦点(Blur)时会<b>自动保存到数据库</b>。关系网修改也会自动同步。
      </div>
      <Tabs defaultActiveKey="w" type="card">
        <TabPane
          tab={
            <Space>
              <span>🌌 世界观设定</span>
              <Button
                size="small"
                type="text"
                style={{ fontSize: 11, color: '#d4b106', padding: '0 4px', height: 'auto' }}
                icon={<RocketOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setModifyField('worldSetting');
                  setIsModifyModalOpen(true);
                }}
              >
                AI修改
              </Button>
            </Space>
          }
          key="w"
        >
          <TextArea
            value={selectedOutline?.worldSetting}
            onChange={e => {
              if (selectedOutline) {
                setSelectedOutline({ ...selectedOutline, worldSetting: e.target.value });
              }
            }}
            onBlur={async e => {
              if (!selectedNovel) return;
              await httpService.post('/ai-novel/save-outline', {
                novelId: selectedNovel.id,
                worldSetting: e.target.value
              });
              message.success({ content: '世界观背景设定已自动保存！', duration: 1.5 });
            }}
            placeholder="在此输入并修改小说世界观及规则设定..."
            style={{ fontSize: 14, lineHeight: 1.6, padding: 12, background: '#fafafa', height: 'calc(100vh - 280px)', minHeight: 480, resize: 'none' }}
          />
        </TabPane>
        <TabPane
          tab={
            <Space>
              <span>👥 主角团人设</span>
              <Button
                size="small"
                type="text"
                style={{ fontSize: 11, color: '#d4b106', padding: '0 4px', height: 'auto' }}
                icon={<RocketOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setModifyField('characterSetting');
                  setIsModifyModalOpen(true);
                }}
              >
                AI修改
              </Button>
            </Space>
          }
          key="c"
        >
          <TextArea
            value={selectedOutline?.characterSetting}
            onChange={e => {
              if (selectedOutline) {
                setSelectedOutline({ ...selectedOutline, characterSetting: e.target.value });
              }
            }}
            onBlur={async e => {
              if (!selectedNovel) return;
              await httpService.post('/ai-novel/save-outline', {
                novelId: selectedNovel.id,
                characterSetting: e.target.value
              });
              message.success({ content: '主角团人设已自动保存！', duration: 1.5 });
            }}
            placeholder="在此输入并修改主要人物及角色设定..."
            style={{ fontSize: 14, lineHeight: 1.6, padding: 12, background: '#fafafa', height: 'calc(100vh - 280px)', minHeight: 480, resize: 'none' }}
          />
        </TabPane>

        <TabPane tab="⚡ 修仙境界与金手指" key="sys_big">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1890ff" }}>⚡ 主角突破修为轨迹 & 系统已解锁能力看板</span>
              <Space>
                <Button
                  type="primary"
                  size="middle"
                  icon={isAnalyzingSys ? <LoadingOutlined /> : <RocketOutlined />}
                  onClick={onAnalyzeSystemAndCultivation}
                  loading={isAnalyzingSys}
                >
                  分析本章境界与金手指
                </Button>
                <Button
                  type="default"
                  size="middle"
                  icon={<CheckCircleFilled />}
                  style={{ borderColor: '#1890ff', color: '#1890ff' }}
                  onClick={() => onOpenBatchAnalyzeModal('sys')}
                >
                  批量勾选章节分析
                </Button>
              </Space>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 10, height: "calc(100vh - 300px)", minHeight: 450 }}>
              <Card title="🌟 主角突破修为看板" size="small" style={{ background: "#fafafa", borderRadius: 8 }}>
                <div style={{ padding: "12px", background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#0050b3", fontWeight: 600 }}>当前最新境界修为：</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#096dd9", marginTop: 4 }}>
                        {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.currentRealm || "暂未突破 / 练气期"}
                      </div>
                    </div>
                    {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.karmaPoints && (
                      <div style={{ textAlign: "right", background: "#fffbe6", border: "1px solid #ffe58f", padding: "4px 8px", borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: "#d48806", fontWeight: 600 }}>⚡ 当前剩余因缘值：</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#d46b08", marginTop: 2 }}>
                          {selectedOutline.systemAndCultivationState.protagonistCultivation.karmaPoints}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 }}>设定的修仙境界划分体系：</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(selectedOutline?.systemAndCultivationState?.realmSystem || ["练气期", "筑基期", "金丹期", "元婴期", "化神期"]).map((realm, idx) => (
                    <div key={idx} style={{ padding: "6px 10px", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge count={idx + 1} style={{ backgroundColor: "#1890ff" }} />
                      <span style={{ fontWeight: 500 }}>{realm}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="🔮 系统 / 金手指功能解锁看板" size="small" style={{ background: "#fafafa", borderRadius: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
                  {(!selectedOutline?.systemAndCultivationState?.systemFeatures || selectedOutline.systemAndCultivationState.systemFeatures.length === 0) ? (
                    <div style={{ textAlign: "center", padding: "80px 10px", color: "#ccc", fontSize: 13 }}>
                      暂无金手指解锁记载。生成正文后点击右上角按钮由 AI 自动提取更新。
                    </div>
                  ) : (
                    selectedOutline.systemAndCultivationState.systemFeatures.map((feat, idx) => (
                      <Card key={idx} size="small" style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{feat.featureName}</span>
                          <Badge count={feat.status} style={{ backgroundColor: "#52c41a" }} />
                        </div>
                        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{feat.description}</div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabPane>
        <TabPane tab="⛓️ 人物关系网" key="r">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                style={{ background: '#d4b106', borderColor: '#d4b106', color: '#fff' }}
                onClick={onStartAddRelationship}
              >
                手动补录人物关系
              </Button>
              <Space>
                <Button
                  size="middle"
                  icon={isAnalyzingRel ? <LoadingOutlined /> : <RocketOutlined />}
                  onClick={onAnalyzeRelationships}
                  loading={isAnalyzingRel}
                >
                  分析本章人物
                </Button>
                <Button
                  type="default"
                  size="middle"
                  icon={<CheckCircleFilled />}
                  style={{ borderColor: '#722ed1', color: '#722ed1' }}
                  onClick={() => onOpenBatchAnalyzeModal('rel')}
                >
                  批量勾选章节分析
                </Button>
              </Space>
            </div>

            {(!selectedOutline?.characterRelationships || selectedOutline.characterRelationships.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '100px 10px', color: '#ccc', fontSize: 14 }}>
                🌌 暂无人物关系记录。可在正文生成后自动提取，或点击左上方按钮手动补录。
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, marginTop: 10, height: 'calc(100vh - 300px)', minHeight: 450 }}>
                {/* SVG 拓扑关系图 */}
                <div style={{ flex: 1, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(() => {
                    const protagonist = getProtagonistName();
                    const rels = selectedOutline.characterRelationships || [];
                    const centerX = 260;
                    const centerY = 220;
                    const radius = 150;

                    const nodes = rels.map((rel, idx) => {
                      const angle = (idx * 2 * Math.PI) / rels.length - Math.PI / 2;
                      return {
                        ...rel,
                        x: centerX + radius * Math.cos(angle),
                        y: centerY + radius * Math.sin(angle),
                      };
                    });

                    return (
                      <svg width="100%" height="100%" viewBox="0 0 520 440" style={{ userSelect: 'none' }}>
                        <defs>
                          <radialGradient id="protagonistGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#b45309" />
                          </radialGradient>
                          <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#f1f5f9" />
                          </radialGradient>
                          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
                          </filter>
                        </defs>

                        {nodes.map((node, idx) => {
                          const midX = (centerX + node.x) / 2;
                          const midY = (centerY + node.y) / 2;
                          const isSelected = activeRelNode?.name === node.name;
                          const isPast = isPastCharacter(node);
                          return (
                            <g key={`link-${idx}`}>
                              <line
                                x1={centerX}
                                y1={centerY}
                                x2={node.x}
                                y2={node.y}
                                stroke={isPast ? '#e2e8f0' : (isSelected ? '#1890ff' : '#cbd5e1')}
                                strokeWidth={isSelected ? 3 : 1.5}
                                strokeDasharray={isPast ? '6 6' : (isSelected ? 'none' : '4 4')}
                                style={{ transition: 'all 0.3s ease', opacity: isPast ? 0.6 : 1 }}
                              />
                              <g transform={`translate(${midX}, ${midY})`}>
                                <rect
                                  x="-35"
                                  y="-8"
                                  width="70"
                                  height="16"
                                  rx="4"
                                  fill={isPast ? '#f8fafc' : (isSelected ? '#e6f7ff' : '#fffbe6')}
                                  stroke={isPast ? '#cbd5e1' : (isSelected ? '#91d5ff' : '#ffe58f')}
                                  strokeWidth="1"
                                  opacity={isPast ? 0.7 : 1}
                                />
                                <text
                                  y="3"
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill={isPast ? '#94a3b8' : (isSelected ? '#1890ff' : '#d4b106')}
                                  fontWeight="600"
                                >
                                  {node.relationship.length > 5 ? node.relationship.slice(0, 5) + '..' : node.relationship}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        <g transform={`translate(${centerX}, ${centerY})`} filter="url(#shadow)" style={{ cursor: 'pointer' }}>
                          <circle r="36" fill="url(#protagonistGrad)" stroke="#b45309" strokeWidth="2" />
                          <text y="-5" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="13">主角</text>
                          <text y="12" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="13">{protagonist}</text>
                        </g>

                        {nodes.map((node, idx) => {
                          const isSelected = activeRelNode?.name === node.name;
                          const isPast = isPastCharacter(node);
                          return (
                            <g
                              key={`node-${idx}`}
                              transform={`translate(${node.x}, ${node.y})`}
                              filter="url(#shadow)"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setActiveRelNode(node)}
                            >
                              <circle
                                r="28"
                                fill={isPast ? '#f1f5f9' : 'url(#nodeGrad)'}
                                stroke={isPast ? '#cbd5e1' : (isSelected ? '#1890ff' : '#d4b106')}
                                strokeWidth={isSelected ? 3 : 1.5}
                                strokeDasharray={isPast ? '3 3' : 'none'}
                                style={{ transition: 'all 0.3s ease', opacity: isPast ? 0.7 : 1 }}
                              />
                              <text
                                y="5"
                                textAnchor="middle"
                                fill={isPast ? '#94a3b8' : (isSelected ? '#1890ff' : '#0f172a')}
                                fontWeight="600"
                                fontSize="11"
                                style={{ textDecoration: isPast ? 'line-through' : 'none' }}
                              >
                                {node.name.length > 4 ? node.name.slice(0, 3) + '..' : node.name}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>

                {/* 右侧：节点选中详情面板 */}
                <div style={{ width: 280, display: 'flex', flexDirection: 'column', border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  {activeRelNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isPastCharacter(activeRelNode) ? '#94a3b8' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isPastCharacter(activeRelNode) ? 'line-through' : 'none' }}>
                            {activeRelNode.name}
                            {isPastCharacter(activeRelNode) && <Tag color="default" style={{ fontSize: 10, marginLeft: 4, fontWeight: 'normal' }}>已退场</Tag>}
                          </h3>
                          <span style={{ fontSize: 12, color: '#666' }}>关系：</span>
                          <Badge
                            count={activeRelNode.relationship}
                            style={{ backgroundColor: isPastCharacter(activeRelNode) ? '#f1f5f9' : '#fffbe6', color: isPastCharacter(activeRelNode) ? '#64748b' : '#d4b106', border: isPastCharacter(activeRelNode) ? '1px solid #cbd5e1' : '1px solid #ffe58f', borderRadius: 4, height: 20, lineHeight: '18px', fontSize: 11 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <Button
                            size="small"
                            type="text"
                            icon={isPastCharacter(activeRelNode) ? <UserAddOutlined style={{ fontSize: 13, color: '#52c41a' }} /> : <UserDeleteOutlined style={{ fontSize: 13, color: '#fa8c16' }} />}
                            onClick={async () => {
                              await onTogglePastStatus(activeRelNode.name);
                              setActiveRelNode({ ...activeRelNode, isPast: !isPastCharacter(activeRelNode) });
                            }}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined style={{ fontSize: 13, color: '#1890ff' }} />}
                            onClick={() => onStartEditRelationship(activeRelNode)}
                          />
                          <Popconfirm
                            title={`确定要删除人物 ${activeRelNode.name} 的关系记录吗？`}
                            okText="确定"
                            cancelText="取消"
                            onConfirm={() => onDeleteRelationship(activeRelNode.name)}
                          >
                            <Button
                              size="small"
                              type="text"
                              icon={<DeleteOutlined style={{ fontSize: 13, color: '#ff4d4f' }} />}
                            />
                          </Popconfirm>
                        </div>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>人设特征 / 细节描述：</span>
                        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, background: '#f8fafc', padding: 10, borderRadius: 6, minHeight: 120 }}>
                          {activeRelNode.description || '暂无描述信息。'}
                        </div>

                        <span style={{ fontWeight: 600, fontSize: 12, color: '#999', display: 'block', marginTop: 16, marginBottom: 4 }}>登场章节：</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {activeRelNode.appearanceChapters && activeRelNode.appearanceChapters.length > 0 ? (
                            activeRelNode.appearanceChapters.map((num, i) => (
                              <span key={i} style={{ background: '#e6f7ff', color: '#1890ff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                                第 {num} 章
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 12, color: '#ccc' }}>无记录</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', textAlign: 'center', gap: 10 }}>
                      <div style={{ fontSize: 32 }}>⛓️</div>
                      <div style={{ fontSize: 13 }}>点击左侧关系图中的人物节点<br/>即可在此查看并编辑详情</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};
