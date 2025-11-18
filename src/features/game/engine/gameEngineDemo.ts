import { Card, compareCard, isBlackA, rankToValue } from "./cards";
import { judgeResult, PlayerFinish, Result } from "./judgeResult";
import { canBeat, classifyPlay, Play, PlayType } from "./plays";

// 用现有 Card 推导花色 / 点数类型
type Suit = Card["suit"];
type Rank = Card["rank"];

export type Camp = "A" | "B"; // 有黑A阵营 = "A"，无黑A阵营 = "B"

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  finished: boolean;
  finishOrder?: number;
  camp: Camp;
  hasBlackA: boolean;
}

export interface GameState {
  players: PlayerState[];
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayOwnerIndex: number | null; // 最后一次出牌的人
  passesInRound: number; // 当前这墩里，其他人连续 PASS 次数
  finishCount: number; // 已经出完的玩家数量
  gameOver: boolean; // 新增：游戏是否已经结束
  tributeSummary: TributeSummary | null;
  result?: Result | null;
}

export interface TributeCardTransfer {
  card: Card;
  fromId: string;
  toId: string;
}

export interface TributeExchange {
  giverId: string;
  giverName: string;
  tributeCards: TributeCardTransfer[];
  returnCards: TributeCardTransfer[];
}

export interface TributeSummary {
  winnerCamp: Camp;
  winnerIds: string[];
  caughtIds: string[];
  exchanges: TributeExchange[];
}

export interface PreviousRoundSnapshot {
  result: Result;
  players: Array<Pick<PlayerState, "id" | "name" | "camp">>;
}

// =============== 决策接口 ===============

// 返回值含义：
// - Card[]：决定出这几张牌
// - null：决定 PASS
export type DecisionContextType = "TURN" | "REACT";

export interface DecisionContext {
  type: DecisionContextType;
  /**
   * 当 type 为 "REACT" 时，表示触发本次追问的玩家 index（刚出完的人）
   * 目前 UI 可以用它去显示提示信息
   */
  triggerPlayerIndex?: number;
}

export type DecisionFn = (
  state: GameState,
  playerIndex: number,
  context: DecisionContext
) => Card[] | null;

// =============== 工具函数 ===============

function getActivePlayerCount(state: GameState): number {
  return state.players.filter((p) => !p.finished).length;
}

// 逆时针找到下一个还没出完的玩家
function nextActiveIndex(state: GameState, from: number): number {
  const n = state.players.length;
  let i = (from - 1 + n) % n; // 逆时针：index - 1
  while (state.players[i].finished) {
    i = (i - 1 + n) % n;
  }
  return i;
}

// =============== 牌堆 / 洗牌 / 发牌 ===============

const ALL_SUITS: Suit[] = ["spade", "heart", "club", "diamond"];
const ALL_RANKS: Rank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
  "SJ",
  "BJ",
];

// Ensure card IDs are unique across multiple deck creations (when using multiple decks)
let NEXT_CARD_ID = 1;

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      if (rank === "SJ" || rank === "BJ") continue;
      deck.push({
        id: `C${NEXT_CARD_ID++}`,
        suit,
        rank,
      });
    }
  }

  deck.push({
    id: `C${NEXT_CARD_ID++}`,
    suit: "joker" as Suit,
    rank: "SJ" as Rank,
  });
  deck.push({
    id: `C${NEXT_CARD_ID++}`,
    suit: "joker" as Suit,
    rank: "BJ" as Rank,
  });

  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatCard(card: Card): string {
  const suitMap: Record<Suit, string> = {
    spade: "♠",
    heart: "♥",
    club: "♣",
    diamond: "♦",
    joker: "JOKER",
  };
  return `${suitMap[card.suit]}${card.rank}`;
}

const MAX_RETURN_CARD_VALUE = rankToValue("10");

function shuffleWithRng<T>(input: T[], randomFn: () => number = Math.random) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function removeCardsById(hand: Card[], ids: string[]): void {
  const idSet = new Set(ids);
  for (let i = hand.length - 1; i >= 0; i--) {
    if (idSet.has(hand[i].id)) {
      hand.splice(i, 1);
    }
  }
}

