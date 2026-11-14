export interface Idea {
  title: string;
  concept: string;
  protagonist: string;
  goldLine: string;
  summary: string;
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  suspenseLevel?: string;
  foreshadowing?: string;
  hookType?: string;
  keyItems?: string;
  status: 'pending' | 'completed';
  wordCount: number;
  crawlStatus?: string;
  interventionPrompt?: string;
}

export interface CharacterRelationship {
  name: string;
  relationship: string;
  description: string;
  appearanceChapters: number[];
  isPast?: boolean;
  status?: string;
}

export interface ForeshadowingNote {
  clue: string;
  status: string;
  plantedChapter?: number;
}

export interface SystemAndCultivationState {
  realmSystem?: string[];
  protagonistCultivation?: {
    currentRealm?: string;
    lastBreakthroughChapter?: number;
    karmaPoints?: string;
    inventory?: string[];
  };
  systemFeatures?: Array<{
    featureName: string;
    status: string;
    unlockedChapter?: number;
    description?: string;
  }>;
  foreshadowingNotes?: ForeshadowingNote[];
}

export interface NovelOutline {
  id?: number;
  novelId?: number;
  theme: string;
  worldSetting: string;
  characterSetting: string;
  mainLine: string;
  chaptersOutline: ChapterOutline[];
  characterRelationships?: CharacterRelationship[];
  characterStates?: string;
  systemAndCultivationState?: SystemAndCultivationState;
  toneStyle?: string;
  toneStyleDirectives?: string;
  storyArcs?: StoryArc[];
  multiAgentConfig?: any;
  ruleBundleMode?: 'auto' | 'custom' | 'disabled';
  ruleBundleId?: number | null;
}

export interface StoryArcBeat {
  beatType: 'SETUP' | 'DEVELOPMENT' | 'ESCALATION' | 'CLIMAX' | 'AFTERMATH';
  chapterOffset?: number;
  name: string;
  guideline?: string;
}

export interface StoryArc {
  arcId: string;
  title: string;
  goal: string;
  startChapter: number;
  endChapter: number;
  status: 'planning' | 'in_progress' | 'completed';
  beats?: StoryArcBeat[];
  completedChapters?: number[];
  lastUpdated?: string;
  lastChapterWordCount?: number;
}

export interface CriticReport {
  score: number;
  passed: boolean;
  issues: string[];
  detectedCliches?: string[];
  totalClicheMatches?: number;
  iteration: number;
  maxIterations: number;
}

export interface PlotCausalChain {
  cause?: string;
  obstacle?: string;
  confrontation?: string;
  outcome?: string;
  hook?: string;
}

export interface PlotProposal {
  id?: string;
  type?: 'REVERSAL_FACE_SLAP' | 'SUSPENSE_FORESHADOW' | 'TWIST_BREAKTHROUGH' | string;
  typeKey?: 'counterattack' | 'suspense' | 'twist' | string;
  typeName?: string;
  title?: string;
  tagline?: string;
  summary: string;
  tensionRating?: number;
  causalChain?: PlotCausalChain;
}

export interface SuggestedPlotData {
  suggestion: string;
  auditMessage: string;
  hasCorrected?: boolean;
  proposals?: PlotProposal[];
}

export interface WildReaderFeedback {
  readerId: string;
  readerName: string;
  readerTag: string;
  readerAvatar?: string;
  rating: number;
  reasonableness?: number;
  interestAndEngagement?: number;
  characterAgency?: number;
  vetoTriggered?: boolean;
  vetoReason?: string;
  rootCauseCategory?: string;
  verdictSummary?: string;
  oneLineVerdict: string;
  bulletComments: string[];
  toxicPoints?: string;
  nextChapterExpectation?: string;
  remedyDirectives?: string;
  broadcastDirectives?: {
    forProseWriter?: string;
    forEpisodeDirector?: string;
  };
}

export interface AgentNodeState {
  agent: 'arc_architect' | 'episode_director' | 'prose_writer' | 'critic_auditor' | 'wild_reader' | 'lorekeeper';
  agentName: string;
  status: 'idle' | 'ready' | 'running' | 'done' | 'retry' | 'veto';
  description?: string;
  thought?: string;
  iteration?: number;
}

