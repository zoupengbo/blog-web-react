/**
 * src/page/ai-novel/utils/genreHelper.ts
 * 
 * 前端小说题材智能归一化与跨系统同义词兼容匹配工具
 * 解决因小说题材字面差异（如“都市官场” vs “体制官场”）导致蒸馏规则包无法自动挂载匹配的问题
 */

/**
 * 题材归一化映射：将任意自定义或细分题材归一化为主流基准题材族系
 * @param rawGenre 原始题材字符串
 * @returns 归一化后的标准基准题材
 */
export function normalizeGenre(rawGenre: string | undefined | null): string {
  if (!rawGenre || typeof rawGenre !== 'string') return '通用';
  const clean = rawGenre.trim();
  if (!clean) return '通用';

  // 1. 体制官场族（最高优先级：凡带有官场、体制、仕途、机关、政道、选调等，无论前面是否带都市，一律归入体制官场）
  if (/官场|体制|仕途|机关|政道|政界|选调|纪检|公务员|市委|省委/.test(clean)) {
    return '体制官场';
  }

  // 2. 玄幻修真仙侠族
  if (/修真|修仙|仙侠|玄幻|洪荒|异界|奇幻|神话|诸神|道统|宗门|金丹/.test(clean)) {
    return '玄幻修真';
  }

  // 3. 历史架空权谋族
  if (/历史|架空|权谋|争霸|朝堂|三国|乱世|大唐|大明|种田致富/.test(clean)) {
    return '历史架空';
  }

  // 4. 科幻末世赛博族
  if (/科幻|末世|赛博|星际|机甲|废土|末日|飞升/.test(clean)) {
    return '科幻末世';
  }

  // 5. 悬疑惊悚解密族
  if (/悬疑|惊悚|诡异|密室|解密|推理|盗墓|灵异/.test(clean)) {
    return '悬疑惊悚';
  }

  // 6. 现代言情女性族
  if (/言情|婚恋|纯爱|甜宠|豪门|女帝|恋爱/.test(clean)) {
    return '现代言情';
  }

  // 7. 都市职场生活族
  if (/职场|都市|神医|日常|爽文|经商|商海/.test(clean)) {
    return '都市职场';
  }

  // 8. 游戏竞技体育族
  if (/游戏|网游|电竞|体育|竞技/.test(clean)) {
    return '游戏体育';
  }

  return clean;
}

/**
 * 智能判定两项题材是否兼容互通
 * 支持精确匹配、相互包含以及归一化族系等价匹配
 * 例如：areGenresCompatible('都市官场', '体制官场') === true
 * @param genreA 题材 A
 * @param genreB 题材 B
 * @returns 是否兼容匹配
 */
export function areGenresCompatible(
  genreA: string | undefined | null,
  genreB: string | undefined | null
): boolean {
  if (!genreA || !genreB) return false;
  const a = String(genreA).trim();
  const b = String(genreB).trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const normA = normalizeGenre(a);
  const normB = normalizeGenre(b);
  return normA === normB;
}

export interface GrowthSystemConfig {
  tabLabel: string;
  headerTitle: string;
  buttonAnalyzeSingle: string;
  buttonAnalyzeBatch: string;
  levelCardTitle: string;
  levelFieldLabel: string;
  levelDefaultValue: string;
  pointsLabel: string;
  systemListTitle: string;
  defaultHierarchy: string[];
  inventoryLabel: string;
  featuresCardTitle: string;
  featuresEmptyTip: string;
}

/**
 * 获取特定题材的主角成长与能力体系文案配置（彻底解耦现实题材与玄幻修仙）
 * @param genre 题材
 * @returns 成长体系配置对象
 */
