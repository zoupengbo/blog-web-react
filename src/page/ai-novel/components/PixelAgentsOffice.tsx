import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { StoryArc, CriticReport, AgentNodeState, WildReaderFeedback } from '../types';

interface PixelAgentsOfficeProps {
  isOpen?: boolean;
  currentArc: StoryArc | null;
  currentChapterNum: number;
  agentNodes: Record<string, AgentNodeState>;
  criticReport: CriticReport | null;
  wildReaderFeedback?: WildReaderFeedback | null;
  agentThoughts: Array<{ agent: string; thought: string; timestamp?: string }>;
  isGenerating: boolean;
  onSelectAgent?: (agentKey: string) => void;
  selectedAgentKey?: string | null;
  onOpenWhiteboard?: () => void;
  onOpenPrinter?: () => void;
}

interface Waypoint {
  x: number;
  y: number;
}

interface InteractionContext {
  chapterNum: number;
  arcTitle?: string;
  criticReport?: CriticReport | null;
  wildReaderFeedback?: WildReaderFeedback | null;
}

interface InteractionDialogStep {
  speakerId: string;
  text: string | ((ctx: InteractionContext) => string);
  duration: number; // in animation ticks (~60 ticks/s)
  facing?: 'down' | 'up' | 'right' | 'left';
  targetFacing?: 'down' | 'up' | 'right' | 'left';
}

interface OfficeInteractionScenario {
  id: string;
  name: string;
  initiatorId: string;
  targetId?: string;
  getTargetPos: (s: number, chars: Record<string, CharacterState>) => { x: number; y: number };
  steps: InteractionDialogStep[];
}

interface ActiveInteraction {
  scenario: OfficeInteractionScenario;
  stage: 'walking_to' | 'talking' | 'walking_back';
  stepIndex: number;
  stepTimer: number;
}

interface CharacterState {
  id: string;
  name: string;
  code: string;
  title: string;
  faction?: 'leader' | 'creative' | 'quality' | 'reader';
  charIndex: number;
  color: string;
  isLead: boolean;
  dualPC: boolean;
  deskCol: number;
  deskRow: number;
  chairCol: number;
  chairRow: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  waypoints: Waypoint[];
  facing: 'down' | 'up' | 'right' | 'left';
  state: 'typing' | 'reading' | 'walking';
  speed: number;
  walkFrame: number;
  idleTimer: number;
  bubbleText: string | null;
  bubbleTimer: number;
}

const INTERACTION_SCENARIOS: OfficeInteractionScenario[] = [
  {
    id: 'writer_visits_director',
    name: '【创作派研讨】写手去分镜工位讨论高潮节拍',
    initiatorId: 'prose_writer',
    targetId: 'episode_director',
    getTargetPos: (s, chars) => ({ x: chars.episode_director.chairCol * s, y: 7.2 * s }),
    steps: [
      {
        speakerId: 'prose_writer',
        text: (ctx) => `分镜老师，第 ${ctx.chapterNum} 章的高潮冲突点往前挪两段如何？`,
        duration: 160,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'episode_director',
        text: (ctx) => `可以！把《${ctx.arcTitle || '主线'}》的爽点提前爆发！`,
        duration: 160,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'prose_writer',
        text: '好勒！动词白描全速狂飙，绝不注水！✏️',
        duration: 120,
        facing: 'up',
        targetFacing: 'down'
      }
    ]
  },
  {
    id: 'critic_visits_writer',
    name: '【两派交锋】责编去写手桌前把关AI套话',
    initiatorId: 'critic_auditor',
    targetId: 'prose_writer',
    getTargetPos: (s) => ({ x: 6.2 * s, y: 10.5 * s }),
    steps: [
      {
        speakerId: 'critic_auditor',
        text: (ctx) => ctx.criticReport?.issues && ctx.criticReport.issues.length > 0
          ? `写手老师，初稿抓到【${ctx.criticReport.issues[0]}】，风控派立刻退回！`
          : `写手老师，第 ${ctx.chapterNum} 章严禁'倒吸凉气'这类AI套话！`,
        duration: 170,
        facing: 'left',
        targetFacing: 'right'
      },
      {
        speakerId: 'prose_writer',
        text: '放心！创作派全篇动词白描，绝无虚浮形容词！',
        duration: 160,
        facing: 'right',
        targetFacing: 'left'
      },
      {
        speakerId: 'critic_auditor',
        text: (ctx) => ctx.criticReport?.score
          ? `当前评分 ${ctx.criticReport.score}分，保持水准，今晚不加班！`
          : '很好，保持这个水准，今晚不加班！',
        duration: 120,
        facing: 'left',
        targetFacing: 'right'
      }
    ]
  },
  {
    id: 'director_visits_architect',
    name: '【请示领导】分镜进独立办公室请示总编伏笔时机',
    initiatorId: 'episode_director',
    targetId: 'arc_architect',
    getTargetPos: (s, chars) => ({ x: chars.arc_architect.chairCol * s, y: 6.2 * s }),
    steps: [
      {
        speakerId: 'episode_director',
        text: (ctx) => `总编，《${ctx.arcTitle || '本卷'}》反派的真实动机现在揭示吗？`,
        duration: 170,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'arc_architect',
        text: (ctx) => `再等等！第 ${ctx.chapterNum + 2} 章转折点再放钩子，悬念拉满！`,
        duration: 170,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'episode_director',
        text: '收到总编指示，伏笔已在分镜中埋好！',
        duration: 120,
        facing: 'up',
        targetFacing: 'down'
      }
    ]
  },
  {
    id: 'lorekeeper_visits_architect',
    name: '【请示领导】档案官进独立办公室汇报世界线归档',
    initiatorId: 'lorekeeper',
    targetId: 'arc_architect',
    getTargetPos: (s, chars) => ({ x: chars.arc_architect.chairCol * s, y: 6.2 * s }),
    steps: [
      {
        speakerId: 'lorekeeper',
        text: (ctx) => `总策划，第 ${ctx.chapterNum} 章主角解锁的技能与战力已安全归档！`,
        duration: 170,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'arc_architect',
        text: '干得漂亮！世界线因果链彻底闭环了。👑',
        duration: 160,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'lorekeeper',
        text: '风控派继续监控战力平衡与人物关系！📚',
        duration: 120,
        facing: 'up',
        targetFacing: 'down'
      }
    ]
  },
  {
    id: 'reader_visits_writer',
    name: '【监察督办】剧情监察官赴写手工位核实因果逻辑',
    initiatorId: 'wild_reader',
    targetId: 'prose_writer',
    getTargetPos: (s) => ({ x: 6.2 * s, y: 10.5 * s }),
    steps: [
      {
        speakerId: 'wild_reader',
        text: (ctx) => `写手老师！第 ${ctx.chapterNum} 章战力自洽与动机必须过硬，严禁主角降智憋屈！⚖️`,
        duration: 180,
        facing: 'left',
        targetFacing: 'right'
      },
      {
        speakerId: 'prose_writer',
        text: '明白！白描动词紧扣因果逻辑，商业爽点与决断力全程在线！✏️',
        duration: 160,
        facing: 'right',
        targetFacing: 'left'
      },
      {
        speakerId: 'wild_reader',
        text: '好就是好，不好就是不好！只要因果自洽且有看点，准予盖章放行！👍',
        duration: 130,
        facing: 'left',
        targetFacing: 'right'
      }
    ]
  },
  {
    id: 'reader_visits_critic',
    name: '【严守红线】剧情监察官与对抗责编会商毒点审查',
    initiatorId: 'wild_reader',
    targetId: 'critic_auditor',
    getTargetPos: (s, chars) => ({ x: chars.critic_auditor.chairCol * s, y: 7.2 * s }),
    steps: [
      {
        speakerId: 'wild_reader',
        text: '责编老师，战力崩坏与主线注水一律一票否决，务必把死商业红线！⚖️',
        duration: 180,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'critic_auditor',
        text: '放心！风控派放大镜逐段扫描，AI套话与逻辑暗伤坚决退回！🔍',
        duration: 160,
        facing: 'up',
        targetFacing: 'down'
      },
      {
        speakerId: 'wild_reader',
        text: '很好！守住因果合理性与商业张力，读者自会口碑相传！✨',
        duration: 120,
        facing: 'up',
        targetFacing: 'down'
      }
    ]
  },
  {
    id: 'architect_inspects_office',
    name: '【领导视察】总策划走出独立办公室视察两派',
    initiatorId: 'arc_architect',
    getTargetPos: (s) => ({ x: 7.5 * s, y: 8.0 * s }),
    steps: [
      {
        speakerId: 'arc_architect',
        text: (ctx) => `大家辛苦！创作派全力抓紧推进第 ${ctx.chapterNum} 章，质检派盯紧因果闭环！`,
        duration: 190,
        facing: 'down'
      },
      {
        speakerId: 'arc_architect',
        text: '故事弧光节奏极佳，继续保持！👑',
        duration: 130,
        facing: 'right'
      }
    ]
  },
  {
    id: 'writer_visits_coffee',
    name: '【精确对位】写手去棋盘格水吧吧台续杯现磨咖啡',
    initiatorId: 'prose_writer',
    // 🌟 精准站在棋盘格水吧咖啡吧台前，面向咖啡机
    getTargetPos: (s) => ({ x: 27.5 * s, y: 15.2 * s }),
    steps: [
      {
        speakerId: 'prose_writer',
        text: (ctx) => `第 ${ctx.chapterNum} 章键盘快敲冒烟了，来吧台续一杯热美式提提神！☕`,
        duration: 170,
        facing: 'right'
      },
      {
        speakerId: 'prose_writer',
        text: '满血复活，下一章字数管饱！✏️',
        duration: 110,
        facing: 'down'
      }
    ]
  },
  {
    id: 'critic_visits_water',
    name: '【精确对位】责编去棋盘格水吧饮水机接温水',
    initiatorId: 'critic_auditor',
    // 🌟 精准站在饮水机出水嘴侧方，面向饮水机龙头
    getTargetPos: (s) => ({ x: 24.2 * s, y: 15.2 * s }),
    steps: [
      {
        speakerId: 'critic_auditor',
        text: '连审三章眼睛都花了，接杯温水润润嗓子~💧',
        duration: 170,
        facing: 'left'
      },
      {
        speakerId: 'critic_auditor',
        text: '休息完毕，回去继续抓AI套话！🔍',
        duration: 110,
        facing: 'up'
      }
    ]
  },
  {
    id: 'director_visits_whiteboard',
    name: '【精确对位】分镜去大白板正前方仰头梳理节奏',
    initiatorId: 'episode_director',
    // 🌟 精准站在白板下方正中央，仰头朝上注视大纲板书
    getTargetPos: (s) => ({ x: 9.25 * s, y: 3.5 * s }),
    steps: [
      {
        speakerId: 'episode_director',
        text: (ctx) => `看看白板：《${ctx.arcTitle || '好的内容'}》会找到愿意停留的人...🐱`,
        duration: 180,
        facing: 'up'
      },
      {
        speakerId: 'episode_director',
        text: (ctx) => `理清了！第 ${ctx.chapterNum} 章情绪曲线要有起伏与高潮钩子！🎬`,
        duration: 120,
        facing: 'up'
      }
    ]
  },
  {
    id: 'reader_relaxes_sofa',
    name: '【闭目推演】剧情监察官在裁决席深度推演因果张力',
    initiatorId: 'wild_reader',
    // 🌟 精准坐入豪华真皮沙发座面正中央
    getTargetPos: (s) => ({ x: 26.5 * s, y: 7.3 * s }),
    steps: [
      {
        speakerId: 'wild_reader',
        text: '坐镇监察席推演本章剧情...因果自洽、战力平衡，看点密度达标！⚖️',
        duration: 180,
        facing: 'down'
      },
      {
        speakerId: 'wild_reader',
        text: '好就是好，不好就是不好！铁面把关商业网文生命线！✨',
        duration: 120,
        facing: 'down'
      }
    ]
  }
];

const TILE_SIZE = 16;
const ZOOM = 2.0; // 🌟 缩小尺寸（由2.6缩小为2.0），人和工位更加精致紧凑，视野开阔
const COLS = 36;
const ROWS = 18;
const V_WIDTH = COLS * TILE_SIZE * ZOOM;   // 1152px
const V_HEIGHT = ROWS * TILE_SIZE * ZOOM; // 576px

const ASSET_PATHS: Record<string, string> = {
  floor_dark: '/pixel-agents/floors/floor_7.png',
  floor_light: '/pixel-agents/floors/floor_1.png',
  carpet: '/pixel-agents/carpets/carpet_0.png',
  desk: '/pixel-agents/furniture/DESK/DESK_FRONT.png',
  table_front: '/pixel-agents/furniture/TABLE_FRONT/TABLE_FRONT.png',
  small_table_front: '/pixel-agents/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png',
  small_table_side: '/pixel-agents/furniture/SMALL_TABLE/SMALL_TABLE_SIDE.png',
  pc_off: '/pixel-agents/furniture/PC/PC_FRONT_OFF.png',
  pc_on_1: '/pixel-agents/furniture/PC/PC_FRONT_ON_1.png',
  pc_on_2: '/pixel-agents/furniture/PC/PC_FRONT_ON_2.png',
  pc_on_3: '/pixel-agents/furniture/PC/PC_FRONT_ON_3.png',
  pc_side: '/pixel-agents/furniture/PC/PC_SIDE.png',
  chair_front: '/pixel-agents/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',
  chair_back: '/pixel-agents/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png',
  chair_side: '/pixel-agents/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png',
  bench: '/pixel-agents/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png',
  whiteboard: '/pixel-agents/furniture/WHITEBOARD/WHITEBOARD.png',
  bookshelf: '/pixel-agents/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png',
  sofa_front: '/pixel-agents/furniture/SOFA/SOFA_FRONT.png',
  sofa_back: '/pixel-agents/furniture/SOFA/SOFA_BACK.png',
  sofa_side: '/pixel-agents/furniture/SOFA/SOFA_SIDE.png',
  coffee_table: '/pixel-agents/furniture/COFFEE_TABLE/COFFEE_TABLE.png',
  coffee: '/pixel-agents/furniture/COFFEE/COFFEE.png',
  plant: '/pixel-agents/furniture/PLANT/PLANT.png',
  plant_2: '/pixel-agents/furniture/PLANT_2/PLANT_2.png',
  hanging_plant: '/pixel-agents/furniture/HANGING_PLANT/HANGING_PLANT.png',
  large_painting: '/pixel-agents/furniture/LARGE_PAINTING/LARGE_PAINTING.png',
  small_painting: '/pixel-agents/furniture/SMALL_PAINTING/SMALL_PAINTING.png',
  small_painting_2: '/pixel-agents/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png',
  clock: '/pixel-agents/furniture/CLOCK/CLOCK.png',
  bin: '/pixel-agents/furniture/BIN/BIN.png',
  cactus: '/pixel-agents/furniture/CACTUS/CACTUS.png',
  large_plant: '/pixel-agents/furniture/LARGE_PLANT/LARGE_PLANT.png',
  char_0: '/pixel-agents/characters/char_0.png',
  char_1: '/pixel-agents/characters/char_1.png',
  char_2: '/pixel-agents/characters/char_2.png',
  char_3: '/pixel-agents/characters/char_3.png',
  char_4: '/pixel-agents/characters/char_4.png',
  char_5: '/pixel-agents/characters/char_5.png',
};

