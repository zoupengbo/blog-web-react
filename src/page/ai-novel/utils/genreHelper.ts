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
