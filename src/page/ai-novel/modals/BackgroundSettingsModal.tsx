import React from 'react';
import { Modal, Tabs, Space, Button, Input, Card, Badge, Tag, Popconfirm, Select, Radio, Alert, Spin, Empty } from 'antd';
import {
  BookOutlined, RocketOutlined, LoadingOutlined, CheckCircleFilled,
  PlusOutlined, SortAscendingOutlined, SortDescendingOutlined, UserAddOutlined,
  UserDeleteOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, FileTextOutlined,
  ExperimentOutlined, SafetyCertificateOutlined, StopOutlined, SaveOutlined
} from '@ant-design/icons';
import { NovelOutline, Novel, CharacterRelationship, PaperTheme } from '../types';
import { isPastCharacter } from '../utils/volumeParser';
import { RelationshipGraph } from '../components/RelationshipGraph';
import { areGenresCompatible, normalizeGenre } from '../utils/genreHelper';

const { TextArea } = Input;

export const TONE_PRESETS: Record<string, { label: string; tag: string; description: string; text: string }> = {
  humorous_hotblood: {
    label: '🎭🔥 热血搞笑 · 反差爆爽流 (推荐火影/无敌体术)',
    tag: '双全流·反差爆爽',
    description: '鲜活灵动 · 松弛从容 · 忍界本土世界观沉浸 · 拳拳到肉雷霆爆杀',
    text: `【🎭🔥 本书核心文风基调：热血搞笑 · 反差爆爽流（鲜活灵动 · 松弛从容 · 忍界本土世界观沉浸）】
- **作者人设定位**：你是一名擅长【松弛幽默 + 鲜活互动 + 暴力反差】的顶级白金作家（兼具《一拳超人》埼玉的松弛乐子人心态与《大王饶命》的生活化幽默）。
- **🚨 核心世界观认知底座（Cognitive Era Anchor - 彻底根除现代出戏比喻）**：
  1. **时代认知锚定**：火影世界是基于【传统村落/藩国 + 查克拉忍术与冷兵器】的时代，绝对不存在任何现代都市工业实体！
  2. **所有比喻与调侃必须取材于忍界本土生活常识**：
     - 调侃水遁 ➔ 比喻为：农田浇菜、洗地砖、温泉冲凉解暑、茶馆洗碗（❌ 绝对禁止出现“洗车、冲马桶、高压水枪”等现代词汇）；
     - 调侃火遁 ➔ 比喻为：柴火烤肉、烧炭取暖、点烟斗、烤红薯（❌ 绝对禁止出现“微波炉、燃气灶”）；
     - 调侃音波/雷遁 ➔ 比喻为：敲破铁管、铁匠铺打铁、路边杂耍卖艺（❌ 绝对禁止出现“收音机、发电机、家电维修”）；
     - 调侃反派组合 ➔ 比喻为：杂耍班、推拿馆、戏班子；
  3. **🌟 幽默表达双层结构（核心准则）**：
     - **内心独白（现代人思维）**：丰富的解构与反套路吐槽，主要发生在主角的**内心心理活动**中；
     - **对外说话（从容大实话）**：对外开口时，主角始终用**最平淡自然、言简意赅的忍界大实话**，降维打击，直接让对手破防！
- **🌟 主角核心魅力：【松弛从容的体术乐子人 + 动手雷霆爆杀】**：
  1. **生活烟火气**：随和自然、有现代人的通透。拍拍身上的灰、啃一口苹果、调侃两句，有呼吸感与人情味（绝非面瘫冷血杀手）。
  2. **同伴损友熟络感**：对待宁次、天天、鸣人、凯老师，是熟稔有爱的伙伴，有日常打趣与默契关照，绝不生硬端着。
  3. **动手雷霆暴力**：打架干净利落、刚猛凶悍，一拳干碎一切花里胡哨，拳拳到肉！
- **反派与配角反差**：敌人全力放大招，主角毫发无损随手轰飞；全员与带队上忍从懵逼到疯狂脑补“无上体术”，喜剧爽感拉满！
- **行文节奏**：语言生动流畅，对话口语化自然，画面感极强！`
  },
  humorous: {
    label: '🎭 幽默风趣 · 吐槽反差 · 迪化喜剧流',
    tag: '轻松爆笑',
    description: '高级幽默 · 吐槽反差 · 全员迪化 · 脑洞大开',
    text: `【🎭 本书核心文风基调：幽默风趣 · 吐槽反差 · 迪化喜剧流（最高优先级执行）】
- **作者人设定位**：你是一名擅长【从容反差、辛辣毒舌、嘴碎吐槽、全员迪化】的顶级白金作家。文风高级幽默、节奏干练，绝不低幼弱智。
- **🚨 核心世界观认知底座（彻底杜绝现代违和出戏比喻）**：
  1. 所有调侃与比喻必须完全取材于本世界观的生活常识（如浇菜、烤肉、铁匠打铁、澡堂冲凉），严禁出现洗车、冲马桶、家电等跨时代现代实体！
  2. **内心独白 vs 对外台词分层**：现代人思维的吐槽主要在**内心独白**中展现；对外说话平淡从容、字字诛心。
- **主角人设定位**：
  1. **反套路骚操作**：用最意想不到的硬核物理手段破局，把装逼犯和全场看客“整不会了”。
  2. **敌人滑稽破防**：刻画敌人从“嚣张傲慢”到“满头问号、极度懵逼、怀疑人生”的滑稽神态反差。
- **周围人迪化脑补**：围观者疯狂脑补主角高深莫测，产生强烈的认知错位喜剧爽感。
- **行文节奏**：节奏明快，幽默诙谐却不失强者逼格，绝不死板沉重。`
  },
  hotblood: {
    label: '🔥 热血暴爽 · 节奏爆杀 · 拳拳到肉流',
    tag: '极致压迫·杀伐果断',
    description: '节奏极快 · 零延迟反杀 · 拳拳到肉 · 压迫感引爆',
    text: `【🔥 本书核心文风基调：热血暴爽 · 节奏爆杀 · 拳拳到肉流（最高优先级执行）】
- **作者人设定位**：你是一名擅长【高压快节奏、极致压迫感、零延迟暴力反杀】的顶级爆款爽文宗师。你的文字充满爆炸性的爆发力与视听冲击感。
- **主角热血与爆杀人设**：
  1. **杀伐果断与零忍耐反击**：主角性格刚烈霸道、恩怨分明，面对挑衅和杀机绝不隐忍退让，有仇当场报，出手快准狠。
  2. **绝对压制与气势碾压**：在关键爆发时刻气势如虹，以绝对的实力差距或致命底牌当场爆杀，绝不给反派废话拖延的机会。
- **战斗动作与物理碰撞**：
  1. **拳拳到肉与招式拆解**：精准描写力量爆发的肌肉紧绷、气浪炸裂、骨骼碎裂声与兵刃火星，受击物理反馈真实具体。
  2. **零延迟当场反杀打脸**：反派叫嚣未落，主角致命一击已至，瞬间将嚣张气焰彻底粉碎。
- **情绪引爆与爽点节奏**：
  1. 压迫感迅速堆叠并在极限时刻瞬间逆转引爆，行文如狂风骤雨，让读者肾上腺素狂飙。`
  },
  tactical: {
    label: '🧠 智谋布局 · 反转悬疑 · 信息差博弈流',
    tag: '高智商·烧脑反转',
    description: '心理博弈 · 算无遗策 · 多重反转 · 严禁降智',
    text: `【🧠 本书核心文风基调：智谋布局 · 反转悬疑 · 信息差博弈流（最高优先级执行）】
- **作者人设定位**：你是一名擅长【高智商心理战、精密布局、层层反转】的悬疑谋略大师。你的文字逻辑缜密、暗线交织，步步惊心。
- **主角智谋与博弈人设**：
  1. **信息差收割与心理掌控**：主角冷静沉着、算无遗策，善于利用敌人的性格盲区与情报差设局，将计就计。
  2. **微表情洞察与暗线伏笔**：善于从一句微小的对白破绽、眼神游移中捕捉杀机，提前埋设三层以上的应对后手。
- **对抗博弈与反转设计**：
  1. **多重反转与连环陷阱**：表面上的破绽实为诱敌深入的圈套，敌人自以为胜券在握时揭晓真正死局，反转环环相扣。
  2. **严禁降智与逻辑硬伤**：敌我双方智商均在线，严禁对手无脑送人头，所有对抗均建立在合理动机与信息差之上。
- **行文氛围**：张弛有度，悬念拉满，在冷静克制的叙事中暗藏惊涛骇浪，每一次解密都带来强烈的思维快感。`
  },
  epic: {
    label: '🌌 正统史诗 · 恢弘厚重 · 冷峻扎实流',
    tag: '群像交织·宿命沧桑',
    description: '世界观厚重 · 历史纵深 · 宿命对决 · 扎实冷峻',
    text: `【🌌 本书核心文风基调：正统史诗 · 恢弘厚重 · 冷峻扎实流（最高优先级执行）】
- **作者人设定位**：你是一名擅长【世界观深度刻画、历史纵深、群像交织与宿命对决】的传奇史诗宗师。你的文字扎实冷峻、气势磅礴，具有浓厚的人文与历史厚重感。
- **主角与群像人设**：
  1. **沉稳扎实与宿命担当**：主角身处时代洪流与势力倾轧之中，每一次抉择都承载着沉重的代价与信念，性格坚毅沉稳。
  2. **鲜活群像与势力博弈**：各方阵营、门阀、宗门皆有独特的利益诉求与历史渊源，群像人物血肉丰满、立场鲜明。
- **场景与世界观刻画**：
  1. **实体物理质感与环境烘托**：细腻刻画风霜、古道、关隘、战场与古老遗迹的冷峻质感，以高密度实体事件展现时代沧桑。
  2. **庄严宿命感与厚重对抗**：战斗不仅是力量的碰撞，更是信念与立场的终极交锋，胜负皆有沉甸甸的历史回响。
- **行文节奏**：节奏沉稳有力、步步为营，在浩瀚壮阔的史诗画卷中展现命运的壮美与残酷。`
  }
};

