import httpService from '../../../common/request';

export interface CorpusSourceItem {
  id: number;
  sourceName: string;
  licenseType: 'public_domain' | 'licensed' | 'self_owned' | 'pending';
  licenseProof?: string;
  targetUse: 'research' | 'training' | 'commercial';
  genre: string;
  status: 'active' | 'inactive' | 'pending_verification' | 'revoked' | 'disabled';
  verificationNotes?: string;
  verifiedAt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CorpusWorkItem {
  id: number;
  sourceId: number;
  title: string;
  author: string;
  chapterNumber: number;
  chapterTitle: string;
  wordCount: number;
  content?: string;
  cleanStatus: 'raw' | 'cleaned' | 'flagged';
  qualityMetrics?: {
    totalChars?: number;
    totalLines?: number;
    paragraphCount?: number;
    dialogueRatio?: number;
    punctuationScore?: number;
    avgParagraphLength?: number;
  };
  source?: CorpusSourceItem;
  created_at?: string;
}

export interface DistillTaskLog {
  timestamp: string;
  stage: string;
  message: string;
}

export interface DistillTaskItem {
  id: number;
  taskName: string;
  genre: string;
  targetDimension: string;
  capabilities?: string[];
  sourceIds?: number[];
  workIds?: number[];
  sampleCount: number;
  status: 'pending' | 'running' | 'completed' | 'partial_success' | 'failed' | 'cancelled';
  currentStage: 'init' | 'sampling' | 'extracting' | 'evaluating' | 'finalized' | 'failed' | 'cancelled';
  progress: number;
  extractedRulesCount: number;
  verifiedRulesCount: number;
  conflictCount: number;
  executionTimeMs?: number;
  errorMessage?: string;
  resultSummary?: {
    requestedChapterCount?: number;
    actualChapterCount?: number;
    actualSliceCount?: number;
    analyzedSliceCount?: number;
    batchStats?: any;
    candidateRuleCount?: number;
    deduplicatedRuleCount?: number;
    verifiedRuleCount?: number;
    unverifiedRuleCount?: number;
    conflictRuleCount?: number;
    userProblem?: string;
    analysisMode?: string;
    dynamicDimensions?: any;
    executionTimeMs?: number;
  };
  logs?: DistillTaskLog[];
  created_at?: string;
}

export interface DistillRuleItem {
  id: number;
  taskId?: number;
  genre: string;
  ruleName: string;
  targetDimension: string;
  conditionPattern: string;
  ruleText: string;
  antiAiPattern?: string;
  positiveExemplar?: string;
  negativeExemplar?: string;
  originalFacts?: string;
  mechanismExplanation?: string;
  counterConditions?: string;
  sideEffects?: string;
  scopeType?: 'local' | 'cross_chapter' | 'unverified';
  trialActive?: boolean;
  generalizationWarnings?: string[];
  evidenceSnippets?: (string | { snippet: string; verified?: boolean })[];
  evidenceVerified: boolean;
  evidenceMatchRate?: number;
  isConflict: boolean;
  conflictNotes?: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'draft' | 'verified' | 'rejected' | 'merged' | 'needs_review';
  auditNotes?: string;
  contextSnapshots?: Array<{
    workId?: number;
    workTitle?: string;
    chapterNumber?: number;
    chapterTitle?: string;
    sliceId?: string;
    startOffset?: number;
    endOffset?: number;
    snippet: string;
    context?: string;
    contextWindow?: string;
    verified: boolean;
    qualityMetrics?: {
      evidenceScore?: number;
      specificityScore?: number;
      crossChapterScore?: number;
      conflictScore?: number;
      crossChapterCount?: number;
    };
  }>;
  created_at?: string;
}

export interface RuleBundleItem {
  id: number;
  bundleName: string;
  genre: string;
  version: string;
  description?: string;
  ruleCount: number;
  bundleContent: string;
  ruleListSnapshot?: any[];
  isActive: boolean;
  created_at?: string;
}

export interface LabOverviewData {
  corpus: {
    totalSources: number;
    legalSources: number;
    totalWorks: number;
    totalWords: number;
  };
  tasks: {
    totalTasks: number;
    completedTasks: number;
    recentTasks: DistillTaskItem[];
  };
  rules: {
    totalRules: number;
    verifiedRules: number;
    conflictRules: number;
  };
  bundles: {
    totalBundles: number;
    activeBundles: number;
    recentBundles: RuleBundleItem[];
  };
}

// ==================== 接口方法 ====================

export const getLabOverview = async (): Promise<{ code: number; data: LabOverviewData }> => {
  return httpService.get('/ai-novel/lab/overview') as any;
};

// 语料来源
export const getCorpusSources = async (params: any = {}): Promise<{ code: number; data: { total: number; items: CorpusSourceItem[] } }> => {
  return httpService.get('/ai-novel/lab/sources', { params }) as any;
};

export const createCorpusSource = async (data: Partial<CorpusSourceItem>): Promise<{ code: number; data: CorpusSourceItem; message: string }> => {
  return httpService.post('/ai-novel/lab/sources', data) as any;
};

export const updateCorpusSource = async (id: number, data: Partial<CorpusSourceItem>): Promise<{ code: number; data: CorpusSourceItem; message: string }> => {
  return httpService.put(`/ai-novel/lab/sources/${id}`, data) as any;
};

export const deleteCorpusSource = async (id: number): Promise<{ code: number; message: string }> => {
  return httpService.delete(`/ai-novel/lab/sources/${id}`) as any;
};

export const verifyCorpusSource = async (id: number, data: { isApproved: boolean; verificationNotes?: string }): Promise<{ code: number; data: CorpusSourceItem; message: string }> => {
  return httpService.post(`/ai-novel/lab/sources/${id}/verify`, data) as any;
};

export const seedBenchmarkCorpus = async (): Promise<{ code: number; data: any; message: string }> => {
  return httpService.post('/ai-novel/lab/corpus/seed-benchmark', {}) as any;
};

// 语料作品与切片
export const getCorpusWorks = async (params: any = {}): Promise<{ code: number; data: { total: number; items: CorpusWorkItem[] } }> => {
  return httpService.get('/ai-novel/lab/works', { params }) as any;
};

export const importCorpusWork = async (data: { sourceId: number; title: string; author?: string; rawText: string }): Promise<{ code: number; data: any; message: string }> => {
  return httpService.post('/ai-novel/lab/works/import', data) as any;
};

export const importTxtCorpusWork = async (data: {
  title?: string;
  author?: string;
  genre?: string;
  rawText: string;
  sourceId?: number;
  sourceName?: string;
}): Promise<{ code: number; data: any; message: string }> => {
  return httpService.post('/ai-novel/lab/works/import-txt', data) as any;
};

// 全网小说搜索与在线抓取切片
export const searchOnlineNovels = async (keyword: string): Promise<{ code: number; data: { searchResults: any[] }; msg?: string }> => {
  return httpService.post('/novel/search', { keyword }) as any;
};

export const importOnlineNovel = async (data: {
  novelUrl: string;
  title: string;
  author?: string;
  genre?: string;
  chapterCount?: number;
  mode?: 'ai_climax' | 'true_opening' | 'manual';
  selectedChapterUrls?: string[];
}): Promise<{ code: number; data: any; message: string }> => {
  return httpService.post('/ai-novel/lab/works/import-online', data) as any;
};

export const getOnlineNovelChapters = async (novelUrl: string): Promise<{
  code: number;
  data: {
    title: string;
    author: string;
    description: string;
    category: string;
    coverImage: string;
    totalChapters: number;
    validChaptersCount: number;
    chapters: Array<{ title: string; sourceUrl: string; chapterNumber: number }>;
  };
}> => {
  return httpService.get('/ai-novel/lab/works/online-chapters', { params: { novelUrl } }) as any;
};

export const aiSelectChapters = async (data: {
  title: string;
  genre?: string;
  chapters?: any[];
  novelUrl?: string;
  count?: number;
  mode?: 'ai_climax' | 'true_opening';
}): Promise<{
  code: number;
  data: {
    selectedChapters: Array<{ title: string; sourceUrl: string; chapterNumber: number }>;
    mode: string;
    rationale: string;
  };
}> => {
  return httpService.post('/ai-novel/lab/works/ai-select-chapters', data) as any;
};

export const deleteCorpusWork = async (id: number): Promise<{ code: number; message: string }> => {
  return httpService.delete(`/ai-novel/lab/works/${id}`) as any;
};

// 蒸馏任务
export const getDistillTasks = async (params: any = {}): Promise<{ code: number; data: { total: number; items: DistillTaskItem[] } }> => {
  return httpService.get('/ai-novel/lab/tasks', { params }) as any;
};

export const createDistillTask = async (data: any): Promise<{ code: number; data: DistillTaskItem; message: string }> => {
  return httpService.post('/ai-novel/lab/tasks', data) as any;
};

export const getDistillTaskDetail = async (id: number): Promise<{ code: number; data: DistillTaskItem }> => {
  return httpService.get(`/ai-novel/lab/tasks/${id}`) as any;
};

export const retryDistillTask = async (id: number): Promise<{ code: number; data: DistillTaskItem; message: string }> => {
  return httpService.post(`/ai-novel/lab/tasks/${id}/retry`, {}) as any;
};

export interface DiagnosisPlanItem {
  workId?: number | null;
  sourceId?: number | null;
  workTitle: string;
  genre: string;
  userProblem: string;
  analysisMode: 'targeted' | 'comprehensive';
  problemDiagnosis: string;
  dynamicDimensions: Array<{
    name: string;
    primaryCapability: string;
    focus: string;
  }>;
  primaryCapabilities: string[];
  selectedChapters: Array<{
    chapterNumber: number;
    chapterTitle: string;
    reason: string;
    expectedValue: string;
    id?: number;
    sourceUrl?: string;
  }>;
  selectedChapterNumbers: number[];
  analysisBudget: {
    chapterCount: number;
    estimatedSliceCount: number;
    estimatedTokens: number;
  };
  uncertaintyNote?: string;
}

export const diagnoseAndPlanTask = async (data: {
  workId?: number;
  sourceId?: number;
  workTitle?: string;
  novelUrl?: string;
  customChapters?: any[];
  genre?: string;
  userProblem?: string;
  analysisMode?: 'targeted' | 'comprehensive';
}): Promise<{ code: number; data: DiagnosisPlanItem; message: string }> => {
  return httpService.post('/ai-novel/lab/tasks/diagnose-and-plan', data) as any;
};

export const cancelDistillTask = async (id: number): Promise<{ code: number; data: DistillTaskItem; message: string }> => {
  return httpService.post(`/ai-novel/lab/tasks/${id}/cancel`, {}) as any;
};

// 规则管理
export interface ComparativeExperimentResult {
  taskId?: number | null;
  genre: string;
  targetChapter: { chapterNumber?: number; title?: string; summary?: string };
  experimentTimestamp: string;
  groupA: {
    name: string;
    ruleCount: number;
    ruleIds: number[];
    ruleSnapshot?: Array<{
      id: number;
      ruleName: string;
      targetDimension: string;
      scopeType: string;
      principle: string;
      evidenceVerified: boolean;
      isConflict: boolean;
    }>;
    sampleProse?: string;
    promptPreview: string;
    scores: {
      characterConsistency: number;
      causalMotivation: number;
      dialogueNaturalness: number;
      antiPreachiness: number;
      sensoryRestraint: number;
      noFormulaicRepetition: number;
      contextAppropriateness: number;
      compositeScore: number;
    };
  };
  groupB: {
    name: string;
    ruleCount: number;
    ruleIds: number[];
    ruleSnapshot?: Array<{
      id: number;
      ruleName: string;
      targetDimension: string;
      scopeType: string;
      principle: string;
      evidenceVerified: boolean;
      isConflict: boolean;
    }>;
    sampleProse?: string;
    promptPreview: string;
    scores: {
      characterConsistency: number;
      causalMotivation: number;
      dialogueNaturalness: number;
      antiPreachiness: number;
      sensoryRestraint: number;
      noFormulaicRepetition: number;
      contextAppropriateness: number;
      compositeScore: number;
    };
  };
  groupC: {
    name: string;
    ruleCount: number;
    ruleIds: number[];
    ruleSnapshot?: Array<{
      id: number;
      ruleName: string;
      targetDimension: string;
      scopeType: string;
      principle: string;
      evidenceVerified: boolean;
      isConflict: boolean;
    }>;
    sampleProse?: string;
    promptPreview: string;
    scores: {
      characterConsistency: number;
      causalMotivation: number;
      dialogueNaturalness: number;
      antiPreachiness: number;
      sensoryRestraint: number;
      noFormulaicRepetition: number;
      contextAppropriateness: number;
      compositeScore: number;
    };
  };
  conclusion: string;
}

export const getDistillRules = async (params: any = {}): Promise<{
  code: number;
  data: {
    total: number;
    verifiedTotal?: number;
    trialTotal?: number;
    needsReviewTotal?: number;
    draftTotal?: number;
    items: DistillRuleItem[];
  };
}> => {
  return httpService.get('/ai-novel/lab/rules', { params }) as any;
};

export const runComparativeExperiment = async (data: {
  taskId?: number;
  genre?: string;
  targetChapter?: { chapterNumber?: number; title?: string; summary?: string };
  rules?: any[];
}): Promise<{ code: number; data: ComparativeExperimentResult; message: string }> => {
  return httpService.post('/ai-novel/lab/rules/experiment', data) as any;
};

export const reviewDistillRule = async (id: number, data: Partial<DistillRuleItem> & { userOverride?: boolean; force?: boolean }): Promise<{ code: number; data: DistillRuleItem; message: string }> => {
  return httpService.put(`/ai-novel/lab/rules/${id}`, data) as any;
};

export const batchReviewDistillRules = async (data: {
  ruleIds: number[];
  status?: string;
  trialActive?: boolean;
  auditNotes?: string;
  userOverride?: boolean;
  force?: boolean;
}): Promise<{ code: number; data: any; message: string }> => {
  return httpService.post('/ai-novel/lab/rules/batch-review', data) as any;
};

// 规则包管理
export const getRuleBundles = async (params: any = {}): Promise<{ code: number; data: { total: number; items: RuleBundleItem[] } }> => {
  return httpService.get('/ai-novel/lab/bundles', { params }) as any;
};

export const compileRuleBundle = async (data: any): Promise<{ code: number; data: RuleBundleItem; message: string }> => {
  return httpService.post('/ai-novel/lab/bundles/compile', data) as any;
};

export const activateRuleBundle = async (id: number): Promise<{ code: number; data: RuleBundleItem; message: string }> => {
  return httpService.post(`/ai-novel/lab/bundles/${id}/activate`, {}) as any;
};

export const deactivateRuleBundle = async (id: number): Promise<{ code: number; data: RuleBundleItem; message: string }> => {
  return httpService.post(`/ai-novel/lab/bundles/${id}/deactivate`, {}) as any;
};

export const exportRuleBundle = async (id: number, format: 'markdown' | 'json' = 'markdown'): Promise<{ code: number; data: any }> => {
  return httpService.get(`/ai-novel/lab/bundles/${id}/export`, { params: { format } }) as any;
};
