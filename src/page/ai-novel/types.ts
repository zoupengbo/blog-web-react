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

export interface SystemAndCultivationState {
  realmSystem?: string[];
  protagonistCultivation?: {
    currentRealm?: string;
    lastBreakthroughChapter?: number;
    karmaPoints?: string;
  };
  systemFeatures?: Array<{
    featureName: string;
    status: string;
    unlockedChapter?: number;
    description?: string;
  }>;
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
