import React from 'react';
import { Modal, Spin, Form, Radio, Button, Select, InputNumber, Input } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { NovelOutline } from '../types';

interface FanqiePublishModalProps {
  open: boolean;
  onCancel: () => void;
  isPublishingToFanqie: boolean;
  syncSelectMode: 'manual' | 'range';
  setSyncSelectMode: (mode: 'manual' | 'range') => void;
  selectedPublishChapters: number[];
  setSelectedPublishChapters: (chapters: number[]) => void;
  syncRangeStart: number | null;
  setSyncRangeStart: (val: number | null) => void;
  syncRangeEnd: number | null;
  setSyncRangeEnd: (val: number | null) => void;
  selectedOutline: NovelOutline | null;
  fanqieBookName: string;
  setFanqieBookName: (val: string) => void;
  fanqieBookId: string;
  setFanqieBookId: (val: string) => void;
  onSelectAllUnsynced: () => void;
  onPublishToFanqie: () => void;
  getSyncSummary: () => React.ReactNode;
}

export const FanqiePublishModal: React.FC<FanqiePublishModalProps> = ({
  open,
  onCancel,
  isPublishingToFanqie,
  syncSelectMode,
  setSyncSelectMode,
  selectedPublishChapters,
  setSelectedPublishChapters,
  syncRangeStart,
  setSyncRangeStart,
  syncRangeEnd,
  setSyncRangeEnd,
  selectedOutline,
  fanqieBookName,
  setFanqieBookName,
  fanqieBookId,
  setFanqieBookId,
  onSelectAllUnsynced,
  onPublishToFanqie,
  getSyncSummary,
}) => {
  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RocketOutlined style={{ color: '#d4b106' }} />
          自动同步章节至番茄草稿箱
        </span>
      }
      open={open}
      onCancel={() => !isPublishingToFanqie && onCancel()}
      footer={null}
      width={500}
      className="fanqie-publish-modal"
      centered
      maskClosable={false}
    >
      <Spin spinning={isPublishingToFanqie} tip="番茄草稿同步中，请在开启的 Chromium 窗口中操作/观察...">
        <div style={{ marginTop: 15 }}>
          <div style={{ marginBottom: 15, padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, color: '#92400e', fontSize: 13 }}>
            📌 <strong>使用说明：</strong>
            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
              <li>首次同步时需要您在打开的浏览器中<strong>手机扫码登录</strong>番茄作家后台。</li>
              <li>登录成功后，系统会保存 Cookie，下次同步将<strong>免扫码自动登录</strong>。</li>
              <li>请确保下面的【番茄作品名称】与您的番茄小说作品名<strong>完全一致</strong>，以便脚本定位。</li>
            </ul>
          </div>

          <Form layout="vertical">
            <Form.Item
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px', alignItems: 'center' }}>
                  <span>⚙️ 同步章节选择模式</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={onSelectAllUnsynced}
                    disabled={isPublishingToFanqie}
                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                  >
                    ⚡ 智能选择未同步
                  </Button>
                </div>
              }
              required
            >
              <Radio.Group
                value={syncSelectMode}
                onChange={e => setSyncSelectMode(e.target.value)}
                disabled={isPublishingToFanqie}
                optionType="button"
                buttonStyle="solid"
                style={{ width: '100%' }}
              >
                <Radio.Button value="manual" style={{ width: '50%', textAlign: 'center' }}>精确多选</Radio.Button>
                <Radio.Button value="range" style={{ width: '50%', textAlign: 'center' }}>按范围同步</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {syncSelectMode === 'manual' ? (
              <Form.Item
                label="📚 选择待同步章节"
                required
                extra="仅支持同步已完成创作的章节。支持多选，将按顺序依次同步至草稿箱。"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择要同步的章节"
                  value={selectedPublishChapters}
                  onChange={setSelectedPublishChapters}
                  style={{ width: '100%' }}
                  disabled={isPublishingToFanqie}
                  optionFilterProp="children"
                  showSearch
                >
                  {selectedOutline?.chaptersOutline
                    .filter(c => c.status === 'completed')
                    .map(c => (
                      <Select.Option key={c.chapterNumber} value={c.chapterNumber}>
                        第{c.chapterNumber}章 {c.title} ({c.crawlStatus === 'published' ? '已同步' : '未同步'})
                      </Select.Option>
                    ))
                  }
                </Select>
              </Form.Item>
            ) : (
              <Form.Item
                label="📚 输入待同步章节范围"
                required
                extra="仅支持同步已完成创作的章节。将按章节序号从小到大顺序同步。"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InputNumber
                    min={1}
                    placeholder="起始章"
                    value={syncRangeStart}
                    onChange={val => setSyncRangeStart(val)}
                    disabled={isPublishingToFanqie}
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#999' }}>至</span>
                  <InputNumber
                    min={1}
                    placeholder="结束章"
                    value={syncRangeEnd}
                    onChange={val => setSyncRangeEnd(val)}
                    disabled={isPublishingToFanqie}
                    style={{ flex: 1 }}
                  />
                </div>
              </Form.Item>
            )}

            {selectedOutline && (
              <div style={{ margin: '15px 0', padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e40af', fontSize: 13, lineHeight: '1.5' }}>
                💡 <strong>选择概览：</strong> {getSyncSummary()}
              </div>
            )}

            <Form.Item
              label="📖 番茄作品名称 (精确匹配)"
              required
              tooltip="必须与番茄作家后台的作品名称完全一致，否则无法自动识别"
            >
              <Input
                value={fanqieBookName}
                onChange={e => setFanqieBookName(e.target.value)}
                placeholder="请输入您的番茄作品名称"
              />
            </Form.Item>

            <Form.Item
              label="🆔 番茄书籍 ID (可选)"
              tooltip="番茄作家后台的书籍ID，通常是数字（可不填，自动识别书籍卡片）"
            >
              <Input
                value={fanqieBookId}
                onChange={e => setFanqieBookId(e.target.value)}
                placeholder="例如：723482736182"
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
              <Button
                onClick={onCancel}
                disabled={isPublishingToFanqie}
              >
                取消
              </Button>
              <Button
                type="primary"
                loading={isPublishingToFanqie}
                onClick={onPublishToFanqie}
                style={{ background: 'linear-gradient(135deg, #d4b106 0%, #b29100 100%)', border: 'none', color: '#fff', fontWeight: 700 }}
              >
                开始同步到草稿箱
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </Modal>
  );
};
