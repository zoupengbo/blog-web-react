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