interface BackgroundSettingsModalProps {
  open: boolean;
  onCancel: () => void;
  selectedOutline: NovelOutline | null;
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>;
  selectedNovel: Novel | null;
  httpService: any;
  message: any;
  setModifyField: (field: 'worldSetting' | 'mainLine' | 'characterSetting' | 'characterStates') => void;
  setIsModifyModalOpen: (open: boolean) => void;
  isAnalyzingSys: boolean;
  onAnalyzeSystemAndCultivation: () => void;
  onOpenBatchAnalyzeModal: (type?: 'sys' | 'rel') => void;
  onStartAddRelationship: () => void;
  relSortAsc: boolean;
  setRelSortAsc: React.Dispatch<React.SetStateAction<boolean>>;
  isAnalyzingRel: boolean;
  onAnalyzeRelationships: () => void;
  getProtagonistName: () => string;
  activeRelNode: CharacterRelationship | null;
  setActiveRelNode: (node: CharacterRelationship | null) => void;
  onTogglePastStatus: (relName: string) => Promise<void>;
  onStartEditRelationship: (rel: CharacterRelationship) => void;
  onDeleteRelationship: (name: string) => void;
  paperTheme?: PaperTheme;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  open,
  onCancel,
  selectedOutline,
  setSelectedOutline,
  selectedNovel,
  httpService,
  message,
  setModifyField,
  setIsModifyModalOpen,
  isAnalyzingSys,
  onAnalyzeSystemAndCultivation,
  onOpenBatchAnalyzeModal,
  onStartAddRelationship,
  relSortAsc,
  setRelSortAsc,
  isAnalyzingRel,
  onAnalyzeRelationships,
  getProtagonistName,
  activeRelNode,
  setActiveRelNode,
  onTogglePastStatus,
  onStartEditRelationship,
  onDeleteRelationship,
  paperTheme = 'dark',
}) => {
  const currentTone = selectedOutline?.toneStyle || (selectedNovel as any)?.toneStyle || 'humorous_hotblood';
  const relList = Array.isArray(selectedOutline?.characterRelationships) ? selectedOutline!.characterRelationships : [];

  const handleToneSelect = async (val: string) => {
    const defaultText = TONE_PRESETS[val]?.text || '';
    if (selectedOutline) {
      setSelectedOutline({
        ...selectedOutline,
        toneStyle: val,
        toneStyleDirectives: defaultText
      });
    }
    if (selectedNovel) {
      try {
        await httpService.post('/ai-novel/save-outline', {
          novelId: selectedNovel.id,
          toneStyle: val,
          toneStyleDirectives: defaultText
        });
        message.success(`文风基调已切换并自动保存！`);
      } catch (err: any) {
        message.error('保存失败: ' + err.message);
      }
    }
  };

  // 🔬 蒸馏规则包单书级绑定与随时取消状态
  const [bundles, setBundles] = React.useState<any[]>([]);
  const [loadingBundles, setLoadingBundles] = React.useState<boolean>(false);
  const [bundleMode, setBundleMode] = React.useState<'auto' | 'custom' | 'disabled'>(
    selectedOutline?.ruleBundleMode || 'auto'
  );
  const [selectedBundleId, setSelectedBundleId] = React.useState<number | null>(
    selectedOutline?.ruleBundleId || null
  );
  const [savingBundle, setSavingBundle] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (selectedOutline) {
      setBundleMode(selectedOutline.ruleBundleMode || 'auto');
      setSelectedBundleId(selectedOutline.ruleBundleId || null);
    }
  }, [selectedOutline?.ruleBundleMode, selectedOutline?.ruleBundleId]);

  const fetchBundles = React.useCallback(async () => {
    setLoadingBundles(true);
    try {
      const res = await httpService.get('/ai-novel/lab/bundles?pageSize=100');
      const list = res.data?.data?.items || res.data?.items || [];
      setBundles(list);
    } catch (err: any) {
      // 软降级
    } finally {
      setLoadingBundles(false);
    }
  }, [httpService]);

  React.useEffect(() => {
    if (open) {
      fetchBundles();
    }
  }, [open, fetchBundles]);

  const handleSaveDistillBundle = async (mode: 'auto' | 'custom' | 'disabled', bundleId: number | null) => {
    if (!selectedNovel) return;
    setSavingBundle(true);
    try {
      await httpService.post('/ai-novel/save-outline', {
        novelId: selectedNovel.id,
        ruleBundleMode: mode,
        ruleBundleId: mode === 'custom' ? bundleId : null
      });
      if (selectedOutline) {
        setSelectedOutline({
          ...selectedOutline,
          ruleBundleMode: mode,
          ruleBundleId: mode === 'custom' ? bundleId : null
        });
      }
      message.success('蒸馏笔法包单书绑定配置已成功落盘！');
    } catch (err: any) {
      message.error('保存失败: ' + err.message);
    } finally {
      setSavingBundle(false);
    }
  };

  return (
    <Modal
      title={
        <span style={{ fontSize: 18, fontWeight: 800, color: '#ffd666', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#d4b106' }} />
          🌌 小说背景设定与修改 (大窗口工作区)
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width="92vw"
      style={{ top: 20, maxWidth: 1600 }}
      centered={false}
      wrapClassName={`novel-themed-modal paper-theme-${paperTheme}`}
      styles={{ body: { paddingTop: 10, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' } }}
    >
      <div className="modal-tip-banner" style={{ marginBottom: 15, padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
        💡 <strong>使用提示：</strong> 在大窗口中可以更宽敞地编辑世界观与人物设定。文本框编辑后在失去焦点(Blur)时会<b>自动保存到数据库</b>。关系网修改也会自动同步。
      </div>
      <Tabs
        defaultActiveKey="w"
        type="card"
        items={[
          {
            key: 'w',
            label: (
              <Space>
                <span>🌌 世界观设定</span>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#ffd666', padding: '0 4px', height: 'auto' }}
                  icon={<RocketOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModifyField('worldSetting');
                    setIsModifyModalOpen(true);
                  }}
                >
                  AI修改
                </Button>
              </Space>
            ),
            children: (
              <TextArea
                value={selectedOutline?.worldSetting}
                onChange={e => {
                  if (selectedOutline) {
                    setSelectedOutline({ ...selectedOutline, worldSetting: e.target.value });
                  }
                }}
                onBlur={async e => {
                  if (!selectedNovel) return;
                  await httpService.post('/ai-novel/save-outline', {
                    novelId: selectedNovel.id,
                    worldSetting: e.target.value
                  });
                  message.success({ content: '世界观背景设定已自动保存！', duration: 1.5 });
                }}
                placeholder="在此输入并修改小说世界观及规则设定..."
                style={{ fontSize: 14, lineHeight: 1.6, padding: 12, height: 'calc(100vh - 280px)', minHeight: 480, resize: 'none' }}
              />
            )
          },
          {
            key: 'm',
            label: (
              <Space>
                <span>⛓️ 四大分卷主线沙盘</span>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#ffd666', padding: '0 4px', height: 'auto' }}
                  icon={<RocketOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModifyField('mainLine');
                    setIsModifyModalOpen(true);
                  }}
                >
                  AI修改
                </Button>
              </Space>
            ),
            children: (
              <TextArea
                value={selectedOutline?.mainLine}
                onChange={e => {
                  if (selectedOutline) {
                    setSelectedOutline({ ...selectedOutline, mainLine: e.target.value });
                  }
                }}
                onBlur={async e => {
                  if (!selectedNovel) return;
                  await httpService.post('/ai-novel/save-outline', {
                    novelId: selectedNovel.id,
                    mainLine: e.target.value
                  });
                  message.success({ content: '四大分卷主线沙盘已自动保存！', duration: 1.5 });
                }}
                placeholder="在此输入并修改四大分卷主线沙盘，引导后续剧情的发展大方向与四个阶段核心升级脉络..."
                style={{ fontSize: 14, lineHeight: 1.6, padding: 12, height: 'calc(100vh - 280px)', minHeight: 480, resize: 'none' }}
              />
            )
          },
          {
            key: 'c',
            label: (
              <Space>
                <span>👤 主角人设与言行规范</span>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#52c41a', padding: '0 4px', height: 'auto' }}
                  icon={<ReloadOutlined />}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!selectedNovel) return;
                    try {
                      const res = await httpService.get(`/ai-novel/detail/${selectedNovel.id}`);
                      const outline = res.data?.outline || res.data?.data?.outline;
                      if (outline?.characterSetting) {
                        setSelectedOutline((prev: any) => ({
                          ...prev,
                          characterSetting: outline.characterSetting
                        }));
                        message.success('已从数据库同步最新主角言行规范！');
                      } else {
                        message.info('数据库中暂无更新内容');
                      }
                    } catch (err: any) {
                      message.error('同步失败: ' + err.message);
                    }
                  }}
                >
                  从数据库同步
                </Button>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#40a9ff', padding: '0 4px', height: 'auto' }}
                  icon={<FileTextOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    const template = `【主角：${getProtagonistName() || '主角名'}】\n- 核心身份：现代穿越者灵魂，深知故事世界观与剧情走向。\n- 核心性格特质（现代人通透务实 · 绝非盲目狂热）：\n  · 处事冷静理性，遇事不慌，崇尚绝对实力与自保，拒绝自我感动的盲目热血；\n  · 心态松弛从容，务实干脆，追求“早点打完收工”的生活烟火气，不端架子；\n  · 杀伐果断不圣母，但对同伴留手有情分、懂分寸。\n- 对外说话风格与口癖：\n  · 漫不经心、随性接地气、大实话直击痛点，游刃有余；\n  · ❌【绝对禁令·严禁现代网络烂梗】：对外绝不使用脱离语境的低俗网络热梗（如“熬夜长不高”、“助眠”、“顺着网线”、“退退退”等），拒绝自以为是的强行装逼与油腻口嗨！\n- 战斗获胜/降维打击时的真实反应：\n  · 物理动作：拍拍身上灰尘、活动筋骨、从容收工；\n  · 态度：神色平淡，将强敌底牌视若寻常，用朴实无华的一击解决问题；\n  · 反差爽感：敌人歇斯底里狂放大招 ➔ 主角随手一击干碎 ➔ 敌人与全场目瞪口呆道心破碎！\n- 绝对严禁行为与 OOC 禁忌红线：\n  · ❌ 严禁油腻轻浮、无脑口嗨；\n  · ❌ 严禁自我感动的说教与圣母病！`;
                    if (selectedOutline) {
                      setSelectedOutline({ ...selectedOutline, characterSetting: template });
                      if (selectedNovel) {
                        httpService.post('/ai-novel/save-outline', {
                          novelId: selectedNovel.id,
                          characterSetting: template
                        });
                      }
                      message.success('已填入标准人设与言行规范模板并保存！');
                    }
                  }}
                >
                  填入模板
                </Button>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#ffd666', padding: '0 4px', height: 'auto' }}
                  icon={<RocketOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModifyField('characterSetting');
                    setIsModifyModalOpen(true);
                  }}
                >
                  AI修改
                </Button>
              </Space>
            ),
            children: (
              <TextArea
                value={selectedOutline?.characterSetting}
                onChange={e => {
                  if (selectedOutline) {
                    setSelectedOutline({ ...selectedOutline, characterSetting: e.target.value });
                  }
                }}
                onBlur={async e => {
                  if (!selectedNovel) return;
                  await httpService.post('/ai-novel/save-outline', {
                    novelId: selectedNovel.id,
                    characterSetting: e.target.value
                  });
                  message.success({ content: '主角人设与言行规范已自动保存！', duration: 1.5 });
                }}
                placeholder={`在此输入主角核心人设与言行规范（与世界观并列为第一核心底座，严格约束正文台词与行为）：\n【核心性格】：...\n【对外说话风格与口癖】：（如：极度诚挚直球、说话言简意赅、绝不玩现代流行梗）\n【战斗获胜/降维打击时的本色反应】：（如：从容从武道逻辑指出对手负担，反差感源于认真直球，绝不油腻装逼）\n【绝对严禁行为与OOC红线】：（如：严禁现代都市网梗、严禁轻浮戏谑口嗨）`}
                style={{ fontSize: 14, lineHeight: 1.6, padding: 12, height: 'calc(100vh - 280px)', minHeight: 480, resize: 'none' }}
              />
            )
          },
          {
            key: 'states',
            label: (
              <Space>
                <span>🧭 角色状态追踪 (动态)</span>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#52c41a', padding: '0 4px', height: 'auto' }}
                  icon={<ReloadOutlined />}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!selectedNovel) return;
                    try {
                      const res = await httpService.get(`/ai-novel/detail/${selectedNovel.id}`);
                      const outline = res.data?.outline || res.data?.data?.outline;
                      if (outline?.characterStates) {
                        setSelectedOutline((prev: any) => ({
                          ...prev,
                          characterStates: outline.characterStates
                        }));
                        message.success('已从数据库同步最新角色状态追踪！');
                      } else {
                        message.info('数据库中暂无角色状态记录');
                      }
                    } catch (err: any) {
                      message.error('同步失败: ' + err.message);
                    }
                  }}
                >
                  从数据库同步
                </Button>
                <Button
                  size="small"
                  type="text"
                  style={{ fontSize: 11, color: '#ffd666', padding: '0 4px', height: 'auto' }}
                  icon={<RocketOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModifyField('characterStates');
                    setIsModifyModalOpen(true);
                  }}
                >
                  AI修改
                </Button>
              </Space>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                    💡 每章正文生成后，AI 自动提炼全员出场角色的动态状态（位置、伤势、情绪、战斗力等级），并在后续章节生成时作为长程上下文注入。您可在此校准或清除旧战力，防止战力崩坏与吃书。
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleFilled />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    onClick={async () => {
                      if (!selectedNovel) return;
                      await httpService.post('/ai-novel/save-outline', {
                        novelId: selectedNovel.id,
                        characterStates: selectedOutline?.characterStates || ''
                      });
                      message.success('角色状态追踪已成功保存落盘！');
                    }}
                  >
                    保存角色状态
                  </Button>
                </div>
                <TextArea
                  value={selectedOutline?.characterStates}
                  onChange={e => {
                    if (selectedOutline) {
                      setSelectedOutline({ ...selectedOutline, characterStates: e.target.value });
                    }
                  }}
                  onBlur={async e => {
                    if (!selectedNovel) return;
                    await httpService.post('/ai-novel/save-outline', {
                      novelId: selectedNovel.id,
                      characterStates: e.target.value
                    });
                    message.success({ content: '角色状态追踪已自动保存！', duration: 1.5 });
                  }}
                  placeholder="角色状态追踪格式规范（每行一个角色）：&#10;李洛克：位于短册街，卸下负重开启第三门生门后极度脱力喘息，双臂酸胀，认清传说三忍的真实差距...&#10;纲手：位于短册街居酒屋，收下欠条免除赌债，对小李的血肉铜骨深感震动..."
                  style={{ fontSize: 14, lineHeight: 1.6, padding: 12, height: 'calc(100vh - 330px)', minHeight: 440, resize: 'none' }}
                />
              </div>
            )
          },
          {
            key: 'tone',
            label: (
              <Space>
                <span>🎭 文风基调与创作法则</span>
                <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                  {TONE_PRESETS[currentTone]?.tag || '核心'}
                </Tag>
              </Space>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <Space size="middle" align="center" wrap>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#ffd666' }}>
                      🎭 核心文风基调预设：
                    </span>
                    <Select
                      value={currentTone}
                      style={{ width: 440 }}
                      onChange={handleToneSelect}
                      options={Object.entries(TONE_PRESETS).map(([key, item]) => ({
                        value: key,
                        label: item.label
                      }))}
                    />
                    <Tag color="gold" style={{ fontSize: 12, padding: '2px 8px' }}>
                      {TONE_PRESETS[currentTone]?.tag || '推荐基调'}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                      {TONE_PRESETS[currentTone]?.description}
                    </span>
                  </Space>
                  <Space>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={async () => {
                        if (!selectedNovel) return;
                        try {
                          const res = await httpService.get(`/ai-novel/detail/${selectedNovel.id}`);
                          const outline = res.data?.outline || res.data?.data?.outline;
                          if (outline?.toneStyleDirectives) {
                            setSelectedOutline((prev: any) => ({
                              ...prev,
                              toneStyle: outline.toneStyle || prev.toneStyle,
                              toneStyleDirectives: outline.toneStyleDirectives
                            }));
                            message.success('已从数据库同步最新文风基调指令！');
                          } else {
                            message.info('数据库中暂无自定义指令');
                          }
                        } catch (err: any) {
                          message.error('同步失败: ' + err.message);
                        }
                      }}
                    >
                      从数据库同步
                    </Button>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={async () => {
                        const defaultText = TONE_PRESETS[currentTone]?.text || '';
                        if (selectedOutline) {
                          setSelectedOutline({
                            ...selectedOutline,
                            toneStyleDirectives: defaultText
                          });
                        }
                        if (selectedNovel) {
                          await httpService.post('/ai-novel/save-outline', {
                            novelId: selectedNovel.id,
                            toneStyle: currentTone,
                            toneStyleDirectives: defaultText
                          });
                        }
                        message.success('已恢复为官方预设基调指令并自动保存！');
                      }}
                    >
                      恢复预设文本
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleFilled />}
                      onClick={async () => {
                        if (!selectedNovel) return;
                        try {
                          const textToSave = selectedOutline?.toneStyleDirectives !== undefined
                            ? selectedOutline.toneStyleDirectives
                            : (TONE_PRESETS[currentTone]?.text || '');
                          await httpService.post('/ai-novel/save-outline', {
                            novelId: selectedNovel.id,
                            toneStyle: currentTone,
                            toneStyleDirectives: textToSave
                          });
                          message.success('文风基调与创作法则已成功保存到数据库！');
                        } catch (err: any) {
                          message.error('保存失败: ' + err.message);
                        }
                      }}
                    >
                      保存基调设定
                    </Button>
                  </Space>
                </div>
                <div style={{ marginBottom: 8, fontSize: 12, color: '#a1a1aa' }}>
                  💡 <strong>写作引擎法则：</strong> 此文风指令与「主角人设」、「世界观」并列为小说最高优先级执行底座。支持自由修改下方文本，修改后在文本框失焦(Blur)或点击「保存基调设定」即可持久化保存，写作与续写时将严格生效！
                </div>
                <TextArea
                  value={selectedOutline?.toneStyleDirectives !== undefined ? selectedOutline.toneStyleDirectives : (TONE_PRESETS[currentTone]?.text || '')}
                  onChange={e => {
                    if (selectedOutline) {
                      setSelectedOutline({ ...selectedOutline, toneStyleDirectives: e.target.value });
                    }
                  }}
                  onBlur={async e => {
                    if (!selectedNovel) return;
                    try {
                      await httpService.post('/ai-novel/save-outline', {
                        novelId: selectedNovel.id,
                        toneStyle: currentTone,
                        toneStyleDirectives: e.target.value
                      });
                      message.success({ content: '文风基调与创作法则已自动保存！', duration: 1.5 });
                    } catch (err: any) {
                      message.error('自动保存失败: ' + err.message);
                    }
                  }}
                  placeholder="在此查看或编辑文风基调与写作规范指令..."
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    padding: 14,
                    height: 'calc(100vh - 330px)',
                    minHeight: 460,
                    resize: 'none',
                    fontFamily: 'monospace, sans-serif'
                  }}
                />
              </div>
            )
          },
          {
            key: 'distill',
            label: (
              <Space>
                <span>🔬 蒸馏笔法包</span>
                {bundleMode === 'disabled' && (
                  <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                    已禁用
                  </Tag>
                )}
                {bundleMode === 'custom' && (
                  <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                    单本绑定
                  </Tag>
                )}
                {bundleMode === 'auto' && (
                  <Tag color="green" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                    题材继承
                  </Tag>
                )}
              </Space>
            ),
            children: (() => {
              const currentGenre = (selectedNovel as any)?.category || selectedOutline?.theme || '体制官场';
              const activeAutoBundle = bundles.find(
                b => areGenresCompatible(b.targetGenre || b.genre, currentGenre) && b.isActive
              );
              const customSelectedBundle = bundles.find(b => b.id === selectedBundleId);
              const effectiveBundle = bundleMode === 'custom' ? customSelectedBundle : activeAutoBundle;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <Space size="middle" align="center" wrap>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#ffd666', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ExperimentOutlined /> 蒸馏规则生效模式：
                      </span>
                      <Radio.Group
                        value={bundleMode}
                        onChange={(e) => setBundleMode(e.target.value)}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="auto">
                          <Space size={4}>
                            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                            <span>跟随题材自动继承</span>
                          </Space>
                        </Radio.Button>
                        <Radio.Button value="custom">
                          <Space size={4}>
                            <BookOutlined style={{ color: '#1890ff' }} />
                            <span>专属绑定指定规则包</span>
                          </Space>
                        </Radio.Button>
                        <Radio.Button value="disabled">
                          <Space size={4}>
                            <StopOutlined style={{ color: '#ff4d4f' }} />
                            <span>彻底禁用（随时取消）</span>
                          </Space>
                        </Radio.Button>
                      </Radio.Group>
                    </Space>

                    <Space>
                      <Button
                        size="middle"
                        icon={<ReloadOutlined />}
                        onClick={fetchBundles}
                        loading={loadingBundles}
                      >
                        刷新规则库
                      </Button>
                      <Button
                        type="primary"
                        size="middle"
                        icon={<SaveOutlined />}
                        loading={savingBundle}
                        onClick={() => handleSaveDistillBundle(bundleMode, selectedBundleId)}
                      >
                        保存蒸馏包设定
                      </Button>
                    </Space>
                  </div>

                  {bundleMode === 'auto' && (
                    <Alert
                      type="success"
                      showIcon
                      message={`当前小说题材为【${currentGenre}】· 采用题材级自动继承机制`}
                      description={
                        activeAutoBundle ? (
                          <div>
                            已匹配并自动挂载当前题材在能力实验室中激活的生效规则包：
                            <strong style={{ color: '#52c41a', marginLeft: 6 }}>
                              [{activeAutoBundle.bundleName}] ({activeAutoBundle.bundleVersion || 'v1.0.0'}) · 共 {activeAutoBundle.ruleCount || 0} 条蒸馏军规
                            </strong>
                            {(activeAutoBundle.targetGenre || activeAutoBundle.genre) !== currentGenre && (
                              <Tag color="cyan" style={{ marginLeft: 8 }}>
                                题材智能互通: {currentGenre} ➔ {activeAutoBundle.targetGenre || activeAutoBundle.genre}
                              </Tag>
                            )}
                            <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                              写手动笔生成正文时，将自动注入该包内经过真人标杆语料萃取的黄金笔法。若无需蒸馏包，可随时在上方向右切换为“彻底禁用”。
                            </div>
                          </div>
                        ) : (
                          <div>
                            当前题材【{currentGenre}】在能力实验室中尚未手动激活规则包。系统正采用<strong>极简直通模式</strong>：动笔时将自动读取该题材所有已审核通过 (verified) 的精选规则。
                          </div>
                        )
                      }
                    />
                  )}

                  {bundleMode === 'custom' && (
                    <Card size="small" style={{ borderRadius: 8, background: 'rgba(24, 144, 255, 0.04)', borderColor: 'rgba(24, 144, 255, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1890ff' }}>
                          🎯 选择要为《{selectedNovel?.title}》专属绑定的蒸馏规则包：
                        </span>
                        <Select
                          style={{ minWidth: 420 }}
                          placeholder="请选择规则包（支持跨题材选择）"
                          value={selectedBundleId || undefined}
                          onChange={(val) => setSelectedBundleId(val)}
                          options={bundles.map((b) => ({
                            value: b.id,
                            label: `[${b.targetGenre || b.genre || '通用'}] ${b.bundleName} (${b.bundleVersion || 'v1.0.0'}) · ${b.ruleCount || 0}条规则 ${b.isActive ? '★题材当前激活' : ''}`
                          }))}
                        />
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                          （已突破题材限制，可任意指定历史版本或特定名家风格蒸馏包）
                        </span>
                      </div>
                    </Card>
                  )}

                  {bundleMode === 'disabled' && (
                    <Alert
                      type="warning"
                      showIcon
                      message="已针对本小说彻底禁用蒸馏规则层（随时取消）"
                      description={`当前《${selectedNovel?.title || '本作品'}》已单独切断蒸馏规则包注入。正文写手动笔时将严格保持纯净的通用写作军规与题材基础设定，不加载任何实验室提炼规则。`}
                    />
                  )}

                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          📜 注入正文写手的蒸馏笔法预览
                          {bundleMode === 'disabled' && ' (当前已禁用，动笔不生效)'}
                        </span>
                        {effectiveBundle && (
                          <Tag color="cyan">
                            {effectiveBundle.bundleName} · {effectiveBundle.ruleCount || 0} 条规则
                          </Tag>
                        )}
                      </div>
                    }
                    size="small"
                    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column' }}
                  >
                    {bundleMode === 'disabled' ? (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="当前小说已处于【彻底禁用】状态，写作时不注入任何蒸馏规则包"
                        />
                      </div>
                    ) : effectiveBundle ? (
                      <TextArea
                        readOnly
                        value={effectiveBundle.compiledRulesPrompt || effectiveBundle.bundleContent || '暂无编译文本'}
                        style={{
                          flex: 1,
                          height: 'calc(100vh - 430px)',
                          minHeight: 320,
                          resize: 'none',
                          fontFamily: 'monospace, sans-serif',
                          fontSize: 12.5,
                          lineHeight: 1.6,
                          background: 'rgba(0, 0, 0, 0.2)'
                        }}
                      />
                    ) : (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            bundleMode === 'custom'
                              ? '请在上方下拉列表中挑选要绑定的规则包'
                              : '能力实验室中暂无已编译的规则包，系统动笔时将自动读取已审核精选规则直通生效'
                          }
                        />
                      </div>
                    )}
                  </Card>
                </div>
              );
            })()
          },
          {
            key: 'sys_big',
            label: '⚡ 修仙境界与金手指',
            children: (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#ffd666" }}>⚡ 主角突破修为轨迹 & 系统已解锁能力看板</span>
              <Space>
                <Button
                  type="primary"
                  size="middle"
                  icon={isAnalyzingSys ? <LoadingOutlined /> : <RocketOutlined />}
                  onClick={onAnalyzeSystemAndCultivation}
                  loading={isAnalyzingSys}
                >
                  分析本章境界与金手指
                </Button>
                <Button
                  type="default"
                  size="middle"
                  icon={<CheckCircleFilled />}
                  style={{ borderColor: '#ffd666', color: '#ffd666' }}
                  onClick={() => onOpenBatchAnalyzeModal('sys')}
                >
                  批量勾选章节分析
                </Button>
              </Space>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 10, height: "calc(100vh - 300px)", minHeight: 450 }}>
              <Card title="🌟 主角突破修为看板" size="small" style={{ borderRadius: 8 }}>
                <div style={{ padding: "12px", border: "1px solid #383846", borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>当前最新境界修为：</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#ffd666", marginTop: 4 }}>
                        {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.currentRealm || "暂未突破 / 练气期"}
                      </div>
                    </div>
                    {selectedOutline?.systemAndCultivationState?.protagonistCultivation?.karmaPoints && (
                      <div style={{ textAlign: "right", border: "1px solid #785a06", padding: "4px 8px", borderRadius: 6 }}>
                        <div style={{ fontSize: 11, color: "#ffd666", fontWeight: 600 }}>⚡ 当前剩余因缘值：</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#faad14", marginTop: 2 }}>
                          {selectedOutline.systemAndCultivationState.protagonistCultivation.karmaPoints}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>设定的修仙境界划分体系：</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(selectedOutline?.systemAndCultivationState?.realmSystem || ["练气期", "筑基期", "金丹期", "元婴期", "化神期"]).map((realm, idx) => (
                    <div key={idx} style={{ padding: "6px 10px", border: "1px solid #2e2e38", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge count={idx + 1} style={{ backgroundColor: "#d4b106" }} />
                      <span style={{ fontWeight: 500 }}>{realm}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="🔮 系统 / 金手指功能解锁看板" size="small" style={{ borderRadius: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
                  {(!selectedOutline?.systemAndCultivationState?.systemFeatures || selectedOutline.systemAndCultivationState.systemFeatures.length === 0) ? (
                    <div style={{ textAlign: "center", padding: "80px 10px", color: "#71717a", fontSize: 13 }}>
                      暂无金手指解锁记载。生成正文后点击右上角按钮由 AI 自动提取更新。
                    </div>
                  ) : (
                    selectedOutline.systemAndCultivationState.systemFeatures.map((feat, idx) => (
                      <Card key={idx} size="small" style={{ border: "1px solid #2e2e38", borderRadius: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>{feat.featureName}</span>
                          <Badge count={feat.status} style={{ backgroundColor: "#52c41a" }} />
                        </div>
                        <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{feat.description}</div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        )
      },
      {
        key: 'r',
        label: '⛓️ 人物关系网',
        children: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                style={{ background: '#d4b106', borderColor: '#d4b106', color: '#fff' }}
                onClick={onStartAddRelationship}
              >
                手动补录人物关系
              </Button>
              <Space>
                <Button
                  size="middle"
                  icon={isAnalyzingRel ? <LoadingOutlined /> : <RocketOutlined />}
                  onClick={onAnalyzeRelationships}
                  loading={isAnalyzingRel}
                >
                  分析本章人物
                </Button>
                <Button
                  type="default"
                  size="middle"
                  icon={<CheckCircleFilled />}
                  style={{ borderColor: '#ffd666', color: '#ffd666' }}
                  onClick={() => onOpenBatchAnalyzeModal('rel')}
                >
                  批量勾选章节分析
                </Button>
              </Space>
            </div>

            {relList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 10px', color: '#71717a', fontSize: 14 }}>
                🌌 暂无人物关系记录。可在正文生成后自动提取，或点击左上方按钮手动补录。
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, marginTop: 10, height: 'calc(100vh - 300px)', minHeight: 450 }}>
                {/* ECharts 力导向拓扑关系图 */}
                <div className="relationship-graph-panel" style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <RelationshipGraph
                    relationships={relList}
                    protagonistName={getProtagonistName()}
                    activeRelNode={activeRelNode}
                    onSelectNode={(node) => setActiveRelNode(node)}
                    paperTheme={paperTheme}
                  />
                </div>

                {/* 右侧：节点选中详情面板 */}
                <div className="relationship-side-form" style={{ width: 280, display: 'flex', flexDirection: 'column', borderRadius: 8, padding: 16 }}>
                  {activeRelNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isPastCharacter(activeRelNode) ? '#71717a' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isPastCharacter(activeRelNode) ? 'line-through' : 'none' }}>
                            {activeRelNode.name}
                            {isPastCharacter(activeRelNode) && <Tag color="default" style={{ fontSize: 10, marginLeft: 4, fontWeight: 'normal' }}>已退场</Tag>}
                          </h3>
                          <span style={{ fontSize: 12, color: '#a1a1aa' }}>关系：</span>
                          <Badge
                            count={activeRelNode.relationship}
                            style={{ backgroundColor: '#2a2410', color: '#ffd666', border: '1px solid #785a06', borderRadius: 4, height: 20, lineHeight: '18px', fontSize: 11 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <Button
                            size="small"
                            type="text"
                            icon={isPastCharacter(activeRelNode) ? <UserAddOutlined style={{ fontSize: 13, color: '#52c41a' }} /> : <UserDeleteOutlined style={{ fontSize: 13, color: '#fa8c16' }} />}
                            onClick={async () => {
                              await onTogglePastStatus(activeRelNode.name);
                              setActiveRelNode({ ...activeRelNode, isPast: !isPastCharacter(activeRelNode) });
                            }}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined style={{ fontSize: 13, color: '#ffd666' }} />}
                            onClick={() => onStartEditRelationship(activeRelNode)}
                          />
                          <Popconfirm
                            title={`确定要删除人物 ${activeRelNode.name} 的关系记录吗？`}
                            okText="确定"
                            cancelText="取消"
                            onConfirm={() => onDeleteRelationship(activeRelNode.name)}
                          >
                            <Button
                              size="small"
                              type="text"
                              icon={<DeleteOutlined style={{ fontSize: 13, color: '#ff4d4f' }} />}
                            />
                          </Popconfirm>
                        </div>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>人设特征 / 细节描述：</span>
                        <div className="modal-preview-box" style={{ fontSize: 13, color: '#e4e4e7', lineHeight: 1.6, padding: 10, borderRadius: 6, minHeight: 120 }}>
                          {activeRelNode.description || '暂无描述信息。'}
                        </div>

                        <span style={{ fontWeight: 600, fontSize: 12, color: '#a1a1aa', display: 'block', marginTop: 16, marginBottom: 4 }}>登场章节：</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {activeRelNode.appearanceChapters && activeRelNode.appearanceChapters.length > 0 ? (
                            activeRelNode.appearanceChapters.map((num, i) => (
                              <span key={i} style={{ background: '#2a2410', color: '#ffd666', border: '1px solid #785a06', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                                第 {num} 章
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 12, color: '#71717a' }}>无记录</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', textAlign: 'center', gap: 10 }}>
                      <div style={{ fontSize: 32 }}>⛓️</div>
                      <div style={{ fontSize: 13 }}>点击左侧关系图中的人物节点<br/>即可在此查看并编辑详情</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }
    ]}
  />
</Modal>
  );
};