// 🌟 全局单例缓存资产与静态背景，实现 0ms 瞬间打开与 0 内存抖动
let globalCachedAssets: Record<string, HTMLImageElement> | null = null;
let globalAssetLoadingPromise: Promise<Record<string, HTMLImageElement>> | null = null;
let globalCachedBgCanvas: HTMLCanvasElement | null = null;
let globalCachedBgDpr: number = 0;

export const preloadOfficeAssets = (): Promise<Record<string, HTMLImageElement>> => {
  if (globalCachedAssets) return Promise.resolve(globalCachedAssets);
  if (globalAssetLoadingPromise) return globalAssetLoadingPromise;

  globalAssetLoadingPromise = new Promise((resolve) => {
    let loadedCount = 0;
    const totalCount = Object.keys(ASSET_PATHS).length;
    const loadedImages: Record<string, HTMLImageElement> = {};

    Object.entries(ASSET_PATHS).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      const onDone = () => {
        loadedImages[key] = img;
        loadedCount++;
        if (loadedCount === totalCount) {
          globalCachedAssets = loadedImages;
          resolve(loadedImages);
        }
      };
      img.onload = onDone;
      img.onerror = () => {
        console.warn(`[PixelAgentsOffice] Failed to load asset: ${url}`);
        onDone();
      };
    });
  });

  return globalAssetLoadingPromise;
};

if (typeof window !== 'undefined') {
  preloadOfficeAssets();
}

// 🌟 实体物理碰撞判定器：将所有办公桌、电脑、沙发群、茶几、隔墙、书架与电器视为绝对不可通行的物理障碍物
export const isOfficeTileObstacle = (
  col: number,
  row: number,
  allowSeat?: { col: number; row: number }
): boolean => {
  // 1. 地图边界约束（上方行 0..2 为建筑实心深色主墙，不可进入）
  if (col < 1 || col >= COLS - 1) return true;
  if (row < 3 || row >= ROWS - 1) return true;

  // 若当前 tile 为角色被允许就坐的目标席位（例如野生读者坐在指定沙发座垫上），允许通行该单元格
  if (
    allowSeat &&
    Math.abs(col - allowSeat.col) <= 0.65 &&
    Math.abs(row - allowSeat.row) <= 0.65
  ) {
    return false;
  }

  // 2. 实体隔墙 (col 18~19) 与 2.5D 拱形门洞 (row 7~11)
  if (col === 18 || col === 19) {
    // 门洞所在行为 7, 8, 9, 10, 11 (通行高度 5 个格子，开阔通畅)
    if (row < 7 || row > 11) {
      return true; // 墙体实心不可穿越
    }
  }

  // 3. --- 左室研发大厅实体障碍物 ---
  // 3.1 弧光分镜办公桌 (deskCol: 3.2, deskRow: 4.8): 占据 col 3..5, row 5..6
  if (col >= 3 && col <= 5 && row >= 5 && row <= 6) return true;

  // 3.2 对抗责编办公桌 (deskCol: 11.2, deskRow: 4.8): 占据 col 11..13, row 5..6
  if (col >= 11 && col <= 13 && row >= 5 && row <= 6) return true;

  // 3.3 动词写手办公桌 (deskCol: 3.2, deskRow: 10.8): 占据 col 3..5, row 11..12
  if (col >= 3 && col <= 5 && row >= 11 && row <= 12) return true;

  // 3.4 档案官办公桌 (deskCol: 11.2, deskRow: 10.8): 占据 col 11..13, row 11..12
  if (col >= 11 && col <= 13 && row >= 11 && row <= 12) return true;

  // 3.5 边侧绿植、长凳与纸篓
  if (col === 1 && (row === 11 || row === 12 || row === 14 || row === 15)) return true;
  if (col === 1 && row === 8) return true;

  // 3.6 左室立式大白板 (col 15..16, row 5..6)
  if (col >= 15 && col <= 16 && row >= 5 && row <= 6) return true;

  // 4. --- 右室高管独立套间、会客沙龙与水吧实体障碍物 ---
  // 4.1 总策划高管豪华大桌 (deskCol: 24.5, deskRow: 3.6): 占据 col 24..27, row 4..5
  if (col >= 24 && col <= 27 && row >= 4 && row <= 5) return true;

  // 4.2 高管书架与大型绿植盆栽: 靠右侧墙 col 32..34, row 3..4 及 col 22, row 5
  if (col >= 32 && col <= 34 && row >= 3 && row <= 4) return true;
  if (col === 22 && row === 5) return true;

  // 4.3 4-沙发会客沙龙实体群（物理实体绝对不可踩踏与穿透）
  // 上方双人沙发 (sofa_front): col 25..27, row 7 (读者坐席在其中，非允许席位时严禁踩踏)
  if (col >= 25 && col <= 27 && row === 7) return true;

  // 中央咖啡茶几 (coffee_table): col 25..27, row 8..9
  if (col >= 25 && col <= 27 && row >= 8 && row <= 9) return true;

  // 左单人沙发 (sofa_side): col 23..24, row 8..9
  if (col >= 23 && col <= 24 && row >= 8 && row <= 9) return true;

  // 右单人沙发 (sofa_side): col 29..31, row 8..9
  if (col >= 29 && col <= 31 && row >= 8 && row <= 9) return true;

  // 下方双人沙发 (sofa_back): col 25..27, row 10..11
  if (col >= 25 && col <= 27 && row >= 10 && row <= 11) return true;

  // 落地台灯: col 32..33, row 9..10
  if (col >= 32 && col <= 33 && row >= 9 && row <= 10) return true;

  // 4.4 棋盘格水吧立式饮水机: col 22..23, row 14..15
  if (col >= 22 && col <= 23 && row >= 14 && row <= 15) return true;

  // 4.5 棋盘格水吧实木咖啡吧台柜: col 29..31, row 14..15
  if (col >= 29 && col <= 31 && row >= 14 && row <= 15) return true;

  // 4.6 棋盘格水吧全自动零食饮料售货机: col 33..34, row 14..16
  if (col >= 33 && col <= 34 && row >= 14 && row <= 16) return true;

  // 4.7 棋盘格水吧休闲高圆桌与吧台凳: col 26..27, row 15..16
  if (col >= 26 && col <= 27 && row >= 15 && row <= 16) return true;

  return false;
};

// 🌟 辅助：寻找最近的安全可通行单元格
const findNearestWalkableTile = (
  targetCol: number,
  targetRow: number,
  allowSeat?: { col: number; row: number }
): { col: number; row: number } => {
  const c = Math.max(1, Math.min(COLS - 2, Math.round(targetCol)));
  const r = Math.max(3, Math.min(ROWS - 2, Math.round(targetRow)));

  if (!isOfficeTileObstacle(c, r, allowSeat)) {
    return { col: c, row: r };
  }

  let bestDist = Infinity;
  let best = { col: c, row: r };
  for (let rad = 1; rad <= 3; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc >= 1 && nc < COLS - 1 && nr >= 3 && nr < ROWS - 1) {
          if (!isOfficeTileObstacle(nc, nr, allowSeat)) {
            const dist = Math.hypot(dc, dr);
            if (dist < bestDist) {
              bestDist = dist;
              best = { col: nc, row: nr };
            }
          }
        }
      }
    }
    if (bestDist < Infinity) break;
  }
  return best;
};

interface AStarNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent?: AStarNode;
}

// 🌟 A* 网格寻路算法：在 36x18 物理网格中搜索严格绕开障碍物的最短路径
const findGridAStarPath = (
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  allowSeat?: { col: number; row: number }
): Array<{ col: number; row: number }> => {
  const start = findNearestWalkableTile(startCol, startRow, allowSeat);
  const end = findNearestWalkableTile(endCol, endRow, allowSeat);

  if (start.col === end.col && start.row === end.row) {
    return [start];
  }

  const openList: AStarNode[] = [];
  const closedSet = new Uint8Array(COLS * ROWS);

  const startNode: AStarNode = {
    col: start.col,
    row: start.row,
    g: 0,
    h: Math.hypot(start.col - end.col, start.row - end.row),
    f: Math.hypot(start.col - end.col, start.row - end.row)
  };
  openList.push(startNode);

  // 8 方向移动偏移量
  const DIRS = [
    { dc: 0, dr: -1, cost: 1.0 },
    { dc: 0, dr: 1, cost: 1.0 },
    { dc: -1, dr: 0, cost: 1.0 },
    { dc: 1, dr: 0, cost: 1.0 },
    { dc: -1, dr: -1, cost: 1.414 },
    { dc: 1, dr: -1, cost: 1.414 },
    { dc: -1, dr: 1, cost: 1.414 },
    { dc: 1, dr: 1, cost: 1.414 }
  ];

  let iterations = 0;
  const maxIterations = 2000;

  while (openList.length > 0 && iterations++ < maxIterations) {
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) {
        bestIdx = i;
      }
    }
    const current = openList.splice(bestIdx, 1)[0];

    if (current.col === end.col && current.row === end.row) {
      const path: Array<{ col: number; row: number }> = [];
      let curr: AStarNode | undefined = current;
      while (curr) {
        path.unshift({ col: curr.col, row: curr.row });
        curr = curr.parent;
      }
      return path;
    }

    const key = current.row * COLS + current.col;
    closedSet[key] = 1;

    for (const dir of DIRS) {
      const nCol = current.col + dir.dc;
      const nRow = current.row + dir.dr;

      if (nCol < 1 || nCol >= COLS - 1 || nRow < 3 || nRow >= ROWS - 1) continue;
      if (closedSet[nRow * COLS + nCol]) continue;

      // 障碍物不可通行
      if (isOfficeTileObstacle(nCol, nRow, allowSeat)) continue;

      // 斜向移动安全防穿角：若斜切时相邻的正交格子有障碍物，严禁穿角！
      if (dir.dc !== 0 && dir.dr !== 0) {
        if (
          isOfficeTileObstacle(current.col + dir.dc, current.row, allowSeat) ||
          isOfficeTileObstacle(current.col, current.row + dir.dr, allowSeat)
        ) {
          continue;
        }
      }

      const tentativeG = current.g + dir.cost;
      const existing = openList.find(n => n.col === nCol && n.row === nRow);

      if (!existing) {
        const h = Math.hypot(nCol - end.col, nRow - end.row);
        openList.push({
          col: nCol,
          row: nRow,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current
        });
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + existing.h;
        existing.parent = current;
      }
    }
  }

  return [start, end];
};

// 🌟 射线碰撞检测 (Line-of-Sight Raycasting)：检查两点直线之间是否会穿透或擦碰任何障碍物
const hasLineOfSight = (
  p1: Waypoint,
  p2: Waypoint,
  s: number,
  allowSeat?: { col: number; row: number }
): boolean => {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (dist < 4) return true;

  const stepSize = s * 0.25; // 8px 高精度采样步长
  const numSteps = Math.ceil(dist / stepSize);
  const clearance = 0.28;   // 角色物理身形碰撞外壳半径（以 tile 宽度计）

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const px = p1.x + (p2.x - p1.x) * t;
    const py = p1.y + (p2.y - p1.y) * t;
    const col = px / s;
    const row = py / s;

    // 检查中心及身形 4 角采样点
    const sampleCols = [col, col - clearance, col + clearance];
    const sampleRows = [row, row - clearance, row + clearance];

    for (const sc of sampleCols) {
      for (const sr of sampleRows) {
        const c = Math.floor(sc);
        const r = Math.floor(sr);
        if (isOfficeTileObstacle(c, r, allowSeat)) {
          return false;
        }
      }
    }
  }

  return true;
};

// 🌟 路径平滑 (String Pulling)：消除网格折线锯齿，形成开阔走廊的自然平滑步态
const smoothWaypoints = (
  rawPoints: Waypoint[],
  s: number,
  allowSeat?: { col: number; row: number }
): Waypoint[] => {
  if (rawPoints.length <= 2) return rawPoints;

  const smoothed: Waypoint[] = [rawPoints[0]];
  let currentIdx = 0;

  while (currentIdx < rawPoints.length - 1) {
    let furthestIdx = currentIdx + 1;
    for (let testIdx = rawPoints.length - 1; testIdx > currentIdx + 1; testIdx--) {
      if (hasLineOfSight(rawPoints[currentIdx], rawPoints[testIdx], s, allowSeat)) {
        furthestIdx = testIdx;
        break;
      }
    }
    smoothed.push(rawPoints[furthestIdx]);
    currentIdx = furthestIdx;
  }

  return smoothed;
};

// 🌟 真实物理碰撞避障寻路规划器：绝不穿透办公桌、电脑、椅子、沙发或茶几
const planCollisionFreePath = (
  fromX: number,
  fromY: number,
  destX: number,
  destY: number,
  s: number,
  allowSeat?: { col: number; row: number }
): Waypoint[] => {
  const startPt: Waypoint = { x: fromX, y: fromY };
  const destPt: Waypoint = { x: destX, y: destY };

  // 1. 若起点到终点直线无任何物理碰撞，直接平滑直达
  if (hasLineOfSight(startPt, destPt, s, allowSeat)) {
    return [destPt];
  }

  // 2. 否则基于 2D 物理碰撞网格运行 A* 算法，绝对绕开障碍物
  const startCol = fromX / s;
  const startRow = fromY / s;
  const endCol = destX / s;
  const endRow = destY / s;

  const gridPath = findGridAStarPath(startCol, startRow, endCol, endRow, allowSeat);

  // 3. 将网格节点映射为世界像素坐标
  const waypoints: Waypoint[] = [startPt];
  for (let i = 1; i < gridPath.length - 1; i++) {
    waypoints.push({
      x: (gridPath[i].col + 0.5) * s,
      y: (gridPath[i].row + 0.5) * s
    });
  }
  waypoints.push(destPt);

  // 4. 进行视线平滑，消除网格锯齿拐角
  const smoothed = smoothWaypoints(waypoints, s, allowSeat);

  if (smoothed.length > 1 && Math.hypot(smoothed[0].x - fromX, smoothed[0].y - fromY) < 2) {
    smoothed.shift();
  }

  return smoothed;
};

