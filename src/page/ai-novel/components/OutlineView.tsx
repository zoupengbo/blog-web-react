import React from 'react';
import { Button, Card, Tabs, Space, Input } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, FullscreenOutlined, RocketOutlined } from '@ant-design/icons';
import { NovelOutline, Idea } from '../types';

const { TextArea } = Input;

interface OutlineViewProps {
  draftOutline: NovelOutline | null;
  setDraftOutline: React.Dispatch<React.SetStateAction<NovelOutline | null>>;
  chosenIdea: Idea | null;
  onBackToIdea: () => void;
  onSaveAndCreateNovel: () => void;
  loading: boolean;
  onOpenManualEdit: (field: string, title: string, value: string) => void;
  setModifyField: (field: 'worldSetting' | 'mainLine' | 'characterSetting') => void;
  setIsModifyModalOpen: (open: boolean) => void;
}

export const OutlineView: React.FC<OutlineViewProps> = ({
  draftOutline,
  setDraftOutline,
  chosenIdea,
  onBackToIdea,
  onSaveAndCreateNovel,
  loading,
  onOpenManualEdit,
  setModifyField,
  setIsModifyModalOpen,
}) => {
  if (!draftOutline || !chosenIdea) return null;

  return (
    <div className="novel-outline-view">
      <div className="view-header">
        <Button icon={<ArrowLeftOutlined />} onClick={onBackToIdea} type="text">
          返回灵感广场
        </Button>
        <div className="header-title">
          <h2>📖 设定大纲蓝图设计 ——《{chosenIdea.title}》</h2>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          onClick={onSaveAndCreateNovel}
          loading={loading}
        >
          确认大纲并正式建档
        </Button>
      </div>

      <div className="outline-layout">
        <div className="left-settings">
          <Card className="settings-card">
            <Tabs
              defaultActiveKey="world"
              type="card"
              items={[
                {
                  key: 'world',
                  label: (
                    <Space>
                      <span>🌌 世界观规则与设定</span>
                      <Button
                        size="small"
                        type="text"
                        icon={<FullscreenOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenManualEdit('worldSetting', '世界观设定', draftOutline.worldSetting);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        放大
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<RocketOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModifyField('worldSetting');
                          setIsModifyModalOpen(true);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        AI修改
                      </Button>
                    </Space>
                  ),
                  children: (
                    <TextArea
                      value={draftOutline.worldSetting}
                      onChange={e => setDraftOutline({...draftOutline, worldSetting: e.target.value})}
                      rows={18}
                      className="outline-textarea"
                    />
                  )
                },
                {
                  key: 'characters',
                  label: (
                    <Space>
                      <span>👥 核心人物志</span>
                      <Button
                        size="small"
                        type="text"
                        icon={<FullscreenOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenManualEdit('characterSetting', '核心人物志', draftOutline.characterSetting);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        放大
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<RocketOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModifyField('characterSetting');
                          setIsModifyModalOpen(true);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        AI修改
                      </Button>
                    </Space>
                  ),
                  children: (
                    <TextArea
                      value={draftOutline.characterSetting}
                      onChange={e => setDraftOutline({...draftOutline, characterSetting: e.target.value})}
                      rows={18}
                      className="outline-textarea"
                    />
                  )
                },
                {
                  key: 'mainline',
                  label: (
                    <Space>
                      <span>⛓️ 命运起承转合主线</span>
                      <Button
                        size="small"
                        type="text"
                        icon={<FullscreenOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenManualEdit('mainLine', '命运起承转合主线', draftOutline.mainLine);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        放大
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<RocketOutlined style={{color: '#d4b106'}} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModifyField('mainLine');
                          setIsModifyModalOpen(true);
                        }}
                        style={{ padding: '0 4px', height: 'auto', fontSize: 12 }}
                      >
                        AI修改
                      </Button>
                    </Space>
                  ),
                  children: (
                    <TextArea
                      value={draftOutline.mainLine}
                      onChange={e => setDraftOutline({...draftOutline, mainLine: e.target.value})}
                      rows={18}
                      className="outline-textarea"
                    />
                  )
                }
              ]}
            />
          </Card>
        </div>

        <div className="right-chapters">
          <Card className="chapters-outline-card" title="📋 剧目细纲目录">
            <div className="chapters-list-scroll">
              {draftOutline.chaptersOutline.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(0, 0, 0, 0.45)', border: '1px dashed rgba(0, 0, 0, 0.08)', borderRadius: 8, margin: 16 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600 }}>📚 当前尚未规划章节</p>
                  <p style={{ fontSize: 12, margin: 0, lineHeight: 1.6 }}>正式建档并进入写作工坊后，您可以使用侧边栏的 <b>【+】按钮</b> 手动添加章节，或者使用 <b>【🪄 智能批量拆章】</b> 自动按剧情规划大纲。</p>
                </div>
              ) : (
                draftOutline.chaptersOutline.map((chap, i) => (
                  <Card key={i} className="chapter-small-card" size="small">
                    <div className="chap-small-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Input
                        value={chap.title}
                        onChange={e => {
                          const newList = [...draftOutline.chaptersOutline];
                          newList[i].title = e.target.value;
                          setDraftOutline({...draftOutline, chaptersOutline: newList});
                        }}
                        className="chap-title-input"
                        style={{ flex: 1 }}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<FullscreenOutlined style={{ color: '#d4b106' }} />}
                        onClick={() => onOpenManualEdit(`outline_${i}`, `第 ${chap.chapterNumber} 章细纲`, chap.outline)}
                        style={{ padding: '0 4px', height: 'auto' }}
                      >
                        放大
                      </Button>
                    </div>
                    <TextArea
                      value={chap.outline}
                      onChange={e => {
                        const newList = [...draftOutline.chaptersOutline];
                        newList[i].outline = e.target.value;
                        setDraftOutline({...draftOutline, chaptersOutline: newList});
                      }}
                      rows={3}
                      className="chap-outline-textarea"
                    />
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