export function getGrowthSystemConfig(genre: string | undefined | null): GrowthSystemConfig {
  const norm = normalizeGenre(genre);

  if (norm === '体制官场' || norm === '都市职场') {
    return {
      tabLabel: '🏛️ 职级晋升与核心抓手',
      headerTitle: '🏛️ 主角行政职级轨迹 & 核心实干抓手看板',
      buttonAnalyzeSingle: '分析本章职级与抓手',
      buttonAnalyzeBatch: '批量勾选章节分析',
      levelCardTitle: '📈 行政职务与职级升迁看板',
      levelFieldLabel: '当前职务与行政职级：',
      levelDefaultValue: '暂无明确职务 / 普通科员',
      pointsLabel: '🏛️ 量化政绩/关键数据：',
      systemListTitle: '设定的职级晋升序列体系：',
      defaultHierarchy: [
        '办事员/普通科员',
        '副科级/副局长/乡镇副职',
        '正科级/局长/乡镇正职',
        '副处级/副县长/区副书记',
        '正处级/县长/县委书记',
        '副厅级/副市长/厅党组成员',
        '正厅级/市长/市委书记/厅长',
      ],
      inventoryLabel: '💼 关键政绩抓手与政策依据：',
      featuresCardTitle: '💼 核心政绩、执政抓手与博弈底牌看板',
      featuresEmptyTip: '暂无记录的关键政绩与执政抓手。点击上方【分析本章职级与抓手】可自动提取正文中的项目推进、公文突破与人事博弈抓手！',
    };
  }

  if (norm === '历史架空') {
    return {
      tabLabel: '👑 官阶爵位与权谋底牌',
      headerTitle: '👑 主角品阶爵位履历 & 权柄底牌看板',
      buttonAnalyzeSingle: '分析本章官阶与底牌',
      buttonAnalyzeBatch: '批量勾选章节分析',
      levelCardTitle: '📜 品阶爵位与官职看板',
      levelFieldLabel: '当前品级与官职：',
      levelDefaultValue: '布衣白丁 / 未授官职',
      pointsLabel: '👑 功勋与威望值：',
      systemListTitle: '设定的九品官阶晋升序列：',
      defaultHierarchy: [
        '从九品',
        '正八品',
        '正七品知县',
        '从五品知州',
        '正四品知府',
        '正三品巡抚/总督',
        '从一品尚书/大学士',
      ],
      inventoryLabel: '🗡️ 随身信物与调兵符节：',
      featuresCardTitle: '🗡️ 权谋底牌、私兵幕僚与派系班底看板',
      featuresEmptyTip: '暂无记录的权谋底牌与幕僚班底。点击上方分析按钮可自动提取正文中的私兵幕僚、密折机要与同盟派系！',
    };
  }

  if (norm === '科幻末世') {
    return {
      tabLabel: '🧬 科技能级与超限装备',
      headerTitle: '🧬 主角能级负荷轨迹 & 尖端科技装备看板',
      buttonAnalyzeSingle: '分析本章能级与装备',
      buttonAnalyzeBatch: '批量勾选章节分析',
      levelCardTitle: '⚡ 能级与义体负荷看板',
      levelFieldLabel: '当前能级/基因锁阶段：',
      levelDefaultValue: '基础体魄 / 零阶',
      pointsLabel: '🔋 能源/算力点数：',
      systemListTitle: '设定的科技能级突破体系：',
      defaultHierarchy: [
        '零阶 (常规人类)',
        '一阶 (基因初醒/轻度义体)',
        '二阶 (重装改造/神经链接)',
        '三阶 (纳米集群/超维感知)',
        '四阶 (恒星矩阵/意识飞升)',
      ],
      inventoryLabel: '🛰️ 尖端装备与超限核心：',
      featuresCardTitle: '🛰️ 科技模组、AI权限与超限武器看板',
      featuresEmptyTip: '暂无记录的科技模组与武器装备。点击上方分析按钮可自动提取正文中的科技构装与模块！',
    };
  }

  // 默认：玄幻修真仙侠
  return {
    tabLabel: '⚡ 修仙境界与金手指',
    headerTitle: '⚡ 主角突破修为轨迹 & 系统已解锁能力看板',
    buttonAnalyzeSingle: '分析本章境界与金手指',
    buttonAnalyzeBatch: '批量勾选章节分析',
    levelCardTitle: '🌟 主角突破修为看板',
    levelFieldLabel: '当前最新境界修为：',
    levelDefaultValue: '暂未突破 / 练气期',
    pointsLabel: '⚡ 当前剩余因缘值：',
    systemListTitle: '设定的修仙境界划分体系：',
    defaultHierarchy: ['练气期', '筑基期', '金丹期', '元婴期', '化神期'],
    inventoryLabel: '🎒 关键战利品与随身底牌：',
    featuresCardTitle: '🔮 系统 / 金手指功能解锁看板',
    featuresEmptyTip: '暂无系统或金手指功能记载，可在正文生成后点击上方按钮 AI 分析提取。',
  };
}