function pickTributeCards(hand: Card[], count: number): Card[] {
  if (count <= 0) return [];
  const eligible = hand.filter((card) => !isBlackA(card));
  if (eligible.length === 0) return [];
  const sorted = [...eligible].sort((a, b) => compareCard(b, a));
  return sorted.slice(0, Math.min(count, sorted.length));
}

interface WinnerReturnPool {
  eligible: Card[];
}

function buildReturnPools(
  winnerIds: string[],
  originalHands: Map<string, Card[]>
): Map<string, WinnerReturnPool> {
  const pools = new Map<string, WinnerReturnPool>();
  for (const winnerId of winnerIds) {
    const original = originalHands.get(winnerId) ?? [];
    const eligible = original
      .filter((card) => rankToValue(card.rank) <= MAX_RETURN_CARD_VALUE)
      .sort(compareCard);
    pools.set(winnerId, { eligible });
  }
  return pools;
}

function chooseReturnCard(
  winnerId: string,
  pools: Map<string, WinnerReturnPool>
): Card | null {
  const pool = pools.get(winnerId);
  if (!pool) return null;
  if (pool.eligible.length === 0) return null;
  return pool.eligible.shift() ?? null;
}

export function applyTributeRule(
  players: PlayerState[],
  snapshot: PreviousRoundSnapshot,
  randomFn: () => number = Math.random
): TributeSummary | null {
  const { result, players: previousPlayers } = snapshot;
  if (result.winner !== "A" && result.winner !== "B") {
    return null;
  }

  if (!result.caught || result.caught.length === 0) {
    return null;
  }

  const winnerIds = previousPlayers
    .filter((p) => p.camp === result.winner)
    .map((p) => p.id);

  if (winnerIds.length === 0) {
    return null;
  }

  const playerMap = new Map<string, PlayerState>();
  players.forEach((p) => playerMap.set(p.id, p));

  const originalHands = new Map<string, Card[]>();
  players.forEach((p) => {
    originalHands.set(p.id, [...p.hand]);
  });

  const pools = buildReturnPools(winnerIds, originalHands);
  const exchanges: TributeExchange[] = [];

  for (const giverId of result.caught) {
    const giver = playerMap.get(giverId);
    if (!giver) continue;

    const cardsToGive = pickTributeCards(giver.hand, winnerIds.length);
    if (cardsToGive.length === 0) continue;

    removeCardsById(
      giver.hand,
      cardsToGive.map((card) => card.id)
    );

    const randomized = shuffleWithRng(cardsToGive, randomFn);
    const assignments: { card: Card; toId: string }[] = [];

    for (let i = 0; i < winnerIds.length && i < randomized.length; i++) {
      const winnerId = winnerIds[i];
      const receiver = playerMap.get(winnerId);
      if (!receiver) continue;
      const card = randomized[i];
      receiver.hand.push(card);
      assignments.push({ card, toId: winnerId });
    }

    if (assignments.length === 0) {
      continue;
    }

    const returns: { card: Card; fromId: string }[] = [];

    for (const assignment of assignments) {
      const returnCard = chooseReturnCard(assignment.toId, pools);
      const winner = playerMap.get(assignment.toId);
      if (!returnCard || !winner) continue;

      removeCardsById(winner.hand, [returnCard.id]);
      giver.hand.push(returnCard);
      returns.push({ card: returnCard, fromId: assignment.toId });
    }

    exchanges.push({
      giverId: giver.id,
      giverName: giver.name,
      tributeCards: assignments.map((assignment) => ({
        card: { ...assignment.card },
        fromId: giver.id,
        toId: assignment.toId,
      })),
      returnCards: returns.map((ret) => ({
        card: { ...ret.card },
        fromId: ret.fromId,
        toId: giver.id,
      })),
    });
  }

  if (exchanges.length === 0) {
    return null;
  }

  return {
    winnerCamp: result.winner,
    winnerIds,
    caughtIds: result.caught,
    exchanges,
  };
}

// =============== Greedy AI：支持所有牌型，优先出最小可行解 ===============

const CHAIN_RANKS: Rank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

// 出牌优先级：值越小越优先，尽量先打出多张组合，最后才拆成单牌；炸弹仍然保留到不得已时
const LEAD_TYPE_PRIORITY: Record<PlayType, number> = {
  CHAIN_TRIPLE: 0,
  CHAIN_PAIR: 1,
  STRAIGHT: 2,
  TRIPLE: 3,
  PAIR: 4,
  SINGLE: 5,
  FOUR_BOMB: 6, // 4张炸弹
  FIVE_BOMB: 9, // 5张炸弹
  BOMB: 10, // 6张及以上炸弹
  JOKER_BOMB: 8, // 王炸
};

