import React from 'react';
import { Modal } from 'antd';
import { MultiAgentConsole } from '../components/MultiAgentConsole';
import { StoryArc, CriticReport, AgentNodeState, WildReaderFeedback } from '../types';

interface MultiAgentModalProps {
  open: boolean;
  onCancel: () => void;
  currentArc: StoryArc | null;
  currentChapterNum: number;
  agentNodes: Record<string, AgentNodeState>;
  criticReport: CriticReport | null;
  wildReaderFeedback?: WildReaderFeedback | null;
  agentThoughts: Array<{ agent: string; thought: string; timestamp?: string }>;
  isGenerating: boolean;
  onStartWrite?: () => void;
}

export const MultiAgentModal: React.FC<MultiAgentModalProps> = ({
  open,
  onCancel,
  currentArc,
  currentChapterNum,
  agentNodes,
  criticReport,
  wildReaderFeedback,
  agentThoughts,
  isGenerating,
  onStartWrite
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width="100vw"
      style={{ top: 0, paddingBottom: 0, margin: 0, maxWidth: '100vw', height: '100vh' }}
      destroyOnClose={true}
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
      bodyStyle={{
        padding: 0,
        height: '100vh',
        maxHeight: '100vh',
        background: '#070b14',
        borderRadius: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
      title={null}
      closable={true}
      className="sci-fi-multi-agent-modal"
      wrapClassName="sci-fi-multi-agent-modal-wrap"
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MultiAgentConsole
          isOpen={open}
          currentArc={currentArc}
          currentChapterNum={currentChapterNum}
          agentNodes={agentNodes}
          criticReport={criticReport}
          wildReaderFeedback={wildReaderFeedback}
          agentThoughts={agentThoughts}
          isGenerating={isGenerating}
          onStartWrite={onStartWrite}
        />
      </div>
    </Modal>
  );
};

export default MultiAgentModal;
