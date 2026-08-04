import { CharacterRelationship, Volume } from '../types';

export const CN_NUM_MAP: { [key: string]: number } = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
};

export function parseChineseOrArabicNumber(str: string): number {
  if (!str) return 0;
  const trimmed = str.trim();
  const arabic = parseInt(trimmed, 10);
  if (!isNaN(arabic)) return arabic;
  if (CN_NUM_MAP[trimmed] !== undefined) return CN_NUM_MAP[trimmed];
  return 0;
}

export function parseVolumeStructure(mainLine: string): { volumes: Volume[], parsed: boolean } {
  if (!mainLine || typeof mainLine !== 'string' || !mainLine.trim()) {
    return {
      volumes: [{ volumeNumber: 1, title: '全卷', content: '', startChapter: 1 }],
      parsed: false,
    };
  }

  const text = mainLine.trim();
  const volumePattern = /(?:第([一二三四五六七八九十百千\d]+)[卷部]|卷(\d+))[\s：:·—-]*(.*)/g;

  interface VolumeMatch {
    volumeNumber: number;
    rawTitle: string;
    index: number;
  }
  const matches: VolumeMatch[] = [];
  let match;
  while ((match = volumePattern.exec(text)) !== null) {
    const numStr = match[1] || match[2];
    const volumeNumber = parseChineseOrArabicNumber(numStr);
    let rawTitle = (match[3] || '').replace(/【|】|\[|\]/g, '').trim();
    // Clean up parenthesized chapter range (e.g. "(第1-80章)") from title
    rawTitle = rawTitle.replace(/[(（]\s*第?\s*\d+[\s\S]*?章\+?\s*[)）]/g, '').trim();
    matches.push({
      volumeNumber: volumeNumber || matches.length + 1,
      rawTitle,
      index: match.index,
    });
  }

  if (matches.length === 0) {
    return {
      volumes: [{ volumeNumber: 1, title: '全卷', content: text, startChapter: 1 }],
      parsed: false,
    };
  }

  matches.sort((a, b) => a.index - b.index);

  const volumes = matches.map((m, idx) => {
    const start = m.index;
    const end = idx < matches.length - 1 ? matches[idx + 1].index : text.length;
    const content = text.substring(start, end).trim();

    let startChapter = 1;
    const chapterRangeMatch = content.match(/[（(]第(\d+)[-–—至到]?\d*章[）)]/);
    if (chapterRangeMatch) {
      startChapter = parseInt(chapterRangeMatch[1], 10) || 1;
    } else if (idx > 0) {
      startChapter = idx * 80 + 1;
    }

    return {
      volumeNumber: m.volumeNumber,
      title: m.rawTitle || `第${m.volumeNumber}卷`,
      content,
      startChapter,
    };
  });

  return { volumes, parsed: true };
}

export function getChapterVolume(chapterNumber: number, volumes: Volume[]): Volume {
  if (!volumes || volumes.length === 0) {
    return { volumeNumber: 1, title: '全卷', content: '', startChapter: 1 };
  }
  let matchedVol = volumes[0];
  for (let i = volumes.length - 1; i >= 0; i--) {
    if (chapterNumber >= volumes[i].startChapter) {
      matchedVol = volumes[i];
      break;
    }
  }
  return matchedVol;
}

export function isPastCharacter(rel: CharacterRelationship): boolean {
  if (!rel) return false;
  if (rel.isPast === true || (rel as any).status === 'past' || (rel as any).status === 'deceased') {
    return true;
  }
  const text = (rel.relationship || '') + ' ' + (rel.description || '');
  return /(已?被?斩杀|已?被?彻底废除|已?被?废除|已死|死亡|已?被?击杀|已故|退场|发配|除名|已?被?废去)/i.test(text);
}