const RESPONSE_TYPE_PRIORITY: Record<PlayType, number> = {
  CHAIN_TRIPLE: 0,
  CHAIN_PAIR: 1,
  STRAIGHT: 2,
  TRIPLE: 3,
  PAIR: 4,
  SINGLE: 5,
  FOUR_BOMB: 6, // 4张炸弹
  FIVE_BOMB: 9, // 5张炸弹
  BOMB: 10, // 6张及以上炸弹
  JOKER_BOMB: 8, // 王炸
};

function buildRankBuckets(cards: Card[]): Map<Rank, Card[]> {
  const buckets = new Map<Rank, Card[]>();
  for (const card of cards) {
    const list = buckets.get(card.rank) ?? [];
    list.push(card);
    buckets.set(card.rank, list);
  }
  return buckets;
}

function emitWindows(
  ranks: Rank[],
  minLength: number,
  cb: (window: Rank[]) => void
) {
  if (ranks.length < minLength) return;
  for (let length = minLength; length <= ranks.length; length++) {
    for (let start = 0; start <= ranks.length - length; start++) {
      cb(ranks.slice(start, start + length));
    }
  }
}

function addChainCandidates(
  cardsByRank: Map<Rank, Card[]>,
  requiredCount: number,
  minLength: number,
  addWindow: (window: Rank[]) => void
) {
  let sequence: Rank[] = [];
  const flushSequence = () => {
    emitWindows(sequence, minLength, addWindow);
    sequence = [];
  };

  for (const rank of CHAIN_RANKS) {
    const bucket = cardsByRank.get(rank);
    if (bucket && bucket.length >= requiredCount) {
      sequence.push(rank);
    } else {
      flushSequence();
    }
  }

  flushSequence();
}