export interface Novel {
  id: number;
  title: string;
  author: string;
  description: string;
  category: string;
  status: string;
  latestChapter: string;
  crawledChapters: number;
  totalChapters: number;
  crawlStatus: string;
  toneStyle?: string;
}

export interface Volume {
  volumeNumber: number;
  title: string;
  content: string;
  startChapter: number;
}

export interface VectorMemoryItem {
  id: number;
  novelId: number;
  chapterNumber?: number;
  memoryType: 'lore' | 'item' | 'clue' | 'character' | 'event' | string;
  title: string;
  content: string;
  entities?: string[];
  importance?: number;
  isArchived?: boolean;
  createdAt?: string;
}

export type ViewMode = 'list' | 'create' | 'editor';

export type PaperTheme = 'light' | 'paper' | 'mint' | 'dark';

export interface PromptLogItem {
  id: number;
  novelId?: number;
  chapterNumber?: number;
  stepName: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  userPrompt?: string;
  output?: string;
  status?: string;
  durationMs?: number;
  createdAt?: string;
}

export interface ExecutionTracePromptMeta {
  id: number;
  stepName?: string;
  model?: string;
  temperature?: number;
  status?: string;
  durationMs?: number;
  createdAt?: string;
}

export interface ExecutionTraceStepMetrics {
  isProseStep?: boolean;
  stageLabel?: string;
  beforeChars?: number | null;
  afterChars?: number;
  deltaChars?: number;
  beforeParagraphs?: number | null;
  afterParagraphs?: number | null;
  deltaParagraphs?: number | null;
  beforeNonWhitespaceChars?: number | null;
  afterNonWhitespaceChars?: number | null;
  deltaNonWhitespaceChars?: number | null;
  modified?: boolean;
  pendingContentHash?: string | null;
  persistedContentHash?: string | null;
  readbackVerified?: boolean;
  contentHash?: string | null;
  chapterTitle?: string | null;
  [key: string]: any;
}

export interface ExecutionTraceStep {
  id?: number;
  traceId: string;
  stepId: string;
  parentStepId?: string | null;
  sequence: number;
  novelId?: number | null;
  chapterNumber?: number | null;
  scopeType?: 'chapter' | 'outline' | 'global' | string;
  stepKey: string;
  stepName: string;
  stepType?: string;
  status: 'running' | 'success' | 'failed' | 'skipped' | string;
  promptLogId?: number | null;
  promptMeta?: ExecutionTracePromptMeta | null;
  inputSummary?: string | null;
  outputSummary?: string | null;
  metrics?: ExecutionTraceStepMetrics | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number;
}

export interface WordCountTimelineItem {
  sequence: number;
  stepId: string;
  stepKey: string;
  stepName: string;
  stepType?: string;
  stageLabel: string;
  status: string;
  beforeChars: number | null;
  afterChars: number;
  deltaChars: number;
  deltaFromPrevStage: number;
  beforeParagraphs?: number | null;
  afterParagraphs?: number | null;
  deltaParagraphs?: number | null;
  modified: boolean;
  contentHash?: string | null;
  durationMs?: number;
}

export interface ExecutionTraceRunSummary {
  initialDraftChars: number | null;
  finalChars: number | null;
  totalNetDeltaChars: number | null;
  wordCountTimeline: WordCountTimelineItem[];
}

export interface ExecutionTraceRun {
  traceId: string;
  novelId?: number | null;
  chapterNumber?: number | null;
  scopeType?: string;
  status: 'running' | 'success' | 'failed' | string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs: number;
  stepCount: number;
  llmCallCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  persistedWordCount?: number | null;
  pendingContentHash?: string | null;
  persistedContentHash?: string | null;
  readbackVerified?: boolean;
  isTruncated?: boolean;
  persistedChapterTitle?: string | null;
  maxStepId?: number;
  summary: ExecutionTraceRunSummary;
  steps: ExecutionTraceStep[];
}

export interface ExecutionTraceTruncationInfo {
  truncated: boolean;
  runsTruncated: boolean;
  stepsTruncated: boolean;
  discoveryScanTruncated?: boolean;
  truncatedTraceIds: string[];
  limits?: {
    maxRuns: number;
    maxStepsPerTrace: number;
    maxDiscoverySteps: number;
    maxTotalSteps: number;
  };
}

export interface LiveExecutionTraceEvent {
  statusType?: string;
  action?: string;
  traceId: string;
  step: ExecutionTraceStep;
}

