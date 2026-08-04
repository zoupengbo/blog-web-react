import React from 'react';
import { Modal, Form, Input, Checkbox } from 'antd';
import { CharacterRelationship } from '../types';

const { TextArea } = Input;

interface RelationshipModalProps {
  open: boolean;
  onCancel: () => void;
  editingRel: CharacterRelationship | null;
  newRelName: string;
  setNewRelName: (val: string) => void;
  newRelRelationship: string;
  setNewRelRelationship: (val: string) => void;
  newRelAppearance: string;
  setNewRelAppearance: (val: string) => void;
  newRelDescription: string;
  setNewRelDescription: (val: string) => void;
  newRelIsPast: boolean;
  setNewRelIsPast: (val: boolean) => void;
  onSubmit: () => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  open,
  onCancel,
  editingRel,
  newRelName,
  setNewRelName,
  newRelRelationship,
  setNewRelRelationship,
  newRelAppearance,
  setNewRelAppearance,
  newRelDescription,
  setNewRelDescription,
  newRelIsPast,
  setNewRelIsPast,
  onSubmit,
}) => {
  return (
    <Modal
      title={editingRel ? `✏️ 编辑人物关系：${editingRel.name}` : '➕ 新增人物关系'}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="确定保存"
      cancelText="取消"
      okButtonProps={{ style: { background: '#d4b106', borderColor: '#d4b106' } }}
    >
      <Form layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="人物姓名" required>
          <Input
            placeholder="请输入角色姓名，如：苏晴"
            value={newRelName}
            onChange={e => setNewRelName(e.target.value)}
            disabled={!!editingRel}
          />
        </Form.Item>
        <Form.Item label="与主角的关系" required>
          <Input
            placeholder="例如：师姐 / 青梅竹马 / 同盟 / 竞争对手"
            value={newRelRelationship}
            onChange={e => setNewRelRelationship(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="出场章节 (英文逗号分隔章节号)">
          <Input
            placeholder="例如：1, 3, 5"
            value={newRelAppearance}
            onChange={e => setNewRelAppearance(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="人物特征与故事线描述">
          <TextArea
            placeholder="请输入该人物的人设细节、最新境界、故事线表现等。例如：'筑基中期，高傲冰冷。在演武场见证主角逆袭后对主角态度有所缓和。'"
            rows={4}
            value={newRelDescription}
            onChange={e => setNewRelDescription(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="人物存活/退场状态">
          <Checkbox
            checked={newRelIsPast}
            onChange={e => setNewRelIsPast(e.target.checked)}
          >
            <span style={{ color: newRelIsPast ? '#fa8c16' : '#595959', fontWeight: newRelIsPast ? 600 : 400 }}>
              🪦 标记为过往 / 退场人物（已被斩杀、彻底废除、发配或不再登场，AI 写作时不再读取）
            </span>
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};