function createPlayKey(cards: Card[]): string {
  return cards
    .map((c) => c.id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .join("-");
}

function tryAddPlay(options: Play[], cards: Card[], seen: Set<string>): void {
  if (cards.length === 0) return;
  const key = createPlayKey(cards);
  if (seen.has(key)) return;
  const play = classifyPlay(cards);
  if (play) {
    options.push(play);
    seen.add(key);
  }
}

function generateCandidatePlays(hand: Card[]): Play[] {
  if (hand.length === 0) return [];

  const sortedHand = [...hand].sort(compareCard);
  const cardsByRank = buildRankBuckets(sortedHand);
  const options: Play[] = [];
  const seen = new Set<string>();

  // 单张
  for (const card of sortedHand) {
    tryAddPlay(options, [card], seen);
  }

  cardsByRank.forEach((cards, rank) => {
    if (cards.length >= 2) {
      tryAddPlay(options, cards.slice(0, 2), seen);
    }
    if (cards.length >= 3) {
      tryAddPlay(options, cards.slice(0, 3), seen);
    }
    if (cards.length >= 4) {
      for (let size = 4; size <= cards.length; size++) {
        tryAddPlay(options, cards.slice(0, size), seen);
      }
    }

    if (rank === "A") {
      const blackAS = cards.filter((c) => isBlackA(c));
      if (blackAS.length >= 2) {
        tryAddPlay(options, blackAS.slice(0, 2), seen);
      }
    }
  });

  // 连对
  addChainCandidates(cardsByRank, 2, 3, (window) => {
    const combo: Card[] = [];
    for (const rank of window) {
      const bucket = cardsByRank.get(rank);
      if (!bucket || bucket.length < 2) return;
      combo.push(...bucket.slice(0, 2));
    }
    tryAddPlay(options, combo, seen);
  });

  // 连续三张
  addChainCandidates(cardsByRank, 3, 2, (window) => {
    const combo: Card[] = [];
    for (const rank of window) {
      const bucket = cardsByRank.get(rank);
      if (!bucket || bucket.length < 3) return;
      combo.push(...bucket.slice(0, 3));
    }
    tryAddPlay(options, combo, seen);
  });

  // 顺子
  addChainCandidates(cardsByRank, 1, 5, (window) => {
    const combo: Card[] = [];
    for (const rank of window) {
      const bucket = cardsByRank.get(rank);
      if (!bucket || bucket.length === 0) return;
      combo.push(bucket[0]);
    }
    tryAddPlay(options, combo, seen);
  });

  // 王炸
  const sj = cardsByRank.get("SJ");
  const bj = cardsByRank.get("BJ");
  if (sj?.length && bj?.length) {
    tryAddPlay(options, [sj[0], bj[0]], seen);
  }

  return options;
}

function compareLeadPlays(a: Play, b: Play): number {
  const typeDiff =
    (LEAD_TYPE_PRIORITY[a.type] ?? 99) - (LEAD_TYPE_PRIORITY[b.type] ?? 99);
  if (typeDiff !== 0) return typeDiff;
  if (a.mainValue !== b.mainValue) {
    return a.mainValue - b.mainValue;
  }
  return a.cards.length - b.cards.length;
}

function compareResponsePlays(a: Play, b: Play): number {
  const typeDiff =
    (RESPONSE_TYPE_PRIORITY[a.type] ?? 99) -
    (RESPONSE_TYPE_PRIORITY[b.type] ?? 99);
  if (typeDiff !== 0) return typeDiff;

  if (a.cards.length !== b.cards.length) {
    return a.cards.length - b.cards.length;
  }

  return a.mainValue - b.mainValue;
}

function greedyComboAIDecision(
  state: GameState,
  playerIndex: number,
  _context: DecisionContext
): Card[] | null {
  const player = state.players[playerIndex];
  const options = generateCandidatePlays(player.hand);
  if (options.length === 0) return null;

  const current = state.lastPlay;

  if (!current) {
    const sorted = [...options].sort(compareLeadPlays);
    return sorted.length ? sorted[0].cards : null;
  }

  const beating = options.filter((opt) => canBeat(current, opt));
  if (beating.length === 0) return null;

  const sameType = beating.filter((opt) => opt.type === current.type);
  const pool = sameType.length > 0 ? sameType : beating;
  const sortedPool = [...pool].sort(compareResponsePlays);
  return sortedPool[0]?.cards ?? null;
}

export function recommendPlay(
  state: GameState,
  playerIndex: number,
  context: DecisionContext
): Card[] | null {
  return greedyComboAIDecision(state, playerIndex, context);
}

// =============== GameEngine ===============

export class GameEngine {
  state: GameState;
  private controllers: Partial<Record<string, DecisionFn>>;
  public lastResult: Result | null = null;

  constructor(
    state: GameState,
    controllers?: Partial<Record<string, DecisionFn>>
  ) {
    this.state = state;
    this.controllers = controllers ?? {};
  }

  /** 根据玩家 id 选择对应的决策器；没有的话用默认 AI */
  private decideFor(
    playerIndex: number,
    context: DecisionContext
  ): Card[] | null {
    const player = this.state.players[playerIndex];
    const fn = this.controllers[player.id] ?? greedyComboAIDecision;
    return fn(this.state, playerIndex, context);
  }

  /** 常规轮：当前玩家自动出牌 or PASS（不涉及“有人出完”那条特殊追问规则） */
  playAutoTurn(): void {
    const s = this.state;

    if (s.gameOver) {
      return; // 已经结束就不再执行任何出牌逻辑
    }

    // 1️⃣ 防御：currentPlayerIndex 必须在合法范围内
    if (
      typeof s.currentPlayerIndex !== "number" ||
      s.currentPlayerIndex < 0 ||
      s.currentPlayerIndex >= s.players.length
    ) {
      s.currentPlayerIndex = 0;
    }

    const curIdx = s.currentPlayerIndex;
    const cur = s.players[curIdx];

    // 2️⃣ 如果这个玩家已经出完了，直接跳到下一个没出完的
    if (cur.finished) {
      s.currentPlayerIndex = nextActiveIndex(s, curIdx);
      return;
    }

    console.log(
      `\n👉 轮到 ${cur.name} 出牌（阵营 ${cur.camp}｜手牌 ${cur.hand.length}）`
    );

    const chosen = this.decideFor(curIdx, { type: "TURN" });

    // ================= PASS 分支 =================
    if (!chosen || chosen.length === 0) {
      console.log(`🕳️ ${cur.name} 选择 PASS`);

      const activeNow = getActivePlayerCount(s);

      // ⭐ 特殊情况：只剩最后一个玩家没出完，又无法管当前牌墩
      if (activeNow === 1) {
        console.log(
          "⚪ 仅剩最后一名未出完玩家且无法接管本墩，视为该墩结束，由他重新起牌。"
        );

        // 清空牌墩，让他重新当首家出牌
        s.lastPlay = null;
        s.lastPlayOwnerIndex = null;
        s.passesInRound = 0;

        // 现在当作“新一墩”的首家，再让他选一手牌（这次 lastPlay 为 null）
        const leaderPlay = this.decideFor(curIdx, { type: "TURN" });

        if (leaderPlay && leaderPlay.length > 0) {
          this.executePlay(curIdx, leaderPlay);
        } else {
          // 极端兜底：如果连首家都出不了，就直接视为他出完，避免死锁
          cur.finished = true;
          cur.finishOrder = ++s.finishCount;
          console.log(
            `⚠️ ${cur.name} 在首家状态也无法出牌，视为自动出完（兜底以防死循环）。`
          );
          if (s.players.every((p) => p.finished)) {
            this.settle();
          } else {
            s.currentPlayerIndex = nextActiveIndex(s, curIdx);
          }
        }

        return;
      }

      // ⭐ 一般情况：还有不止一个未出完玩家

      s.passesInRound += 1;
      const othersCount = Math.max(activeNow - 1, 0); // 除“最后出牌的人”之外的其他玩家数量

      // 有 lastPlay / 有最后出牌者 / 且所有「其他未出完玩家」都已经 PASS 过一轮
      if (
        s.lastPlay &&
        s.lastPlayOwnerIndex !== null &&
        othersCount > 0 &&
        s.passesInRound >= othersCount
      ) {
        console.log("⚪ 本轮其他玩家全部 PASS，本墩结束并清空桌面。");

        const newStarter = s.lastPlayOwnerIndex; // 控制权回到最后出牌的人

        s.lastPlay = null;
        s.lastPlayOwnerIndex = null;
        s.passesInRound = 0;

        s.currentPlayerIndex = newStarter;
      } else {
        // 还没把所有“其他玩家”问完，继续逆时针下一个
        s.currentPlayerIndex = nextActiveIndex(s, curIdx);
      }

      return;
    }

    // ================= 正常出牌 =================
    this.executePlay(curIdx, chosen);
  }

  /** 执行指定玩家出一手牌 */
  private executePlay(playerIndex: number, cards: Card[]): void {
    const s = this.state;
    const player = s.players[playerIndex];

    const play = classifyPlay(cards);
    if (!play) {
      console.log(`❌ ${player.name} 打出的牌型无效，强制 PASS`);
      s.passesInRound += 1;
      s.currentPlayerIndex = nextActiveIndex(s, playerIndex);
      return;
    }

    if (s.lastPlay && !canBeat(s.lastPlay, play)) {
      console.log(
        `❌ ${player.name} 出的牌 ${cards
          .map(formatCard)
          .join(" ")} 无法压住桌面，只能 PASS`
      );
      s.passesInRound += 1;
      s.currentPlayerIndex = nextActiveIndex(s, playerIndex);
      return;
    }

    console.log(`✅ ${player.name} 出牌：${cards.map(formatCard).join(" ")}`);

    // 从手牌中移除
    for (const c of cards) {
      const idx = player.hand.findIndex((h) => h.id === c.id);
      if (idx >= 0) player.hand.splice(idx, 1);
    }

    // 更新桌面状态
    s.lastPlay = play;
    s.lastPlayOwnerIndex = playerIndex;
    s.passesInRound = 0; // 新的一墩开始统计“别人要不要管”

    // 是否出完
    if (player.hand.length === 0) {
      this.onPlayerFinished(playerIndex);
      return;
    }

    // 没出完 → 下一个活跃玩家
    s.currentPlayerIndex = nextActiveIndex(s, playerIndex);
  }

  /** 某个玩家刚刚出完牌：触发“出完→逆时针询问是否要管” */
  private onPlayerFinished(playerIndex: number): void {
    const s = this.state;
    const p = s.players[playerIndex];

    p.finished = true;
    p.finishOrder = ++s.finishCount;

    console.log(`🎉 ${p.name} 已出完所有手牌！（第 ${p.finishOrder} 位）`);

    // 新增：检查某个阵营是否已经“全员出完”
    const campOfP = p.camp;
    const allThisCampFinished = s.players
      .filter((pl) => pl.camp === campOfP)
      .every((pl) => pl.finished);

    if (allThisCampFinished) {
      console.log(
        `\n🏁 阵营 ${campOfP} 的玩家全部出完，游戏立即结束并结算胜负。`
      );
      this.settle(); // 会设置 gameOver = true
      return;
    }
    // 所有人都出完 → 直接结算
    const allFinished = s.players.every((pl) => pl.finished);
    if (allFinished) {
      console.log("\n🏁 所有玩家都已出完，进入结算...");
      this.settle();
      return;
    }

    // ⭐ 有人出完：从该玩家开始逆时针依次询问剩下玩家是否要管
    this.askOthersWhetherToBeat(playerIndex);
  }

  /**
   * 出完牌后的“追问是否要管”：
   * - 从 finishedIndex 的逆时针下家开始
   * - 每个未出完的玩家只问一次：要么出牌管，要么 PASS
   * - 问完一圈就停（不会死循环）
   * - 如果没人管：本轮结束，桌面清空，下一轮名义上仍由 finishedIndex 先出
   */
  private askOthersWhetherToBeat(finishedIndex: number): void {
    const s = this.state;

    if (!s.lastPlay) {
      return; // 理论上不该发生
    }

    const activeCount = getActivePlayerCount(s);
    if (activeCount <= 1) {
      // 只剩这一个出完的玩家 or 实际没人可问了
      console.log("⚠️ 出完后没有剩余的活跃玩家可继续追问。");
      this.settle();
      return;
    }

    console.log(
      `\n🔍 ${s.players[finishedIndex].name} 出完牌，开始逆时针询问其他玩家是否要管...`
    );

    // 1️⃣ 先算出要询问的玩家顺序（每个未出完的玩家只出现一次）
    const askOrder: number[] = [];
    let idx = nextActiveIndex(s, finishedIndex);

    for (let step = 0; step < s.players.length - 1; step++) {
      if (idx === finishedIndex) break; // 回到自己就停
      if (!s.players[idx].finished) askOrder.push(idx); // 只问没出完的
      idx = nextActiveIndex(s, idx);
    }

    let someoneBeat = false;

    // 2️⃣ 按顺序挨个问一遍
    for (const i of askOrder) {
      const player = s.players[i];
      console.log(`❓ 询问 ${player.name} 是否要管`);

      const chosen = this.decideFor(i, {
        type: "REACT",
        triggerPlayerIndex: finishedIndex,
      });

      if (chosen && chosen.length > 0) {
        console.log(
          `💥 ${player.name} 选择出牌来管：${chosen.map(formatCard).join(" ")}`
        );
        this.executePlay(i, chosen);
        someoneBeat = true;
        break;
      } else {
        console.log(`🙅‍♂️ ${player.name} 选择不管`);
      }
    }

    // 3️⃣ 如果一圈都没人管：桌面清空，下一轮仍然由 finishedIndex 拿控制权
    if (!someoneBeat) {
      console.log(
        `⭕ 没人能/愿意管 ${s.players[finishedIndex].name} 的最后一手牌，本轮结束并清空桌面。`
      );
      s.lastPlay = null;
      s.lastPlayOwnerIndex = null;
      s.passesInRound = 0;
      s.currentPlayerIndex = finishedIndex; // 控制权还在他名下
    }
  }

  /** 用 judgeResult 结算阵营胜负 */
  private settle(): void {
    const s = this.state;
    s.gameOver = true; // 如果你之前没在这里设 gameOver，可以顺便加上

    const finishes: PlayerFinish[] = s.players
      .filter((p) => p.finishOrder != null)
      .sort((a, b) => a.finishOrder! - b.finishOrder!)
      .map((p) => ({
        id: p.id,
        camp: p.camp,
      }));

    // 先让 judgeResult 只帮我们算 winner（谁赢 / 平局）
    const baseResult: Result = judgeResult(finishes);

    // 然后在这里根据「当前还没出完的玩家」重算 caught
    let winner = baseResult.winner;
    let caught: string[] = [];

    if (winner === "A" || winner === "B") {
      const loserCamp: Camp = winner === "A" ? "B" : "A";

      // ❗ 输的一方阵营中：所有还没出完的玩家 = 被抓
      caught = s.players
        .filter((p) => p.camp === loserCamp && !p.finished)
        .map((p) => p.id);
    }

    const result: Result = { winner, caught };
    this.lastResult = result;

    // ===== 输出部分 =====
    console.log("\n📊 出完顺序：");
    for (const p of s.players.sort(
      (a, b) => (a.finishOrder ?? 999) - (b.finishOrder ?? 999)
    )) {
      console.log(
        `- ${p.name}（阵营 ${p.camp}）${
          p.finishOrder ? ` 第 ${p.finishOrder} 个出完` : " 未出完"
        }`
      );
    }

    if (result.winner === "DRAW") {
      console.log(`\n🏆 judgeResult 结论：本局平局`);
    } else {
      console.log(`\n🏆 judgeResult 结论：胜方 = ${result.winner}`);
    }

    if (result.caught.length > 0) {
      console.log(`🔗 被抓玩家 = [${result.caught.join(", ")}]`);
    } else {
      console.log(`🔗 本局没有被抓玩家`);
    }
  }
}

export interface DebugGameConfig {
  players: PlayerState[];
  controllers: Partial<Record<string, DecisionFn>>;
  startIndex?: number;
  maxTurns?: number;
}

/** 通用 debug 对局入口：不发牌、不洗牌，按你给的玩家 & 决策跑一整局 */
export function runDebugGame(config: DebugGameConfig) {
  const { players, controllers, startIndex = 0, maxTurns = 200 } = config;

  // 克隆一份，避免外面传进来的 players 被改坏
  const clonedPlayers: PlayerState[] = players.map((p) => ({
    ...p,
    hand: [...p.hand],
    finished: false,
    finishOrder: undefined,
  }));

  const state: GameState = {
    players: clonedPlayers,
    currentPlayerIndex: startIndex,
    lastPlay: null,
    lastPlayOwnerIndex: null,
    passesInRound: 0,
    finishCount: 0,
    gameOver: false,
    tributeSummary: null,
  };

  const engine = new GameEngine(state, controllers);

  console.log("\n========== 🧪 DEBUG 对局开始 ==========");

  let turns = 0;
  while (!state.gameOver && turns < maxTurns) {
    const allFinished = state.players.every((p) => p.finished);
    if (allFinished) break;

    engine.playAutoTurn();
    turns++;
  }

  console.log("========== 🧪 DEBUG 对局结束 ==========\n");

  return {
    state,
    result: engine.lastResult,
    engine,
    turns,
  };
}

// =============== 初始化 & 主流程 ===============

export interface CreateGameOptions {
  controllers?: Partial<Record<string, DecisionFn>>;
  playerNames?: string[];
  previousRound?: PreviousRoundSnapshot | null;
}

export function createInitialGame(
  playerCount = 6,
  options: CreateGameOptions = {}
) {
  const { controllers = {}, playerNames = [] } = options;
  const deck = shuffle([...createDeck(), ...createDeck(), ...createDeck()]);
  const players: PlayerState[] = [];

  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `P${i + 1}`,
      name: playerNames[i] ?? `玩家${i + 1}`,
      hand: [],
      finished: false,
      camp: "B",
      hasBlackA: false,
    });
  }

  // 发牌
  deck.forEach((card, idx) => {
    const p = players[idx % playerCount];
    p.hand.push(card);
  });

  // 阵营：有黑A = A 阵营
  for (const p of players) {
    p.hasBlackA = p.hand.some((c) => isBlackA(c));
    p.camp = p.hasBlackA ? "A" : "B";
  }

  const firstIndex = Math.floor(Math.random() * playerCount);

  const tributeSummary = options.previousRound
    ? applyTributeRule(players, options.previousRound)
    : null;

  const state: GameState = {
    players,
    currentPlayerIndex: firstIndex,
    lastPlay: null,
    lastPlayOwnerIndex: null,
    passesInRound: 0,
    finishCount: 0,
    gameOver: false,
    tributeSummary,
  };

  // 所有人用默认 AI（前端观战模式）
  const engine = new GameEngine(state, controllers);

  return { engine, state };
}