// 🌟 真实双套间物理防穿模寻路导航
const navigateTo = (ch: CharacterState, destX: number, destY: number, s: number) => {
  if (Math.hypot(destX - ch.x, destY - ch.y) < 4) {
    ch.waypoints = [];
    ch.targetX = destX;
    ch.targetY = destY;
    return;
  }

  const ws = AGENT_WORKSTATIONS[ch.id];
  const isTargetChair = ws && Math.abs(destX - ws.chairCol * s) < 8 && Math.abs(destY - ws.chairRow * s) < 8;
  const allowSeat = isTargetChair
    ? { col: ws.chairCol, row: ws.chairRow }
    : (ch.id === 'wild_reader' ? { col: 26.5, row: 7.3 } : undefined);

  const waypoints = planCollisionFreePath(ch.x, ch.y, destX, destY, s, allowSeat);
  ch.waypoints = waypoints;
  if (waypoints.length > 0) {
    ch.targetX = waypoints[0].x;
    ch.targetY = waypoints[0].y;
  }
};

// 🌟 创建完整双套间离屏背景缓存（左室主研发办公大厅 + 中间实体隔墙门洞 + 右室高管独立套间&4沙发会客沙龙&蓝白棋盘格水吧）
const createStaticBackgroundCanvas = (s: number, dpr: number = 1): HTMLCanvasElement => {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = Math.round(V_WIDTH * dpr);
  bgCanvas.height = Math.round(V_HEIGHT * dpr);
  const ctx = bgCanvas.getContext('2d');
  if (!ctx) return bgCanvas;

  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  const splitX = 18.5 * s;      // 中间隔墙左侧边缘 (列 18.5)
  const wallW = 1.0 * s;        // 隔墙厚度 32px
  const wallRight = splitX + wallW;

  // 1. 上方深灰蓝建筑主墙（带横梁、双层脚线与柱体分割）
  const wallH = 2.85 * s;
  ctx.fillStyle = '#141a29';
  ctx.fillRect(0, 0, V_WIDTH, wallH);

  ctx.fillStyle = '#1c2438';
  ctx.fillRect(0, 0, V_WIDTH, 0.35 * s);
  ctx.fillStyle = '#0f1422';
  ctx.fillRect(0, 0.35 * s - 2, V_WIDTH, 2);
  ctx.fillRect(0, wallH - 3, V_WIDTH, 3);

  // 垂直立柱阴影线条
  ctx.fillStyle = '#182033';
  for (let px = 3.0 * s; px < V_WIDTH; px += 4.0 * s) {
    ctx.fillRect(px, 0.35 * s, 1, wallH - 0.35 * s);
  }

  // 2. 左室地板：深色质感实木拼花地板 (Dark Walnut Wood Planks)
  const floorStartY = wallH;
  const plankH = 0.5 * s;
  for (let py = floorStartY; py < V_HEIGHT; py += plankH) {
    const rowIdx = Math.floor((py - floorStartY) / plankH);
    ctx.fillStyle = (rowIdx % 3 === 0) ? '#241812' : (rowIdx % 3 === 1 ? '#2c1e17' : '#1c130e');
    ctx.fillRect(0, py, splitX, plankH);

    ctx.fillStyle = '#120b08';
    ctx.fillRect(0, py + plankH - 1, splitX, 1);

    const offset = (rowIdx % 2 === 0) ? 0 : s * 1.8;
    for (let x = offset; x < splitX; x += s * 3.6) {
      ctx.fillRect(x, py, 1, plankH);
    }
  }

  // 2.1 左室工位区质感编织地毯 (Modern Navy Area Rugs)
  // 上半排工位 (弧光分镜 & 对抗责编)
  const rug1X = 2.4 * s;
  const rug1Y = 4.2 * s;
  const rug1W = 12.8 * s;
  const rug1H = 3.6 * s;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(rug1X, rug1Y, rug1W, rug1H, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 下半排工位 (动词写手 & 档案官)
  const rug2X = 2.4 * s;
  const rug2Y = 10.2 * s;
  const rug2W = 12.8 * s;
  const rug2H = 3.6 * s;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(rug2X, rug2Y, rug2W, rug2H, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. 右室地板：上半部温润羊绒地毯 (Lounge Rug) + 下半部经典蓝白棋盘格地砖 (Checkered Pantry)
  const pantryStartY = 13.0 * s;

  // 3.1 右室上半部与中部：轻奢暖色地毯
  for (let py = floorStartY; py < pantryStartY; py += plankH) {
    const rowIdx = Math.floor((py - floorStartY) / plankH);
    ctx.fillStyle = (rowIdx % 2 === 0) ? '#2e2019' : '#33231b';
    ctx.fillRect(wallRight, py, V_WIDTH - wallRight, plankH);
    ctx.fillStyle = '#1a100c';
    ctx.fillRect(wallRight, py + plankH - 1, V_WIDTH - wallRight, 1);
  }

  // 3.2 4-沙发会客区专属椭圆豪华主地毯 (Crimson & Gold Rug)
  const rugX = 22.5 * s;
  const rugY = 7.0 * s;
  const rugW = 10.5 * s;
  const rugH = 5.4 * s;
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.roundRect(rugX, rugY, rugW, rugH, 12);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rugX + 2, rugY + 2, rugW - 4, rugH - 4, 10);
  ctx.stroke();
  ctx.fillStyle = '#2f0808';
  ctx.beginPath();
  ctx.roundRect(rugX + 6, rugY + 6, rugW - 12, rugH - 12, 8);
  ctx.fill();

  // 3.3 右室下半部：1:1 复刻参考图标志性【蓝白棋盘格瓷砖】(Blue & White Checkered Pantry Tiles)
  const tileSize = 16 * (ZOOM / 2); // 16px 精致瓷砖单元
  const pantryCols = Math.ceil((V_WIDTH - wallRight) / tileSize);
  const pantryRows = Math.ceil((V_HEIGHT - pantryStartY) / tileSize);

  for (let r = 0; r < pantryRows; r++) {
    for (let c = 0; c < pantryCols; c++) {
      const tx = wallRight + c * tileSize;
      const ty = pantryStartY + r * tileSize;
      if (tx >= V_WIDTH || ty >= V_HEIGHT) continue;
      const isBlue = (r + c) % 2 === 0;
      ctx.fillStyle = isBlue ? '#334863' : '#f8fafc';
      ctx.fillRect(tx, ty, tileSize, tileSize);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx, ty, tileSize, 1);
      ctx.fillRect(tx, ty, 1, tileSize);
    }
  }

  // 棋盘格与上方地毯交接的铝合金压条
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(wallRight, pantryStartY - 2, V_WIDTH - wallRight, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(wallRight, pantryStartY + 1, V_WIDTH - wallRight, 1);

  // 4. 中间实体隔墙与 2.5D 拱形门洞 (Dividing Wall & Doorway Arch)
  const doorTopY = 6.8 * s;
  const doorBottomY = 11.2 * s;

  // 上半部实心墙体
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(splitX, 0, wallW, doorTopY);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(splitX + 2, 0, wallW - 4, doorTopY);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(splitX + wallW - 2, 0, 2, doorTopY);

  // 下半部实心墙体
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(splitX, doorBottomY, wallW, V_HEIGHT - doorBottomY);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(splitX + 2, doorBottomY, wallW - 4, V_HEIGHT - doorBottomY);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(splitX + wallW - 2, doorBottomY, 2, V_HEIGHT - doorBottomY);

  // 门洞门头过梁 (Doorway Lintel)
  ctx.fillStyle = '#451a03';
  ctx.fillRect(splitX - 2, doorTopY - 4, wallW + 4, 6);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(splitX - 1, doorTopY - 3, wallW + 2, 2);

  // 门洞过道地面阴影与门槛
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(splitX, doorTopY, wallW, doorBottomY - doorTopY);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(splitX, doorTopY, 2, doorBottomY - doorTopY);
  ctx.fillRect(splitX + wallW - 2, doorTopY, 2, doorBottomY - doorTopY);

  // 5. 墙面装饰与标志牌
  // 5.1 左室：挂墙大白板 (Mounted Whiteboard)
  const wbX = 5.5 * s;
  const wbY = 0.55 * s;
  const wbW = 7.5 * s;
  const wbH = 2.15 * s;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(wbX - 2, wbY - 2, wbW + 4, wbH + 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(wbX, wbY, wbW, wbH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wbX, wbY, wbW, wbH);

  // 马克笔托槽
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(wbX + 10, wbY + wbH - 4, wbW - 20, 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(wbX + 16, wbY + wbH - 6, 8, 2);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(wbX + 28, wbY + wbH - 6, 8, 2);

  // 板书文字
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('好的内容 会找到愿意停留的人 🐱', wbX + wbW / 2, wbY + 24);
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('⚡ 创作质检研发大厅 · 动词白描 · 设定归档', wbX + wbW / 2, wbY + 44);
  ctx.textAlign = 'start';

  // 5.2 右室：独立高管套间匾额 (Executive Suite Banner) 挂于上方深色墙面
  const bannerW = 9.8 * s;
  const bannerH = 22;
  const bannerX = 23.0 * s;
  const bannerY = 0.65 * s;
  ctx.fillStyle = 'rgba(40, 8, 12, 0.96)';
  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 4);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('⭐ 总编·总策划独立办公室 (EXECUTIVE SUITE)', bannerX + 14, bannerY + 15);

  // 5.3 右室：棋盘格水吧门牌 (Pantry Sign)
  const pantrySignX = 23.5 * s;
  const pantrySignY = pantryStartY + 4;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(pantrySignX, pantrySignY, 8.5 * s, 16, 3);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 8.5px monospace';
  ctx.fillText('☕ 能量茶水吧 (VIP PANTRY & COFFEE)', pantrySignX + 12, pantrySignY + 11.5);

  return bgCanvas;
};

// 🌟 角色工位与席位不可变静态布局配置 (不受 React Fast Refresh / 缓存影响)
export const AGENT_WORKSTATIONS: Record<string, { deskCol: number; deskRow: number; chairCol: number; chairRow: number }> = {
  // 👑 右室高管独立套间 (Executive Suite): 总策划·总编专属豪华大桌
  arc_architect: {
    deskCol: 24.5,
    deskRow: 3.6,
    chairCol: 25.5,
    chairRow: 3.3
  },
  // 🎬 左室研发大厅左上工位: 弧光分镜
  episode_director: {
    deskCol: 3.2,
    deskRow: 4.8,
    chairCol: 4.2,
    chairRow: 4.5
  },
  // 🔍 左室研发大厅右上工位: 对抗责编
  critic_auditor: {
    deskCol: 11.2,
    deskRow: 4.8,
    chairCol: 12.2,
    chairRow: 4.5
  },
  // ✏️ 左室研发大厅左下工位: 动词写手
  prose_writer: {
    deskCol: 3.2,
    deskRow: 10.8,
    chairCol: 4.2,
    chairRow: 10.5
  },
  // 📚 左室研发大厅右下工位: 档案官
  lorekeeper: {
    deskCol: 11.2,
    deskRow: 10.8,
    chairCol: 12.2,
    chairRow: 10.5
  },
  // 🔥 右室会客沙龙: 野生读者 (端坐在豪华红皮沙发正中央)
  wild_reader: {
    deskCol: 25.5,
    deskRow: 7.3,
    chairCol: 26.5,
    chairRow: 7.3
  }
};

export const PixelAgentsOffice: React.FC<PixelAgentsOfficeProps> = ({
  isOpen = true,
  currentArc,
  currentChapterNum,
  agentNodes,
  criticReport,
  wildReaderFeedback,
  agentThoughts,
  isGenerating,
  onSelectAgent,
  selectedAgentKey,
  onOpenWhiteboard,
  onOpenPrinter
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>(globalCachedAssets || {});
  const cachedLampGradRef = useRef<CanvasGradient | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState<boolean>(() => !!globalCachedAssets);
  const sweeperRobotRef = useRef<{
    x: number;
    y: number;
    targetIdx: number;
    speed: number;
    sparkles: Array<{ x: number; y: number; life: number }>;
  }>({
    x: 8.0 * (TILE_SIZE * ZOOM),
    y: 8.8 * (TILE_SIZE * ZOOM),
    targetIdx: 0,
    speed: 0.85,
    sparkles: []
  });

  // 初始化 6 位 Agent（领导有独立办公室、员工分两派、野生读者有专属人物与席位）
  const initialCharacters = useMemo<Record<string, CharacterState>>(() => {
    const s = TILE_SIZE * ZOOM;
    return {
      // 👑 独立高管套间：总策划·总编
      arc_architect: {
        id: 'arc_architect',
        name: '总策划',
        code: 'ARCHITECT',
        title: '总编·大纲架构',
        faction: 'leader',
        charIndex: 0,
        color: '#c084fc',
        isLead: true,
        dualPC: true,
        deskCol: AGENT_WORKSTATIONS.arc_architect.deskCol,
        deskRow: AGENT_WORKSTATIONS.arc_architect.deskRow,
        chairCol: AGENT_WORKSTATIONS.arc_architect.chairCol,
        chairRow: AGENT_WORKSTATIONS.arc_architect.chairRow,
        x: AGENT_WORKSTATIONS.arc_architect.chairCol * s,
        y: AGENT_WORKSTATIONS.arc_architect.chairRow * s,
        targetX: AGENT_WORKSTATIONS.arc_architect.chairCol * s,
        targetY: AGENT_WORKSTATIONS.arc_architect.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.2,
        walkFrame: 0,
        idleTimer: 240,
        bubbleText: '独立办公室就位！故事弧光因果链锁定！👑',
        bubbleTimer: 0
      },
      // 🎬 左室研发大厅：弧光分镜 (左上工位)
      episode_director: {
        id: 'episode_director',
        name: '弧光分镜',
        code: 'DIRECTOR',
        title: '分镜·节拍师',
        faction: 'creative',
        charIndex: 1,
        color: '#fbbf24',
        isLead: false,
        dualPC: false,
        deskCol: AGENT_WORKSTATIONS.episode_director.deskCol,
        deskRow: AGENT_WORKSTATIONS.episode_director.deskRow,
        chairCol: AGENT_WORKSTATIONS.episode_director.chairCol,
        chairRow: AGENT_WORKSTATIONS.episode_director.chairRow,
        x: AGENT_WORKSTATIONS.episode_director.chairCol * s,
        y: AGENT_WORKSTATIONS.episode_director.chairRow * s,
        targetX: AGENT_WORKSTATIONS.episode_director.chairCol * s,
        targetY: AGENT_WORKSTATIONS.episode_director.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.2,
        walkFrame: 0,
        idleTimer: 520,
        bubbleText: '分镜定格完毕，创作派开工！🎬',
        bubbleTimer: 0
      },
      // 🔍 左室研发大厅：对抗责编 (右上工位)
      critic_auditor: {
        id: 'critic_auditor',
        name: '对抗责编',
        code: 'CRITIC',
        title: '主审·质检官',
        faction: 'quality',
        charIndex: 3,
        color: '#fb7185',
        isLead: true,
        dualPC: false,
        deskCol: AGENT_WORKSTATIONS.critic_auditor.deskCol,
        deskRow: AGENT_WORKSTATIONS.critic_auditor.deskRow,
        chairCol: AGENT_WORKSTATIONS.critic_auditor.chairCol,
        chairRow: AGENT_WORKSTATIONS.critic_auditor.chairRow,
        x: AGENT_WORKSTATIONS.critic_auditor.chairCol * s,
        y: AGENT_WORKSTATIONS.critic_auditor.chairRow * s,
        targetX: AGENT_WORKSTATIONS.critic_auditor.chairCol * s,
        targetY: AGENT_WORKSTATIONS.critic_auditor.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.0,
        walkFrame: 0,
        idleTimer: 380,
        bubbleText: '红笔在手，风控派严查13类AI套话！🔍',
        bubbleTimer: 0
      },
      // ✏️ 左室研发大厅：动词写手 (左下工位)
      prose_writer: {
        id: 'prose_writer',
        name: '动词写手',
        code: 'WRITER',
        title: '正文·主笔',
        faction: 'creative',
        charIndex: 2,
        color: '#38bdf8',
        isLead: false,
        dualPC: false,
        deskCol: AGENT_WORKSTATIONS.prose_writer.deskCol,
        deskRow: AGENT_WORKSTATIONS.prose_writer.deskRow,
        chairCol: AGENT_WORKSTATIONS.prose_writer.chairCol,
        chairRow: AGENT_WORKSTATIONS.prose_writer.chairRow,
        x: AGENT_WORKSTATIONS.prose_writer.chairCol * s,
        y: AGENT_WORKSTATIONS.prose_writer.chairRow * s,
        targetX: AGENT_WORKSTATIONS.prose_writer.chairCol * s,
        targetY: AGENT_WORKSTATIONS.prose_writer.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.4,
        walkFrame: 0,
        idleTimer: 660,
        bubbleText: '动词白描全速狂飙！字字见实效！✏️',
        bubbleTimer: 0
      },
      // 📚 左室研发大厅：档案官 (右下工位)
      lorekeeper: {
        id: 'lorekeeper',
        name: '档案官',
        code: 'LOREKEEPER',
        title: '设定·世界线',
        faction: 'quality',
        charIndex: 4,
        color: '#34d399',
        isLead: false,
        dualPC: false,
        deskCol: AGENT_WORKSTATIONS.lorekeeper.deskCol,
        deskRow: AGENT_WORKSTATIONS.lorekeeper.deskRow,
        chairCol: AGENT_WORKSTATIONS.lorekeeper.chairCol,
        chairRow: AGENT_WORKSTATIONS.lorekeeper.chairRow,
        x: AGENT_WORKSTATIONS.lorekeeper.chairCol * s,
        y: AGENT_WORKSTATIONS.lorekeeper.chairRow * s,
        targetX: AGENT_WORKSTATIONS.lorekeeper.chairCol * s,
        targetY: AGENT_WORKSTATIONS.lorekeeper.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.0,
        walkFrame: 0,
        idleTimer: 800,
        bubbleText: '世界线闭环，全书设定安全归档！📚',
        bubbleTimer: 0
      },
      // ⚖️ 右室专属督导沙龙：剧情监察官 (独立监察席位)
      wild_reader: {
        id: 'wild_reader',
        name: '剧情监察官',
        code: 'SUPERVISOR',
        title: '首席·因果与看点裁决',
        faction: 'reader',
        charIndex: 5,
        color: '#f97316',
        isLead: false,
        dualPC: false,
        deskCol: AGENT_WORKSTATIONS.wild_reader.deskCol,
        deskRow: AGENT_WORKSTATIONS.wild_reader.deskRow,
        chairCol: AGENT_WORKSTATIONS.wild_reader.chairCol,
        chairRow: AGENT_WORKSTATIONS.wild_reader.chairRow,
        x: AGENT_WORKSTATIONS.wild_reader.chairCol * s,
        y: AGENT_WORKSTATIONS.wild_reader.chairRow * s,
        targetX: AGENT_WORKSTATIONS.wild_reader.chairCol * s,
        targetY: AGENT_WORKSTATIONS.wild_reader.chairRow * s,
        waypoints: [],
        facing: 'down',
        state: 'reading',
        speed: 2.3,
        walkFrame: 0,
        idleTimer: 300,
        bubbleText: '铁面无私，公事公办！好就是好，不好就是不好！⚖️',
        bubbleTimer: 0
      }
    };
  }, []);

  const charsRef = useRef<Record<string, CharacterState>>(initialCharacters);

  // 🌟 核心强制同步：无论组件是否被 HMR 缓存保留，只要打开或挂载，强行将所有工位与角色坐标对齐到最新 AGENT_WORKSTATIONS
  useEffect(() => {
    const chars = charsRef.current;
    const s = TILE_SIZE * ZOOM;
    Object.keys(AGENT_WORKSTATIONS).forEach(id => {
      const ws = AGENT_WORKSTATIONS[id];
      if (chars[id]) {
        chars[id].deskCol = ws.deskCol;
        chars[id].deskRow = ws.deskRow;
        chars[id].chairCol = ws.chairCol;
        chars[id].chairRow = ws.chairRow;
        if (chars[id].waypoints.length === 0 && chars[id].state !== 'walking') {
          chars[id].x = ws.chairCol * s;
          chars[id].y = ws.chairRow * s;
          chars[id].targetX = ws.chairCol * s;
          chars[id].targetY = ws.chairRow * s;
          chars[id].facing = 'down';
        }
      }
    });
  }, [isOpen]);
  const activeInteractionRef = useRef<ActiveInteraction | null>(null);
  const interactionCooldownRef = useRef<number>(120); // 2秒后开始第一次自主互动

  // 🌟 使用 Ref 实时追踪最新章节号、大事件、责编报告及野生读者反馈与 Agent 节点
  const currentChapterNumRef = useRef<number>(currentChapterNum);
  const currentArcRef = useRef<StoryArc | null>(currentArc);
  const criticReportRef = useRef<CriticReport | null>(criticReport);
  const wildReaderFeedbackRef = useRef<WildReaderFeedback | null | undefined>(wildReaderFeedback);
  const agentNodesRef = useRef<Record<string, AgentNodeState>>(agentNodes);
  const selectedAgentKeyRef = useRef<string | null | undefined>(selectedAgentKey);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    currentChapterNumRef.current = currentChapterNum;
  }, [currentChapterNum]);

  useEffect(() => {
    currentArcRef.current = currentArc;
  }, [currentArc]);

  useEffect(() => {
    criticReportRef.current = criticReport;
  }, [criticReport]);

  useEffect(() => {
    agentNodesRef.current = agentNodes;
  }, [agentNodes]);

  useEffect(() => {
    selectedAgentKeyRef.current = selectedAgentKey;
  }, [selectedAgentKey]);

  useEffect(() => {
    wildReaderFeedbackRef.current = wildReaderFeedback;
    if (wildReaderFeedback) {
      const chars = charsRef.current;
      const reader = chars.wild_reader;
      if (reader) {
        const bullet = wildReaderFeedback.bulletComments?.[0] || wildReaderFeedback.oneLineVerdict;
        if (bullet) {
          reader.bubbleText = `⚖️ 监察：${bullet.slice(0, 36)}${bullet.length > 36 ? '...' : ''}`;
          reader.bubbleTimer = 300;
        }
      }
    }
  }, [wildReaderFeedback]);

  // 启动特定或随机员工互动
  const startOfficeInteraction = useCallback((scenarioId?: string) => {
    if (activeInteractionRef.current) return false;
    const chars = charsRef.current;
    const s = TILE_SIZE * ZOOM;

    let available = INTERACTION_SCENARIOS.filter(sc => {
      const initFree = agentNodes[sc.initiatorId]?.status !== 'running' && chars[sc.initiatorId]?.waypoints.length === 0;
      const targetFree = !sc.targetId || (agentNodes[sc.targetId]?.status !== 'running' && chars[sc.targetId]?.waypoints.length === 0);
      return initFree && targetFree;
    });

    if (scenarioId) {
      const found = available.find(sc => sc.id === scenarioId);
      if (found) {
        available = [found];
      }
    }

    if (available.length === 0) return false;

    const chosen = available[Math.floor(Math.random() * available.length)];
    const targetPos = chosen.getTargetPos(s, chars);

    activeInteractionRef.current = {
      scenario: chosen,
      stage: 'walking_to',
      stepIndex: 0,
      stepTimer: 0
    };

    const initiator = chars[chosen.initiatorId];
    if (initiator) {
      navigateTo(initiator, targetPos.x, targetPos.y, s);
    }
    return true;
  }, [agentNodes]);

  // 1. 预加载图片资产 (直接利用全局缓存，0 延迟瞬发)
  useEffect(() => {
    if (globalCachedAssets) {
      imagesRef.current = globalCachedAssets;
      setAssetsLoaded(true);
      return;
    }
    preloadOfficeAssets().then((loaded) => {
      imagesRef.current = loaded;
      setAssetsLoaded(true);
    });
  }, []);

  // 2. 流水线交接互动走动与野生读者反馈
  useEffect(() => {
    const chars = charsRef.current;
    const s = TILE_SIZE * ZOOM;
    const walkwayY = 8.8 * s;

    // 领导·总策划
    if (agentNodes.arc_architect?.status === 'running') {
      navigateTo(chars.arc_architect, chars.arc_architect.chairCol * s, chars.arc_architect.chairRow * s, s);
      chars.arc_architect.bubbleText = `总编室推演第 ${currentChapterNum} 章大事件因果线...👑`;
      chars.arc_architect.bubbleTimer = 240;
    } else if (agentNodes.arc_architect?.status === 'done' && agentNodes.episode_director?.status === 'running') {
      navigateTo(chars.arc_architect, 8.5 * s, walkwayY, s);
      chars.arc_architect.bubbleText = '大纲因果锁定！创作派分镜接单！';
      chars.arc_architect.bubbleTimer = 220;
    }

    // 创作派·分镜
    if (agentNodes.episode_director?.status === 'running') {
      navigateTo(chars.episode_director, chars.episode_director.chairCol * s, chars.episode_director.chairRow * s, s);
      chars.episode_director.bubbleText = '拆解分章节拍，创作派拒绝假高潮！🎬';
      chars.episode_director.bubbleTimer = 240;
    } else if (agentNodes.episode_director?.status === 'done' && agentNodes.prose_writer?.status === 'running') {
      navigateTo(chars.episode_director, (chars.prose_writer.chairCol + 1.5) * s, walkwayY, s);
      chars.episode_director.bubbleText = '分镜节拍定格，写手老师速速狂飙！';
      chars.episode_director.bubbleTimer = 220;
    }

    // 创作派·写手
    if (agentNodes.prose_writer?.status === 'running') {
      navigateTo(chars.prose_writer, chars.prose_writer.chairCol * s, chars.prose_writer.chairRow * s, s);
      chars.prose_writer.bubbleText = '键盘冒火中！创作派动词立人！✏️';
      chars.prose_writer.bubbleTimer = 260;
    } else if (agentNodes.prose_writer?.status === 'done' && agentNodes.critic_auditor?.status === 'running') {
      navigateTo(chars.prose_writer, (chars.critic_auditor.chairCol - 1.5) * s, walkwayY, s);
      chars.prose_writer.bubbleText = '初稿出炉，送质检风控派审阅！';
      chars.prose_writer.bubbleTimer = 220;
    }

    // 质检风控派·责编
    if (agentNodes.critic_auditor?.status === 'running') {
      navigateTo(chars.critic_auditor, chars.critic_auditor.chairCol * s, chars.critic_auditor.chairRow * s, s);
      chars.critic_auditor.bubbleText = '风控红笔启动！严查13类AI套话...🔍';
      chars.critic_auditor.bubbleTimer = 240;
    } else if (agentNodes.critic_auditor?.status === 'retry') {
      navigateTo(chars.critic_auditor, (chars.prose_writer.chairCol + 2.5) * s, walkwayY, s);
      chars.critic_auditor.bubbleText = `抓到套话，评分 ${criticReport?.score || 60}分，打回创作派重写！`;
      chars.critic_auditor.bubbleTimer = 260;
      chars.prose_writer.bubbleText = '收到修改意见，创作派火速重修！';
      chars.prose_writer.bubbleTimer = 220;
    } else if (agentNodes.critic_auditor?.status === 'done' && agentNodes.lorekeeper?.status === 'running') {
      chars.critic_auditor.bubbleText = `风控质检通过！评分 ${criticReport?.score || 90}分，准予入库！`;
      chars.critic_auditor.bubbleTimer = 200;
      navigateTo(chars.critic_auditor, (chars.lorekeeper.chairCol - 1.5) * s, walkwayY, s);
      chars.lorekeeper.bubbleText = '世界线落盘中，大事件归档！📚';
      chars.lorekeeper.bubbleTimer = 240;
    }

    // 质检风控派·档案官
    if (agentNodes.lorekeeper?.status === 'done') {
      navigateTo(chars.lorekeeper, chars.lorekeeper.chairCol * s, chars.lorekeeper.chairRow * s, s);
      chars.lorekeeper.bubbleText = '全书设定与进度已安全归档入库！📚';
      chars.lorekeeper.bubbleTimer = 220;
    }

    // ⚖️ 剧情监察官席位
    if (agentNodes.wild_reader?.status === 'running') {
      navigateTo(chars.wild_reader, chars.wild_reader.chairCol * s, chars.wild_reader.chairRow * s, s);
      chars.wild_reader.bubbleText = '正在冷峻审读！严查战力逻辑与看点密度...⚖️';
      chars.wild_reader.bubbleTimer = 260;
    } else if (agentNodes.wild_reader?.status === 'veto') {
      chars.wild_reader.bubbleText = '🚨 触发一票否决！已上报总策划二阶自愈重构！';
      chars.wild_reader.bubbleTimer = 320;
    } else if (agentNodes.wild_reader?.status === 'done') {
      if (wildReaderFeedbackRef.current?.vetoTriggered) {
        chars.wild_reader.bubbleText = '⚠️ 经总策划二阶自愈重修，终审通过！';
      } else {
        const bullet = wildReaderFeedbackRef.current?.bulletComments?.[0] || wildReaderFeedbackRef.current?.oneLineVerdict;
        if (bullet) {
          chars.wild_reader.bubbleText = `⚖️ 监察裁决：${bullet.slice(0, 36)}${bullet.length > 36 ? '...' : ''}`;
        } else {
          chars.wild_reader.bubbleText = '监察完毕！因果自洽，张力达标，准予放行！👍';
        }
      }
      chars.wild_reader.bubbleTimer = 280;
    }
  }, [agentNodes, currentChapterNum, criticReport]);

  // 2.1 实时透传大模型各 Agent 真实 Thought 流
  useEffect(() => {
    if (!agentThoughts || agentThoughts.length === 0) return;
    const latest = agentThoughts[agentThoughts.length - 1];
    if (!latest || !latest.thought) return;

    const chars = charsRef.current;
    const ch = chars[latest.agent];
    if (ch) {
      const cleanThought = latest.thought.replace(/[\r\n]+/g, ' ').trim();
      const displayThought = cleanThought.length > 40 ? cleanThought.substring(0, 40) + '...' : cleanThought;
      ch.bubbleText = displayThought;
      ch.bubbleTimer = 260;
    }
  }, [agentThoughts]);

  // 3. 点击工位或场景互动
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const s = TILE_SIZE * ZOOM;

    // A. 点击挂墙大白板 (col 5.5 to 13.0, row 0.5 to 3.0)
    if (clickX >= 5.5 * s && clickX <= 13.0 * s && clickY >= 0.5 * s && clickY <= 3.0 * s) {
      if (!startOfficeInteraction('director_visits_whiteboard')) {
        if (onOpenWhiteboard) onOpenWhiteboard();
      }
      return;
    }

    // B. 点击棋盘格水吧饮水机 (col 21.5 to 24.5, row 13.5 to 17.5)
    if (clickX >= 21.5 * s && clickX <= 24.5 * s && clickY >= 13.5 * s && clickY <= 17.5 * s) {
      startOfficeInteraction('critic_visits_water');
      return;
    }

    // C. 点击棋盘格水吧咖啡吧台 (col 28.5 to 32.5, row 13.5 to 17.5)
    if (clickX >= 28.5 * s && clickX <= 32.5 * s && clickY >= 13.5 * s && clickY <= 17.5 * s) {
      startOfficeInteraction('writer_visits_coffee');
      return;
    }

    // D. 点击4-沙发会客沙龙与茶几 (col 22.5 to 31.5, row 7.0 to 12.5)
    if (clickX >= 22.5 * s && clickX <= 31.5 * s && clickY >= 7.0 * s && clickY <= 12.5 * s) {
      startOfficeInteraction('reader_relaxes_sofa');
      return;
    }

    // E. 点击中间门洞门禁 (col 18.0 to 20.0, row 6.8 to 11.2)
    if (clickX >= 18.0 * s && clickX <= 20.0 * s && clickY >= 6.8 * s && clickY <= 11.2 * s) {
      startOfficeInteraction('architect_inspects_office');
      return;
    }

    // E. 角色或工位判定
    const chars = charsRef.current;
    let clickedKey: string | null = null;

    Object.values(chars).forEach(c => {
      const ws = AGENT_WORKSTATIONS[c.id] || { deskCol: c.deskCol, deskRow: c.deskRow };
      const deskX = ws.deskCol * s;
      const deskY = ws.deskRow * s;
      const inChar = Math.abs(clickX - c.x) < 26 && Math.abs(clickY - c.y) < 36;
      const inDesk = clickX >= deskX && clickX <= deskX + 48 * ZOOM && clickY >= deskY - 18 && clickY <= deskY + 48 * ZOOM;
      if (inChar || inDesk) {
        clickedKey = c.id;
      }
    });

    if (clickedKey) {
      if (onSelectAgent) onSelectAgent(clickedKey);

      // 根据被点击角色，智能触发其专属互动
      let triggered = false;
      if (clickedKey === 'prose_writer') {
        triggered = startOfficeInteraction('writer_visits_director');
      } else if (clickedKey === 'critic_auditor') {
        triggered = startOfficeInteraction('critic_visits_writer');
      } else if (clickedKey === 'episode_director') {
        triggered = startOfficeInteraction('director_visits_architect');
      } else if (clickedKey === 'lorekeeper') {
        triggered = startOfficeInteraction('lorekeeper_visits_architect');
      } else if (clickedKey === 'arc_architect') {
        triggered = startOfficeInteraction('architect_inspects_office');
      } else if (clickedKey === 'wild_reader') {
        triggered = startOfficeInteraction('reader_visits_writer');
      }

      if (!triggered) {
        const target = chars[clickedKey];
        if (target) {
          target.bubbleTimer = 240;
          const quotes: Record<string, string> = {
            arc_architect: '总策划就位！独立办公室掌控全局故事弧光！👑',
            critic_auditor: '对抗责编在此！风控红笔严查13类AI套话！🔍',
            episode_director: '分镜导演在岗！创作派单章节奏张弛有度！🎬',
            prose_writer: '写手键盘滚烫！动词白描，全速狂飙！✏️',
            lorekeeper: '档案官已落盘！世界线人物档案分毫不差！📚',
            wild_reader: '剧情监察官就位！公事公办，好就是好，不好就是不好！⚖️'
          };
          target.bubbleText = quotes[target.id] || '在！请指示！';
        }
      }
    }
  }, [onSelectAgent, onOpenWhiteboard, startOfficeInteraction]);

  // 4. 2.5D 高精像素画布渲染循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assetsLoaded || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;
    let lastFrameTime = performance.now();
    const TARGET_FPS = 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS - 1;

    const s = TILE_SIZE * ZOOM;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!globalCachedBgCanvas || globalCachedBgDpr !== dpr) {
      globalCachedBgCanvas = createStaticBackgroundCanvas(s, dpr);
      globalCachedBgDpr = dpr;
    }
    const bgCanvas = globalCachedBgCanvas;

    // 支持高分屏 (Retina 2x) 超清高分率绘制，文字和线条丝滑锐利 (仅尺寸变化时重设)
    const targetW = Math.round(V_WIDTH * dpr);
    const targetH = Math.round(V_HEIGHT * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.imageSmoothingEnabled = false;

    let cachedClockTime = new Date();
    let lastClockTick = 0;

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (document.hidden) return; // 标签页不可见时跳过绘制，0% CPU 占用

      const elapsed = now - lastFrameTime;
      if (elapsed < FRAME_INTERVAL) return;
      lastFrameTime = now - (elapsed % FRAME_INTERVAL);

      tick++;

      // 仅每秒 (60帧) 更新一次系统时间，彻底避免每帧 new Date() 内存抖动
      if (tick - lastClockTick >= 60) {
        cachedClockTime = new Date();
        lastClockTick = tick;
      }

      const imgs = imagesRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      // ==============================================================
      // 1. 0.1ms 极速绘制高清预烘焙背景 (墙体、天际线、星空、书架、地板、地毯)
      // ==============================================================
      ctx.drawImage(bgCanvas, 0, 0, V_WIDTH, V_HEIGHT);

      // ==============================================================
      // 2. 动态红色挂钟 (时针、分针与跳动秒针)
      // ==============================================================
      const clockCenterX = 23.3 * s;
      const clockCenterY = 1.25 * s;
      const nowTime = cachedClockTime;
      const secAngle = ((tick % 60) / 60) * Math.PI * 2 - Math.PI / 2;
      const minAngle = (nowTime.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
      const hourAngle = ((nowTime.getHours() % 12 + nowTime.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;

      // 时针
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clockCenterX, clockCenterY);
      ctx.lineTo(clockCenterX + Math.cos(hourAngle) * 7, clockCenterY + Math.sin(hourAngle) * 7);
      ctx.stroke();

      // 分针
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(clockCenterX, clockCenterY);
      ctx.lineTo(clockCenterX + Math.cos(minAngle) * 11, clockCenterY + Math.sin(minAngle) * 11);
      ctx.stroke();

      // 秒针 (红色)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(clockCenterX, clockCenterY);
      ctx.lineTo(clockCenterX + Math.cos(secAngle) * 12, clockCenterY + Math.sin(secAngle) * 12);
      ctx.stroke();

      // 中心圆点
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(clockCenterX, clockCenterY, 2, 0, Math.PI * 2);
      ctx.fill();

      // ==============================================================
      // 3. 动态熟睡橘猫 (带呼吸微动效与飘动 z Z Z)
      // ==============================================================
      const catBreath = Math.sin(tick / 18) * 1.5;
      const catX = 32.8 * s;
      const catY = 2.45 * s + catBreath;

      // 身体 (橘白相间小猫)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(catX + 12, catY + 8, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 白色肚皮与爪子
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(catX + 11, catY + 11, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 头部
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(catX + 22, catY + 6, 6, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 猫耳
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.moveTo(catX + 20, catY);
      ctx.lineTo(catX + 24, catY + 3);
      ctx.lineTo(catX + 18, catY + 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(catX + 25, catY);
      ctx.lineTo(catX + 29, catY + 3);
      ctx.lineTo(catX + 23, catY + 3);
      ctx.fill();

      // 熟睡闭眼 (^ _ ^)
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(catX + 23, catY + 7, 2, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // 卷曲尾巴
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(catX + 2, catY + 9);
      ctx.quadraticCurveTo(catX - 4, catY + 5, catX - 5, catY + 2);
      ctx.stroke();

      // 飘动的 z Z Z
      if (tick % 90 < 60) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('z', catX + 26, catY - 2);
        ctx.fillText('Z', catX + 31, catY - 7);
      }

      // ==============================================================
      // 4. 员工间自主互动系统与就坐稳定性保障 (Office Interactions & Seating)
      // ==============================================================
      const chars = charsRef.current;

      // 4.1 自动触发与状态机步进
      if (!activeInteractionRef.current) {
        if (interactionCooldownRef.current > 0) {
          interactionCooldownRef.current--;
        } else {
          startOfficeInteraction();
          interactionCooldownRef.current = 400 + Math.floor(Math.random() * 300); // 7~12 秒冷却
        }
      } else {
        const active = activeInteractionRef.current;
        const scenario = active.scenario;
        const initiator = chars[scenario.initiatorId];
        const target = scenario.targetId ? chars[scenario.targetId] : null;
        const targetPos = scenario.getTargetPos(s, chars);

        if (active.stage === 'walking_to') {
          const dist = Math.hypot(initiator.x - targetPos.x, initiator.y - targetPos.y);
          if (dist < 8 && initiator.waypoints.length <= 1) {
            initiator.waypoints = [];
            initiator.x = targetPos.x;
            initiator.y = targetPos.y;
            initiator.walkFrame = 0;
            initiator.state = 'reading';
            active.stage = 'talking';
            active.stepIndex = 0;
            const step0 = scenario.steps[0];
            active.stepTimer = step0.duration;

            const speaker = chars[step0.speakerId];
            if (speaker) {
              const textVal = typeof step0.text === 'function'
                ? step0.text({
                    chapterNum: currentChapterNumRef.current,
                    arcTitle: currentArcRef.current?.title,
                    criticReport: criticReportRef.current
                  })
                : step0.text;
              speaker.bubbleText = textVal;
              speaker.bubbleTimer = step0.duration;
            }
            if (step0.facing) initiator.facing = step0.facing;
            if (target && step0.targetFacing) target.facing = step0.targetFacing;
          }
        } else if (active.stage === 'talking') {
          active.stepTimer--;
          if (active.stepTimer <= 0) {
            active.stepIndex++;
            if (active.stepIndex < scenario.steps.length) {
              const nextStep = scenario.steps[active.stepIndex];
              active.stepTimer = nextStep.duration;
              const speaker = chars[nextStep.speakerId];
              if (speaker) {
                const textVal = typeof nextStep.text === 'function'
                  ? nextStep.text({
                      chapterNum: currentChapterNumRef.current,
                      arcTitle: currentArcRef.current?.title,
                      criticReport: criticReportRef.current
                    })
                  : nextStep.text;
                speaker.bubbleText = textVal;
                speaker.bubbleTimer = nextStep.duration;
              }
              if (nextStep.facing) initiator.facing = nextStep.facing;
              if (target && nextStep.targetFacing) target.facing = nextStep.targetFacing;
            } else {
              active.stage = 'walking_back';
              if (target) {
                target.facing = 'down';
              }
              navigateTo(initiator, initiator.chairCol * s, initiator.chairRow * s, s);
            }
          }
        } else if (active.stage === 'walking_back') {
          const chairX = initiator.chairCol * s;
          const chairY = initiator.chairRow * s;
          const dist = Math.hypot(initiator.x - chairX, initiator.y - chairY);
          if (dist < 8 && initiator.waypoints.length <= 1) {
            initiator.waypoints = [];
            initiator.x = chairX;
            initiator.y = chairY;
            initiator.facing = 'down';
            initiator.state = agentNodesRef.current?.[initiator.id]?.status === 'running' ? 'typing' : 'reading';
            activeInteractionRef.current = null;
            interactionCooldownRef.current = 400 + Math.floor(Math.random() * 300);
          }
        }
      }

      // 4.2 全员工位就坐稳定性保障 (Locked Seating Stability)
      Object.values(chars).forEach(ch => {
        const isRunning = agentNodesRef.current?.[ch.id]?.status === 'running';
        const active = activeInteractionRef.current;
        const isInteracting = active && (active.scenario.initiatorId === ch.id || active.scenario.targetId === ch.id);

        // 无论是否运行，若无外发任务且未处于互动中，100% 确保回到工位端坐
        const ws = AGENT_WORKSTATIONS[ch.id] || { deskCol: ch.deskCol, deskRow: ch.deskRow, chairCol: ch.chairCol, chairRow: ch.chairRow };
        ch.chairCol = ws.chairCol;
        ch.chairRow = ws.chairRow;
        ch.deskCol = ws.deskCol;
        ch.deskRow = ws.deskRow;

        if (!isInteracting && ch.waypoints.length === 0) {
          const atDesk = Math.abs(ch.x - ws.chairCol * s) < 4 && Math.abs(ch.y - ws.chairRow * s) < 4;
          if (!atDesk) {
            ch.x = ws.chairCol * s;
            ch.y = ws.chairRow * s;
            ch.targetX = ws.chairCol * s;
            ch.targetY = ws.chairRow * s;
          }
          ch.state = isRunning ? 'typing' : 'reading';
          ch.facing = 'down';
        }
      });

      // ==============================================================
      // 5. Z-Sorting 实体层级深度排序绘制
      // ==============================================================
      interface Drawable {
        zY: number;
        draw: (ctx: CanvasRenderingContext2D) => void;
      }
      const drawables: Drawable[] = [];

      // 5.1 墙面挂画 (右室高管艺术画廊)
      if (imgs.small_painting) {
        drawables.push({
          zY: 2.0 * s,
          draw: (c) => {
            c.drawImage(imgs.small_painting, 0, 0, 16, 32, 23.5 * s, 0.8 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }
      if (imgs.large_painting) {
        drawables.push({
          zY: 2.0 * s,
          draw: (c) => {
            c.drawImage(imgs.large_painting, 0, 0, 32, 32, 27.5 * s, 0.8 * s, 32 * ZOOM, 32 * ZOOM);
          }
        });
      }
      if (imgs.small_painting_2) {
        drawables.push({
          zY: 2.0 * s,
          draw: (c) => {
            c.drawImage(imgs.small_painting_2, 0, 0, 16, 32, 32.5 * s, 0.8 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }

      // 5.2 左室双层大书架 (靠左侧实木墙 col 2.5, row 0.8)
      if (imgs.bookshelf) {
        drawables.push({
          zY: 2.2 * s,
          draw: (c) => {
            c.drawImage(imgs.bookshelf, 0, 0, 32, 32, 2.5 * s, 0.8 * s, 32 * ZOOM, 32 * ZOOM);
          }
        });
      }

      // 5.2.1 挂墙跳动时钟 (col 4.2, row 0.9)
      if (imgs.clock) {
        drawables.push({
          zY: 2.1 * s,
          draw: (c) => {
            const clkX = 4.2 * s;
            const clkY = 0.9 * s;
            c.drawImage(imgs.clock, 0, 0, 16, 16, clkX, clkY, 16 * ZOOM, 16 * ZOOM);
            const secAngle = ((tick % 60) / 60) * Math.PI * 2 - Math.PI / 2;
            c.strokeStyle = '#ef4444';
            c.lineWidth = 1.2;
            c.beginPath();
            c.moveTo(clkX + 8 * ZOOM, clkY + 8 * ZOOM);
            c.lineTo(clkX + 8 * ZOOM + Math.cos(secAngle) * 5 * ZOOM, clkY + 8 * ZOOM + Math.sin(secAngle) * 5 * ZOOM);
            c.stroke();
          }
        });
      }

      // 5.2.2 吊顶悬挂绿植藤蔓 (Ceiling Hanging Plants)
      if (imgs.hanging_plant) {
        drawables.push({
          zY: 1.8 * s,
          draw: (c) => {
            c.drawImage(imgs.hanging_plant, 0, 0, 16, 32, 3.8 * s, 0.3 * s, 16 * ZOOM, 32 * ZOOM);
            c.drawImage(imgs.hanging_plant, 0, 0, 16, 32, 14.5 * s, 0.3 * s, 16 * ZOOM, 32 * ZOOM);
            c.drawImage(imgs.hanging_plant, 0, 0, 16, 32, 21.5 * s, 0.3 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }

      // 5.2.3 左室走廊立式灵感白板 (col 15.6, row 4.8)
      if (imgs.whiteboard) {
        drawables.push({
          zY: 6.2 * s,
          draw: (c) => {
            const wbX = 15.6 * s;
            const wbY = 4.5 * s;
            c.drawImage(imgs.whiteboard, 0, 0, 32, 32, wbX, wbY, 32 * ZOOM, 32 * ZOOM);
            // 贴满彩色灵感便签
            c.fillStyle = '#fef08a'; c.fillRect(wbX + 6 * ZOOM, wbY + 6 * ZOOM, 7 * ZOOM, 5 * ZOOM);
            c.fillStyle = '#f472b6'; c.fillRect(wbX + 16 * ZOOM, wbY + 6 * ZOOM, 7 * ZOOM, 5 * ZOOM);
            c.fillStyle = '#38bdf8'; c.fillRect(wbX + 6 * ZOOM, wbY + 13 * ZOOM, 7 * ZOOM, 5 * ZOOM);
            c.fillStyle = '#4ade80'; c.fillRect(wbX + 16 * ZOOM, wbY + 13 * ZOOM, 7 * ZOOM, 5 * ZOOM);
          }
        });
      }

      // 5.2.4 左室左下角休息长凳与大型阔叶植物 (col 1.2, row 14.2)
      if (imgs.bench) {
        drawables.push({
          zY: 15.5 * s,
          draw: (c) => {
            c.drawImage(imgs.bench, 0, 0, 32, 16, 1.2 * s, 14.6 * s, 32 * ZOOM, 16 * ZOOM);
          }
        });
      }
      if (imgs.large_plant) {
        drawables.push({
          zY: 15.2 * s,
          draw: (c) => {
            c.drawImage(imgs.large_plant, 0, 0, 16, 32, 1.2 * s, 13.0 * s, 18 * ZOOM, 34 * ZOOM);
          }
        });
      }

      // 5.3 绿植与废纸篓
      if (imgs.plant) {
        drawables.push({
          zY: 3.2 * s,
          draw: (c) => {
            c.drawImage(imgs.plant, 0, 0, 16, 32, 1.2 * s, 1.8 * s, 16 * ZOOM, 32 * ZOOM);
            c.drawImage(imgs.plant, 0, 0, 16, 32, 17.5 * s, 1.8 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }
      if (imgs.plant_2) {
        drawables.push({
          zY: 12.0 * s,
          draw: (c) => {
            c.drawImage(imgs.plant_2, 0, 0, 16, 32, 1.5 * s, 11.2 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }
      if (imgs.bin) {
        drawables.push({
          zY: 8.5 * s,
          draw: (c) => {
            c.drawImage(imgs.bin, 0, 0, 16, 16, 1.5 * s, 7.8 * s, 16 * ZOOM, 16 * ZOOM);
          }
        });
      }

      // 5.4 右室总编书架 (靠右侧墙 col 32.5, row 3.2)
      if (imgs.bookshelf) {
        drawables.push({
          zY: 4.5 * s,
          draw: (c) => {
            c.drawImage(imgs.bookshelf, 0, 0, 32, 32, 32.5 * s, 3.2 * s, 28 * ZOOM, 28 * ZOOM);

            // 👑 书架顶部【年度白金总编荣誉金杯】(Golden Platinum Trophy)
            const gx = 33.2 * s;
            const gy = 2.45 * s;
            // 木质底座
            c.fillStyle = '#451a03';
            c.fillRect(gx + 2, gy + 14, 12, 4);
            c.fillStyle = '#fbbf24';
            c.fillRect(gx + 3, gy + 15, 10, 1);
            // 纯金杯身与底座支柱
            c.fillStyle = '#f59e0b';
            c.fillRect(gx + 6, gy + 9, 4, 5);
            c.fillStyle = '#fbbf24';
            c.beginPath();
            c.ellipse(gx + 8, gy + 5, 6, 5, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fef08a';
            c.fillRect(gx + 5, gy + 2, 3, 5);
            // 双耳手柄
            c.strokeStyle = '#f59e0b';
            c.lineWidth = 1.2;
            c.strokeRect(gx, gy + 2, 3, 5);
            c.strokeRect(gx + 13, gy + 2, 3, 5);

            // 周期性金光闪烁
            if ((tick % 45) < 15) {
              const sparkLife = (tick % 45) / 15;
              c.fillStyle = `rgba(255, 255, 255, ${1 - sparkLife})`;
              c.fillRect(gx + 10, gy + 1, 2, 2);
              c.fillRect(gx + 9, gy + 2, 4, 1);
            }
          }
        });
      }

      // 5.4.1 右室高管套间大型龟背竹盆栽 (col 22.0, row 4.8)
      if (imgs.large_plant) {
        drawables.push({
          zY: 5.6 * s,
          draw: (c) => {
            c.drawImage(imgs.large_plant, 0, 0, 16, 32, 22.0 * s, 4.4 * s, 18 * ZOOM, 36 * ZOOM);
          }
        });
      }

      // 5.5 标志性【4-沙发会客休闲套组】(The Iconic 4-Sofa Lounge & Coffee Table from Reference)
      // A. 上方红色双人沙发 (面向下，坐读者)
      if (imgs.sofa_front) {
        drawables.push({
          zY: 8.0 * s,
          draw: (c) => {
            c.drawImage(imgs.sofa_front, 0, 0, 32, 16, 25.5 * s, 7.3 * s, 32 * ZOOM, 16 * ZOOM);
          }
        });
      }

      // B. 左侧单人沙发 (面朝右)
      if (imgs.sofa_side) {
        drawables.push({
          zY: 9.4 * s,
          draw: (c) => {
            c.drawImage(imgs.sofa_side, 0, 0, 16, 32, 23.2 * s, 8.2 * s, 16 * ZOOM, 32 * ZOOM);
          }
        });
      }

      // C. 右侧单人沙发 (水平翻转，面朝左)
      if (imgs.sofa_side) {
        drawables.push({
          zY: 9.4 * s,
          draw: (c) => {
            c.save();
            c.translate(29.8 * s + 16 * ZOOM, 8.2 * s);
            c.scale(-1, 1);
            c.drawImage(imgs.sofa_side, 0, 0, 16, 32, 0, 0, 16 * ZOOM, 32 * ZOOM);
            c.restore();
          }
        });
      }

      // D. 中央咖啡茶几与热咖啡
      if (imgs.coffee_table) {
        drawables.push({
          zY: 9.8 * s,
          draw: (c) => {
            const ctxX = 25.5 * s;
            const ctxY = 8.5 * s;
            c.drawImage(imgs.coffee_table, 0, 0, 32, 32, ctxX, ctxY, 32 * ZOOM, 32 * ZOOM);

            if (imgs.coffee) {
              c.drawImage(imgs.coffee, 0, 0, 16, 16, ctxX + 10 * ZOOM, ctxY + 6 * ZOOM, 12 * ZOOM, 12 * ZOOM);
              const steamY = ctxY + 6 * ZOOM - ((tick % 30) / 30) * 12;
              const steamAlpha = 1 - (tick % 30) / 30;
              c.fillStyle = `rgba(255, 255, 255, ${steamAlpha})`;
              c.fillRect(ctxX + 16 * ZOOM + Math.sin(tick / 6) * 2, steamY, 2, 3);
            }
          }
        });
      }

      // E. 下方红色双人沙发 (背对读者，面朝上)
      if (imgs.sofa_back) {
        drawables.push({
          zY: 11.2 * s,
          draw: (c) => {
            c.drawImage(imgs.sofa_back, 0, 0, 32, 16, 25.5 * s, 10.2 * s, 32 * ZOOM, 16 * ZOOM);
          }
        });
      }

      // F. 沙发旁落地台灯与暖光锥 (col 32.5, row 8.8)
      drawables.push({
        zY: 10.8 * s,
        draw: (c) => {
          const lx = 32.5 * s;
          const ly = 8.8 * s;
          if (!cachedLampGradRef.current) {
            const g = c.createLinearGradient(lx + 8, ly + 14, lx + 8, ly + 80);
            g.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
            g.addColorStop(0.7, 'rgba(254, 240, 138, 0.12)');
            g.addColorStop(1, 'rgba(254, 240, 138, 0.01)');
            cachedLampGradRef.current = g;
          }
          c.fillStyle = cachedLampGradRef.current;
          c.beginPath();
          c.moveTo(lx + 8, ly + 14);
          c.lineTo(lx - 30, ly + 80);
          c.lineTo(lx + 46, ly + 80);
          c.closePath();
          c.fill();

          c.fillStyle = '#f59e0b';
          c.beginPath();
          c.moveTo(lx + 2, ly + 12);
          c.lineTo(lx + 14, ly + 12);
          c.lineTo(lx + 18, ly + 24);
          c.lineTo(lx - 2, ly + 24);
          c.closePath();
          c.fill();

          c.strokeStyle = '#475569';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(lx + 8, ly + 24);
          c.lineTo(lx + 8, ly + 68);
          c.stroke();
          c.fillStyle = '#334155';
          c.beginPath();
          c.ellipse(lx + 8, ly + 68, 8, 3, 0, 0, Math.PI * 2);
          c.fill();
        }
      });

      // 5.6 棋盘格水吧实体：立式饮水机 (精准坐落于棋盘格左侧 col 22.5, row 14.5)
      drawables.push({
        zY: 15.8 * s,
        draw: (c) => {
          const wx = 22.5 * s;
          const wy = 14.5 * s;

          c.fillStyle = 'rgba(0, 0, 0, 0.35)';
          c.beginPath();
          c.ellipse(wx + 12, wy + 52, 13, 5, 0, 0, Math.PI * 2);
          c.fill();

          // 机身
          c.fillStyle = '#f8fafc';
          c.fillRect(wx, wy + 18, 24, 34);
          c.strokeStyle = '#94a3b8';
          c.lineWidth = 1;
          c.strokeRect(wx, wy + 18, 24, 34);

          // 接水凹槽与龙头
          c.fillStyle = '#334155';
          c.fillRect(wx + 4, wy + 24, 16, 12);
          c.fillStyle = '#ef4444';
          c.fillRect(wx + 6, wy + 22, 3, 3);
          c.fillStyle = '#38bdf8';
          c.fillRect(wx + 15, wy + 22, 3, 3);

          // 5加仑蓝色纯净水桶
          c.fillStyle = '#38bdf8';
          c.beginPath();
          c.ellipse(wx + 12, wy + 9, 9, 11, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#0284c7';
          c.lineWidth = 1.2;
          c.stroke();
          c.fillStyle = 'rgba(255, 255, 255, 0.6)';
          c.fillRect(wx + 6, wy + 7, 3, 6);

          // 纯净水桶咕噜上升气泡
          if (tick % 60 < 40) {
            const bOffset = ((tick % 60) / 40) * 11;
            c.fillStyle = 'rgba(255, 255, 255, 0.75)';
            c.beginPath();
            c.arc(wx + 10, wy + 16 - bOffset, 1.5, 0, Math.PI * 2);
            c.arc(wx + 14, wy + 18 - bOffset * 0.8, 1.2, 0, Math.PI * 2);
            c.fill();
          }
        }
      });

      // 5.7 棋盘格水吧实体：实木茶水咖啡柜 (精准坐落于棋盘格右侧 col 29.5, row 14.5)
      if (imgs.small_table_front) {
        drawables.push({
          zY: 15.8 * s,
          draw: (c) => {
            const kx = 29.5 * s;
            const ky = 14.5 * s;
            c.drawImage(imgs.small_table_front, 0, 0, 32, 32, kx, ky, 32 * ZOOM, 32 * ZOOM);

            // 吧台上咖啡机与咖啡壶
            c.fillStyle = '#1e293b';
            c.fillRect(kx + 6 * ZOOM, ky + 4 * ZOOM, 10 * ZOOM, 14 * ZOOM);
            c.fillStyle = '#ef4444';
            c.fillRect(kx + 7 * ZOOM, ky + 6 * ZOOM, 3, 3);
            c.fillStyle = '#22c55e';
            c.fillRect(kx + 11 * ZOOM, ky + 6 * ZOOM, 3, 3);

            if (imgs.coffee) {
              c.drawImage(imgs.coffee, 0, 0, 16, 16, kx + 18 * ZOOM, ky + 7 * ZOOM, 11 * ZOOM, 11 * ZOOM);
              // 咖啡机升腾热气
              const steamY = ky + 3 * ZOOM - ((tick % 30) / 30) * 12;
              const steamAlpha = 1 - (tick % 30) / 30;
              c.fillStyle = `rgba(255, 255, 255, ${steamAlpha * 0.7})`;
              c.fillRect(kx + 22 * ZOOM + Math.sin(tick / 5) * 2, steamY, 2, 3);
            }
          }
        });
      }

      // 5.7.1 棋盘格水吧：全自动零食饮料售货机 (Retro Vending Machine)
      drawables.push({
        zY: 16.2 * s,
        draw: (c) => {
          const vx = 33.0 * s;
          const vy = 14.0 * s;
          const vw = 24 * ZOOM;
          const vh = 36 * ZOOM;

          // 投影
          c.fillStyle = 'rgba(0, 0, 0, 0.4)';
          c.beginPath();
          c.ellipse(vx + vw / 2, vy + vh - 2, vw / 2 + 4, 6, 0, 0, Math.PI * 2);
          c.fill();

          // 金属机柜主体
          c.fillStyle = '#0f172a';
          c.fillRect(vx, vy, vw, vh);
          c.fillStyle = '#1e293b';
          c.fillRect(vx + 2, vy + 2, vw - 4, vh - 4);
          c.strokeStyle = '#38bdf8';
          c.lineWidth = 1.2;
          c.strokeRect(vx, vy, vw, vh);

          // 顶部发光招牌 "DRINKS"
          c.fillStyle = '#0284c7';
          c.fillRect(vx + 4, vy + 4, vw - 8, 8);
          c.fillStyle = '#ffffff';
          c.font = 'bold 6px monospace';
          c.fillText('DRINKS', vx + 6, vy + 10);

          // 霓虹发光玻璃橱窗
          c.fillStyle = 'rgba(56, 189, 248, 0.15)';
          c.fillRect(vx + 4, vy + 14, vw - 14, 34);
          c.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          c.strokeRect(vx + 4, vy + 14, vw - 14, 34);

          // 第 1 排饮料 (可乐 & 雪碧)
          c.fillStyle = '#ef4444'; c.fillRect(vx + 6, vy + 16, 4, 8);
          c.fillStyle = '#f59e0b'; c.fillRect(vx + 12, vy + 16, 4, 8);
          c.fillStyle = '#22c55e'; c.fillRect(vx + 18, vy + 16, 4, 8);

          // 第 2 排饮料 (乌龙茶 & 奶茶)
          c.fillStyle = '#38bdf8'; c.fillRect(vx + 6, vy + 27, 4, 8);
          c.fillStyle = '#a855f7'; c.fillRect(vx + 12, vy + 27, 4, 8);
          c.fillStyle = '#e2e8f0'; c.fillRect(vx + 18, vy + 27, 4, 8);

          // 第 3 排饮料 (红牛能量罐)
          c.fillStyle = '#f97316'; c.fillRect(vx + 6, vy + 38, 4, 8);
          c.fillStyle = '#06b6d4'; c.fillRect(vx + 12, vy + 38, 4, 8);
          c.fillStyle = '#eab308'; c.fillRect(vx + 18, vy + 38, 4, 8);

          // 右侧投币与控制面板
          c.fillStyle = '#0f172a';
          c.fillRect(vx + vw - 9, vy + 14, 7, 34);
          // LED 金额显示
          c.fillStyle = '#052e16';
          c.fillRect(vx + vw - 8, vy + 16, 5, 4);
          c.fillStyle = '#4ade80';
          c.fillRect(vx + vw - 7, vy + 17, 3, 2);
          // 投币口
          c.fillStyle = '#94a3b8';
          c.fillRect(vx + vw - 7, vy + 23, 3, 1);
          // 选货按钮指示灯
          c.fillStyle = '#38bdf8';
          c.fillRect(vx + vw - 7, vy + 27, 3, 3);
          c.fillStyle = '#f59e0b';
          c.fillRect(vx + vw - 7, vy + 33, 3, 3);

          // 底部出货推门
          c.fillStyle = '#020617';
          c.fillRect(vx + 4, vy + vh - 14, vw - 8, 10);
          c.fillStyle = '#475569';
          c.fillRect(vx + 6, vy + vh - 12, vw - 12, 6);
        }
      });

      // 5.7.2 棋盘格水吧：休闲高脚吧台圆桌与吧台凳 (High Bar Table & Stools)
      drawables.push({
        zY: 16.0 * s,
        draw: (c) => {
          const tx = 26.2 * s;
          const ty = 14.8 * s;

          // 桌子阴影
          c.fillStyle = 'rgba(0, 0, 0, 0.35)';
          c.beginPath();
          c.ellipse(tx + 12, ty + 24, 14, 5, 0, 0, Math.PI * 2);
          c.fill();

          // 金属立柱与底座
          c.fillStyle = '#94a3b8';
          c.fillRect(tx + 10, ty + 10, 4, 14);
          c.fillStyle = '#64748b';
          c.fillRect(tx + 4, ty + 22, 16, 3);

          // 圆形实木吧台桌面
          c.fillStyle = '#78350f';
          c.beginPath();
          c.ellipse(tx + 12, ty + 9, 14, 6, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#92400e';
          c.beginPath();
          c.ellipse(tx + 12, ty + 8, 13, 5, 0, 0, Math.PI * 2);
          c.fill();

          // 咖啡杯与羊角面包点心盘
          c.fillStyle = '#ffffff';
          c.fillRect(tx + 6, ty + 4, 4, 4);
          c.fillStyle = '#b45309';
          c.fillRect(tx + 7, ty + 5, 2, 2);
          c.fillStyle = '#cbd5e1';
          c.fillRect(tx + 13, ty + 5, 7, 3);
          c.fillStyle = '#d97706';
          c.fillRect(tx + 14, ty + 4, 5, 3);

          // 吧台凳 (左)
          if (imgs.chair_side) {
            c.drawImage(imgs.chair_side, 0, 0, 16, 32, tx - 10, ty - 4, 12 * ZOOM, 20 * ZOOM);
          }
          // 吧台凳 (右，翻转)
          if (imgs.chair_side) {
            c.save();
            c.translate(tx + 34, ty - 4);
            c.scale(-1, 1);
            c.drawImage(imgs.chair_side, 0, 0, 16, 32, 0, 0, 12 * ZOOM, 20 * ZOOM);
            c.restore();
          }
        }
      });

      // 5.7.3 智能巡航扫地机器人 (Smart Sweeper Robot)
      const robot = sweeperRobotRef.current;
      const SWEEPER_WAYPOINTS = [
        { x: 5.0 * s, y: 8.8 * s },
        { x: 10.0 * s, y: 8.8 * s },
        { x: 15.0 * s, y: 8.8 * s },
        { x: 19.0 * s, y: 8.8 * s },
        { x: 23.5 * s, y: 8.8 * s },
        { x: 23.5 * s, y: 13.8 * s },
        { x: 28.5 * s, y: 14.8 * s },
        { x: 31.5 * s, y: 14.8 * s },
        { x: 28.5 * s, y: 13.8 * s },
        { x: 21.0 * s, y: 13.8 * s },
        { x: 19.0 * s, y: 8.8 * s },
        { x: 14.0 * s, y: 8.8 * s },
        { x: 8.0 * s, y: 8.8 * s },
      ];

      const rTarget = SWEEPER_WAYPOINTS[robot.targetIdx];
      const rdx = rTarget.x - robot.x;
      const rdy = rTarget.y - robot.y;
      const rDist = Math.hypot(rdx, rdy);

      if (rDist < robot.speed) {
        robot.targetIdx = (robot.targetIdx + 1) % SWEEPER_WAYPOINTS.length;
      } else {
        robot.x += (rdx / rDist) * robot.speed;
        robot.y += (rdy / rDist) * robot.speed;
      }

      if (tick % 24 === 0) {
        robot.sparkles.push({ x: robot.x, y: robot.y + 4, life: 36 });
      }

      robot.sparkles = robot.sparkles.filter(sp => {
        sp.life--;
        return sp.life > 0;
      });

      robot.sparkles.forEach(sp => {
        const alpha = sp.life / 36;
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.8})`;
        ctx.fillRect(sp.x - 1, sp.y, 3, 1);
        ctx.fillRect(sp.x, sp.y - 1, 1, 3);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(sp.x, sp.y, 1, 1);
      });

      drawables.push({
        zY: robot.y + 8,
        draw: (c) => {
          c.fillStyle = 'rgba(0, 0, 0, 0.35)';
          c.beginPath();
          c.ellipse(robot.x, robot.y + 2, 9, 4, 0, 0, Math.PI * 2);
          c.fill();

          c.fillStyle = '#f8fafc';
          c.beginPath();
          c.arc(robot.x, robot.y, 8, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#cbd5e1';
          c.lineWidth = 1;
          c.stroke();

          const pulse = (Math.sin(tick / 10) + 1) * 0.5;
          c.strokeStyle = `rgba(56, 189, 248, ${0.5 + pulse * 0.5})`;
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(robot.x, robot.y, 5, 0, Math.PI * 2);
          c.stroke();

          c.fillStyle = '#0284c7';
          c.beginPath();
          c.arc(robot.x, robot.y, 2, 0, Math.PI * 2);
          c.fill();
        }
      });

      // 5.8 5 大核心工位与协作桌
      Object.values(chars).forEach(ch => {
        const isRunning = agentNodesRef.current?.[ch.id]?.status === 'running';
        const isSelected = selectedAgentKeyRef.current === ch.id;
        const ws = AGENT_WORKSTATIONS[ch.id] || { deskCol: ch.deskCol, deskRow: ch.deskRow, chairCol: ch.chairCol, chairRow: ch.chairRow };
        const deskX = ws.deskCol * s;
        const deskY = ws.deskRow * s;

        // 野生读者在VIP沙发上，不额外画电脑办公桌
        if (ch.id === 'wild_reader') return;

        // 转椅靠背
        if (imgs.chair_back) {
          drawables.push({
            zY: deskY - 10,
            draw: (c) => {
              c.drawImage(imgs.chair_back, 0, 0, 16, 16, deskX + 16 * ZOOM, deskY - 18 * ZOOM, 16 * ZOOM, 16 * ZOOM);
            }
          });
        }

        // 办公桌与电脑物件
        if (imgs.desk) {
          drawables.push({
            zY: deskY + 30 * ZOOM,
            draw: (c) => {
              c.drawImage(imgs.desk, 0, 0, 48, 32, deskX, deskY, 48 * ZOOM, 32 * ZOOM);

              let pcImg = imgs.pc_off;
              if (isRunning) {
                const frameIndex = (Math.floor(tick / 12) % 3) + 1;
                pcImg = imgs[`pc_on_${frameIndex}`] || imgs.pc_on_1;
              }

              if (ch.dualPC) {
                // 【总策划专属】高管双屏
                if (imgs.pc_off) {
                  c.drawImage(imgs.pc_off, 0, 0, 16, 32, deskX + 4 * ZOOM, deskY - 2 * ZOOM, 16 * ZOOM, 32 * ZOOM);
                }
                const mainPC = isRunning ? pcImg : (imgs.pc_on_1 || imgs.pc_off);
                if (mainPC) {
                  c.drawImage(mainPC, 0, 0, 16, 32, deskX + 28 * ZOOM, deskY - 2 * ZOOM, 16 * ZOOM, 32 * ZOOM);
                }
                if (imgs.coffee) {
                  c.drawImage(imgs.coffee, 0, 0, 16, 16, deskX + 21 * ZOOM, deskY + 6 * ZOOM, 12 * ZOOM, 12 * ZOOM);
                }
              } else {
                if (pcImg) {
                  c.drawImage(pcImg, 0, 0, 16, 32, deskX + 30 * ZOOM, deskY - 2 * ZOOM, 16 * ZOOM, 32 * ZOOM);
                }

                if (ch.id === 'critic_auditor') {
                  c.fillStyle = '#dc2626';
                  c.fillRect(deskX + 6 * ZOOM, deskY + 12 * ZOOM, 10 * ZOOM, 8 * ZOOM);
                  c.strokeStyle = '#fecaca';
                  c.lineWidth = 1;
                  c.strokeRect(deskX + 6 * ZOOM, deskY + 12 * ZOOM, 10 * ZOOM, 8 * ZOOM);
                  c.fillStyle = '#ffffff';
                  c.font = 'bold 7px monospace';
                  c.fillText('REJECT', deskX + 7 * ZOOM, deskY + 18 * ZOOM);
                }

                if (ch.id === 'episode_director') {
                  if (imgs.cactus) {
                    c.drawImage(imgs.cactus, 0, 0, 16, 16, deskX + 5 * ZOOM, deskY + 10 * ZOOM, 12 * ZOOM, 12 * ZOOM);
                  } else {
                    const potX = deskX + 6 * ZOOM;
                    const potY = deskY + 12 * ZOOM;
                    c.fillStyle = '#b45309';
                    c.fillRect(potX, potY + 4, 8, 7);
                    c.fillStyle = '#059669';
                    c.beginPath();
                    c.arc(potX + 4, potY + 3, 5, 0, Math.PI * 2);
                    c.fill();
                  }
                }

                if (ch.id === 'prose_writer') {
                  if (imgs.coffee) {
                    c.drawImage(imgs.coffee, 0, 0, 16, 16, deskX + 4 * ZOOM, deskY + 6 * ZOOM, 12 * ZOOM, 12 * ZOOM);
                  }
                  // 铺开的白描手稿稿纸
                  c.fillStyle = '#f8fafc';
                  c.fillRect(deskX + 16 * ZOOM, deskY + 12 * ZOOM, 8 * ZOOM, 6 * ZOOM);
                  c.fillStyle = '#94a3b8';
                  c.fillRect(deskX + 17 * ZOOM, deskY + 13 * ZOOM, 6 * ZOOM, 1);
                  c.fillRect(deskX + 17 * ZOOM, deskY + 15 * ZOOM, 6 * ZOOM, 1);
                }

                if (ch.id === 'lorekeeper') {
                  c.fillStyle = '#10b981';
                  c.fillRect(deskX + 6 * ZOOM, deskY + 12 * ZOOM, 10 * ZOOM, 8 * ZOOM);
                  c.strokeStyle = '#a7f3d0';
                  c.lineWidth = 1;
                  c.strokeRect(deskX + 6 * ZOOM, deskY + 12 * ZOOM, 10 * ZOOM, 8 * ZOOM);
                  c.fillStyle = '#ffffff';
                  c.font = 'bold 7px monospace';
                  c.fillText('LORE', deskX + 8 * ZOOM, deskY + 18 * ZOOM);
                }
              }

              // 下方赛博大号工牌卡片
              const badgeW = 46 * ZOOM;
              const badgeH = 16 * ZOOM;
              const badgeX = deskX + 1 * ZOOM;
              const badgeY = deskY + 33 * ZOOM;

              c.fillStyle = isSelected ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.92)';
              c.beginPath();
              c.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
              c.fill();
              c.strokeStyle = isSelected ? '#fbbf24' : (ch.isLead ? '#f59e0b' : ch.color);
              c.lineWidth = isSelected ? 2 : 1.2;
              c.stroke();

              const iconMap: Record<string, string> = {
                arc_architect: '👑',
                critic_auditor: '🔍',
                episode_director: '🎬',
                prose_writer: '✏️',
                lorekeeper: '📚'
              };
              c.font = '11px sans-serif';
              c.fillText(iconMap[ch.id] || '🤖', badgeX + 5, badgeY + 12 * ZOOM);

              c.fillStyle = '#f8fafc';
              c.font = 'bold 8.5px "Microsoft YaHei", sans-serif';
              c.fillText(`${ch.name}`, badgeX + 20, badgeY + 11.5 * ZOOM);

              const node = agentNodesRef.current?.[ch.id];
              let statusColor = '#22c55e';
              let statusText = '在线';
              if (node?.status === 'running') {
                statusColor = '#38bdf8';
                statusText = '工作中';
              } else if (node?.status === 'done') {
                statusColor = '#10b981';
                statusText = '已完成';
              } else if (node?.status === 'ready') {
                statusColor = '#fbbf24';
                statusText = '就绪';
              } else if (node?.status === 'retry') {
                statusColor = '#f43f5e';
                statusText = '重修';
              } else if (node?.status === 'idle') {
                statusColor = '#94a3b8';
                statusText = '待命';
              }

              c.fillStyle = statusColor;
              c.beginPath();
              c.arc(badgeX + badgeW - 25, badgeY + 8 * ZOOM, 2.5, 0, Math.PI * 2);
              c.fill();

              c.fillStyle = statusColor;
              c.font = 'bold 7.5px monospace';
              c.fillText(statusText, badgeX + badgeW - 20, badgeY + 11.5 * ZOOM);
            }
          });
        }
      });

      // 5.9 剧情监察官专属裁决席铭牌 (坐落于沙发下方，水吧上方缓冲带)
      const readerBadgeW = 56 * ZOOM;
      const readerBadgeH = 15 * ZOOM;
      const readerBadgeX = 23.8 * s;
      const readerBadgeY = 11.6 * s;
      const isReaderSelected = selectedAgentKeyRef.current === 'wild_reader';
      drawables.push({
        zY: 12.0 * s,
        draw: (c) => {
          c.fillStyle = isReaderSelected ? 'rgba(30, 41, 59, 0.96)' : 'rgba(25, 12, 6, 0.92)';
          c.beginPath();
          c.roundRect(readerBadgeX, readerBadgeY, readerBadgeW, readerBadgeH, 5);
          c.fill();
          c.strokeStyle = isReaderSelected ? '#fbbf24' : '#f97316';
          c.lineWidth = isReaderSelected ? 2 : 1.2;
          c.stroke();

          c.font = '11px sans-serif';
          c.fillText('⚖️', readerBadgeX + 6, readerBadgeY + 11.5 * ZOOM);
          c.fillStyle = '#fed7aa';
          c.font = 'bold 8.5px "Microsoft YaHei", sans-serif';
          c.fillText('剧情监察官 · 裁决席', readerBadgeX + 22, readerBadgeY + 11 * ZOOM);

          const isVetoed = wildReaderFeedbackRef.current?.vetoTriggered;
          const rColor = isVetoed ? '#ef4444' : (wildReaderFeedbackRef.current ? '#38bdf8' : '#22c55e');
          const rText = isVetoed ? '自愈中' : (wildReaderFeedbackRef.current ? '已裁决' : '待命中');
          c.fillStyle = rColor;
          c.beginPath();
          c.arc(readerBadgeX + readerBadgeW - 25, readerBadgeY + 7.5 * ZOOM, 2.5, 0, Math.PI * 2);
          c.fill();
          c.font = 'bold 7.5px monospace';
          c.fillText(rText, readerBadgeX + readerBadgeW - 20, readerBadgeY + 11 * ZOOM);
        }
      });

      // 5.10 角色走动与就坐渲染
      Object.values(chars).forEach(ch => {
        const isRunning = agentNodesRef.current?.[ch.id]?.status === 'running';
        const charImg = imgs[`char_${ch.charIndex}`];

        const dx = ch.targetX - ch.x;
        const dy = ch.targetY - ch.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > ch.speed) {
          ch.state = 'walking';

          let desiredStepX = (dx / dist) * ch.speed;
          let desiredStepY = (dy / dist) * ch.speed;
          const candX = ch.x + desiredStepX;
          const candY = ch.y + desiredStepY;

          // 🌟 人物间物理防穿模与动态切线避让 (Person-to-Person Collision Avoidance)
          const MIN_CHAR_DIST = 24; // 角色身体碰撞半径安全间距 (像素)
          let isBlockedByPerson = false;

          for (const other of Object.values(chars)) {
            if (other.id === ch.id) continue;

            const otherWs = AGENT_WORKSTATIONS[other.id];
            const otherSitting = other.id !== 'wild_reader' && (other.state === 'typing' || (other.state === 'reading' && otherWs && Math.abs(other.x - otherWs.chairCol * s) < 14 && Math.abs(other.y - otherWs.chairRow * s) < 14));
            const otherPosX = otherSitting && otherWs ? otherWs.chairCol * s : other.x;
            const otherPosY = otherSitting && otherWs ? otherWs.chairRow * s : other.y;

            const curDist = Math.hypot(ch.x - otherPosX, ch.y - otherPosY);
            const nextDist = Math.hypot(candX - otherPosX, candY - otherPosY);

            // 若继续往前走会穿模重合且距离正在缩短：触发防穿模避让
            if (nextDist < MIN_CHAR_DIST && nextDist < curDist) {
              isBlockedByPerson = true;

              // 计算从对方指向本角色的法线向量
              let nx = ch.x - otherPosX;
              let ny = ch.y - otherPosY;
              const nLen = Math.hypot(nx, ny);
              if (nLen > 0.001) {
                nx /= nLen;
                ny /= nLen;
              } else {
                nx = 1;
                ny = 0;
              }

              // 构造两条正交侧向切线 (左右绕行)
              const tan1X = -ny;
              const tan1Y = nx;
              const tan2X = ny;
              const tan2Y = -nx;

              // 选取更贴近行进方向的切线向量
              const dot1 = tan1X * (dx / dist) + tan1Y * (dy / dist);
              const bestTanX = dot1 >= 0 ? tan1X : tan2X;
              const bestTanY = dot1 >= 0 ? tan1Y : tan2Y;

              const steerSpeed = ch.speed * 0.85;
              const steerX = bestTanX * steerSpeed;
              const steerY = bestTanY * steerSpeed;
              const testX = ch.x + steerX;
              const testY = ch.y + steerY;

              // 检查侧向切线位置是否撞到办公室家具/墙体
              const cCol = Math.floor(testX / s);
              const cRow = Math.floor(testY / s);
              if (!isOfficeTileObstacle(cCol, cRow)) {
                desiredStepX = steerX;
                desiredStepY = steerY;
                isBlockedByPerson = false;
              } else {
                // 尝试反向切线绕行
                const altX = ch.x - bestTanX * steerSpeed;
                const altY = ch.y - bestTanY * steerSpeed;
                const aCol = Math.floor(altX / s);
                const aRow = Math.floor(altY / s);
                if (!isOfficeTileObstacle(aCol, aRow)) {
                  desiredStepX = -bestTanX * steerSpeed;
                  desiredStepY = -bestTanY * steerSpeed;
                  isBlockedByPerson = false;
                } else {
                  // 两侧均狭窄无法错身，礼让停步
                  desiredStepX = 0;
                  desiredStepY = 0;
                }
              }
              break;
            }
          }

          if (desiredStepX !== 0 || desiredStepY !== 0) {
            ch.x += desiredStepX;
            ch.y += desiredStepY;
            ch.walkFrame = (ch.walkFrame + 0.18) % 4;

            if (Math.abs(desiredStepX) > Math.abs(desiredStepY)) {
              ch.facing = desiredStepX > 0 ? 'right' : 'left';
            } else {
              ch.facing = desiredStepY > 0 ? 'down' : 'up';
            }
          } else if (isBlockedByPerson) {
            ch.walkFrame = 0;
          }

          // 物理刚体刚性防穿透分离修正 (确保任何两角色永不穿模重叠)
          Object.values(chars).forEach(other => {
            if (other.id === ch.id) return;
            const otherWs = AGENT_WORKSTATIONS[other.id];
            const otherSitting = other.id !== 'wild_reader' && (other.state === 'typing' || (other.state === 'reading' && otherWs && Math.abs(other.x - otherWs.chairCol * s) < 14 && Math.abs(other.y - otherWs.chairRow * s) < 14));
            const otherPosX = otherSitting && otherWs ? otherWs.chairCol * s : other.x;
            const otherPosY = otherSitting && otherWs ? otherWs.chairRow * s : other.y;
            const sepD = Math.hypot(ch.x - otherPosX, ch.y - otherPosY);
            if (sepD < 22 && sepD > 0.001) {
              const push = (22 - sepD) * 0.5;
              const px = ((ch.x - otherPosX) / sepD) * push;
              const py = ((ch.y - otherPosY) / sepD) * push;
              const pCol = Math.floor((ch.x + px) / s);
              const pRow = Math.floor((ch.y + py) / s);
              if (!isOfficeTileObstacle(pCol, pRow)) {
                ch.x += px;
                ch.y += py;
              }
            }
          });
        } else {
          ch.x = ch.targetX;
          ch.y = ch.targetY;

          if (ch.waypoints && ch.waypoints.length > 1) {
            ch.waypoints.shift();
            ch.targetX = ch.waypoints[0].x;
            ch.targetY = ch.waypoints[0].y;
          } else {
            ch.waypoints = [];
            ch.walkFrame = 0;
            const active = activeInteractionRef.current;
            const isInteracting = active && (active.scenario.initiatorId === ch.id || active.scenario.targetId === ch.id);
            if (!isInteracting) {
              ch.state = isRunning ? 'typing' : 'reading';
              ch.facing = 'down';
            }
          }
        }

        let row = 0; // down
        if (ch.facing === 'up') row = 1;
        else if (ch.facing === 'right' || ch.facing === 'left') row = 2;

        let col = 0;
        if (ch.state === 'walking') {
          const f = Math.floor(ch.walkFrame);
          col = f === 3 ? 1 : f;
        } else if (ch.state === 'typing') {
          col = 3 + (Math.floor(tick / 10) % 2);
        } else {
          col = 5 + (Math.floor(tick / 40) % 2);
        }

        const sx = col * 16;
        const sy = row * 32;

        const ws = AGENT_WORKSTATIONS[ch.id] || { deskCol: ch.deskCol, deskRow: ch.deskRow, chairCol: ch.chairCol, chairRow: ch.chairRow };
        const isSittingAtDesk = ch.id !== 'wild_reader' && (ch.state === 'typing' || (ch.state === 'reading' && Math.abs(ch.x - ws.chairCol * s) < 14 && Math.abs(ch.y - ws.chairRow * s) < 14));
        const isSittingOnSofa = (ch.id === 'wild_reader' && Math.abs(ch.x - ws.chairCol * s) < 16 && Math.abs(ch.y - ws.chairRow * s) < 16) || (activeInteractionRef.current?.scenario.id === 'reader_relaxes_sofa' && activeInteractionRef.current.stage === 'talking' && ch.id === activeInteractionRef.current.scenario.initiatorId);

        let charDrawX = Math.round(ch.x);
        let charDrawY = Math.round(ch.y);
        let zY = charDrawY + 32 * ZOOM;

        if (isSittingAtDesk) {
          charDrawX = ws.deskCol * s + 16 * ZOOM;
          charDrawY = ws.deskRow * s - 16 * ZOOM;
          zY = ws.deskRow * s + 5;
        } else if (isSittingOnSofa) {
          charDrawX = ws.chairCol * s;
          charDrawY = ws.chairRow * s - 2;
          zY = 8.4 * s;
        }

        drawables.push({
          zY,
          draw: (c) => {
            // 脚底阴影
            c.fillStyle = 'rgba(0, 0, 0, 0.45)';
            c.beginPath();
            c.ellipse(charDrawX + 8 * ZOOM, charDrawY + 30 * ZOOM, 8 * ZOOM, 3 * ZOOM, 0, 0, Math.PI * 2);
            c.fill();

            if (charImg) {
              c.save();
              if (ch.facing === 'left') {
                c.translate(charDrawX + 16 * ZOOM, charDrawY);
                c.scale(-1, 1);
                c.drawImage(charImg, sx, sy, 16, 32, 0, 0, 16 * ZOOM, 32 * ZOOM);
              } else {
                c.drawImage(charImg, sx, sy, 16, 32, charDrawX, charDrawY, 16 * ZOOM, 32 * ZOOM);
              }
              c.restore();
            }

            // 写手键盘火花
            if (ch.id === 'prose_writer' && ch.state === 'typing' && tick % 6 < 3) {
              c.fillStyle = tick % 12 < 6 ? '#f59e0b' : '#ef4444';
              c.fillRect(charDrawX + 4 + (tick % 10), charDrawY + 18 * ZOOM, 3, 3);
            }

            // 对话气泡 (缓存文字排版宽度，杜绝每帧 measureText CPU 开销)
            if (ch.bubbleTimer > 0 && ch.bubbleText) {
              ch.bubbleTimer--;
              const text = ch.bubbleText;
              const BUBBLE_FONT = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
              let textW = (ch as any)._cachedBW;
              if ((ch as any)._cachedBT !== text) {
                c.font = BUBBLE_FONT;
                textW = c.measureText(text).width;
                (ch as any)._cachedBW = textW;
                (ch as any)._cachedBT = text;
              }
              const bW = Math.min((textW || 80) + 16, 240);
              const bH = 22;
              const bX = Math.max(10, Math.min(V_WIDTH - bW - 10, charDrawX - bW / 4));
              const bY = charDrawY - 14 * ZOOM;

              c.fillStyle = '#ffffff';
              c.beginPath();
              c.roundRect(bX, bY, bW, bH, 4);
              c.fill();
              c.strokeStyle = '#000000';
              c.lineWidth = 1.5;
              c.stroke();

              c.fillStyle = '#ffffff';
              c.beginPath();
              c.moveTo(charDrawX + 4, bY + bH);
              c.lineTo(charDrawX + 12, bY + bH);
              c.lineTo(charDrawX + 8, bY + bH + 5);
              c.closePath();
              c.fill();
              c.stroke();

              // 明确设定字体与排版对齐，杜绝由于上一绘制元素残留字体导致的粗细跳动
              c.font = BUBBLE_FONT;
              c.textAlign = 'left';
              c.textBaseline = 'alphabetic';
              c.fillStyle = '#0f172a';
              c.fillText(text, bX + 8, bY + 15, bW - 14);
            }
          }
        });
      });

      // 5.13 实体深度排序与渲染
      drawables.sort((a, b) => a.zY - b.zY);
      drawables.forEach(d => d.draw(ctx));

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [assetsLoaded, isOpen]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0d16',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          maxWidth: 'calc((100vh - 56px) * 2)',
          maxHeight: 'calc(100vh - 56px)',
          aspectRatio: '36 / 18',
          objectFit: 'contain',
          display: 'block',
          margin: 'auto',
          cursor: 'pointer',
          borderRadius: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.8)'
        }}
      />
      {!assetsLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#38bdf8',
          fontSize: 13,
          fontWeight: 800,
          background: '#0a0d16'
        }}>
          🏢 正在加载 Pixel Agents 官方高精精灵资产...
        </div>
      )}
    </div>
  );
};

export default PixelAgentsOffice;
