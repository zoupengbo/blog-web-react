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
  systemAndCultivationState?: SystemAndCultivationState;
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
