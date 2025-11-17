// logic/plays.ts
import {
  canBeInChain,
  Card,
  isBlackA,
  isBlackAPair,
  isConsecutive,
  isSameRank,
  rankToValue,
} from "./cards";

// 出牌类型
export type PlayType =
  | "SINGLE" // 单张
  | "PAIR" // 对子
  | "CHAIN_PAIR" // 连对（至少3个连续对子，最大到对A）
  | "TRIPLE" // 三张
  | "CHAIN_TRIPLE" // 连续三张（至少2组，最大到AAA）
  | "STRAIGHT" // 新增：顺子
  | "FOUR_BOMB" // 4张炸弹
  | "FIVE_BOMB" // 5张炸弹
  | "BOMB" // 普通炸弹：4张及以上同点数
  | "JOKER_BOMB"; // 王炸：小王+大王

// 一次出牌
export interface Play {
  type: PlayType;
  cards: Card[];
  mainValue: number;
}

// 根据一组选中的牌，判断这是不是合法出牌
export function classifyPlay(cards: Card[]): Play | null {
  const n = cards.length;
  if (n === 0) return null;

  // 单张
  if (n === 1) {
    const c = cards[0];

    // 普通单张的点数
    let value = rankToValue(c.rank);

    // 特殊：单张黑桃A，插在 2 和 小王之间
    if (isBlackA(c)) {
      const v2 = rankToValue("2");
      const vSJ = rankToValue("SJ");
      value = (v2 + vSJ) / 2; // 在 2 和 SJ 中间找个值
    }

    return {
      type: "SINGLE",
      cards,
      mainValue: value,
    };
  }

  // 对子
  if (n === 2 && isSameRank(cards)) {
    let value = rankToValue(cards[0].rank);

    // 特殊：两张黑桃A的对子，牌力大于所有对子（包括对大王）
    if (isBlackAPair(cards)) {
      const vBJ = rankToValue("BJ");
      value = vBJ + 1; // 比对大王再大一档
    }

    return {
      type: "PAIR",
      cards,
      mainValue: value,
    };
  }

  // 王炸：小王 + 大王
  if (n === 2) {
    const ranks = cards.map((c) => c.rank);
    // 不论顺序，只要包含 SJ 和 BJ 即为王炸
    if (ranks.includes("SJ") && ranks.includes("BJ")) {
      return {
        type: "JOKER_BOMB",
        cards,
        // mainValue 用不到，随便给个大数占位
        mainValue: Number.MAX_SAFE_INTEGER,
      };
    }
  }

  // 三张
  if (n === 3 && isSameRank(cards)) {
    const value = rankToValue(cards[0].rank);
    return {
      type: "TRIPLE",
      cards,
      mainValue: value,
    };
  }

  // 普通炸弹：从4张同点数开始
  if (n >= 4 && isSameRank(cards)) {
    const r = cards[0].rank;
    return {
      type: "BOMB",
      cards,
      mainValue: rankToValue(r),
    };
  }

  // 连对（至少3个连续对子，最大到对A）
  if (n >= 6 && n % 2 === 0) {
    const countMap = new Map<string, number>();

    for (const c of cards) {
      if (!canBeInChain(c.rank)) {
        // 包含 2 或王，不能作为连对的基础牌型
        countMap.clear();
        break;
      }
      const key = c.rank;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    if (countMap.size > 0) {
      const ranks = Array.from(countMap.keys());
      // 要至少3种不同点数并且每种出现恰好2次，才是连对
      if (ranks.length >= 3 && ranks.every((r) => countMap.get(r)! === 2)) {
        const values = ranks.map((r) => rankToValue(r as any));
        if (isConsecutive(values)) {
          const maxValue = Math.max(...values);
          const valueOfA = rankToValue("A");
          if (maxValue <= valueOfA) {
            return {
              type: "CHAIN_PAIR",
              cards,
              mainValue: maxValue,
            };
          }
        }
      }
    }
    // 如果不满足连对的严格条件，别直接返回 null，让后续的牌型判定继续
  }

  // 连续三张（至少2组，每组三张，最大到AAA）
  if (n >= 6 && n % 3 === 0) {
    const countMap = new Map<string, number>();

    for (const c of cards) {
      if (!canBeInChain(c.rank)) {
        // 含 2 / 王，则不能作为连续三张的基础牌型
        countMap.clear();
        break;
      }
      const key = c.rank;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    if (countMap.size > 0) {
      const ranks = Array.from(countMap.keys());
      // 至少2种不同点数（至少2组三张）
      if (ranks.length >= 2 && ranks.every((r) => countMap.get(r)! === 3)) {
        const values = ranks.map((r) => rankToValue(r as any));
        if (!isConsecutive(values)) return null;

        const maxValue = Math.max(...values);
        const valueOfA = rankToValue("A");
        if (maxValue > valueOfA) return null;

        return {
          type: "CHAIN_TRIPLE",
          cards,
          mainValue: maxValue,
        };
      }
    }
  }

  // 顺子（至少5张，最大到A，不含2和王）
  if (n >= 5) {
    // 检查有没有 2 / 王，顺子不能包括这些
    for (const c of cards) {
      if (!canBeInChain(c.rank)) {
        return null; // 含 2 / SJ / BJ，直接非法
      }
    }

    // 统计各点数出现次数
    const countMap = new Map<string, number>();
    for (const c of cards) {
      const r = c.rank;
      countMap.set(r, (countMap.get(r) ?? 0) + 1);
    }

    const ranks = [...countMap.keys()];

    // 顺子要求每个点数只出现一次
    if (ranks.length !== n) {
      // 张数和不同点数数量不一致 → 有重复点数 → 不是顺子
      return null;
    }

    const values = ranks.map((r) => rankToValue(r as any));
    if (!isConsecutive(values)) return null;

    const maxValue = Math.max(...values);
    const valueOfA = rankToValue("A");
    if (maxValue > valueOfA) return null; // 最大不能超过A

    return {
      type: "STRAIGHT",
      cards,
      mainValue: maxValue,
    };
  }

  // 不属于目前支持的任何牌型
  return null;
}

// =============================
// 能不能管上家 canBeat()
// =============================
export function canBeat(current: Play | null, next: Play): boolean {
  // 本轮没人出牌，任何合法出牌都可以
  if (!current) return true;

  // 特殊：对黑A可以压所有单张
  if (
    next.type === "PAIR" &&
    isBlackAPair(next.cards) &&
    current.type === "SINGLE"
  ) {
    return true;
  }

  const currentIsBomb =
    current.type === "BOMB" || current.type === "JOKER_BOMB";
  const nextIsBomb = next.type === "BOMB" || next.type === "JOKER_BOMB";

  // 情况1：桌面不是炸弹，我出炸弹 → 一定能压住
  if (!currentIsBomb && nextIsBomb) {
    return true;
  }

  // 情况2：桌面是炸弹，我不是炸弹 → 一定压不住
  if (currentIsBomb && !nextIsBomb) {
    return false;
  }

  // 情况3：都是炸弹 → 用炸弹规则比较
  if (currentIsBomb && nextIsBomb) {
    const sCur = getBombStrength(current);
    const sNext = getBombStrength(next);

    if (sNext !== sCur) {
      // 长度优先：5炸 > 王炸 > 4炸，以此类推
      return sNext > sCur;
    }

    // 同一长度的普通炸弹才比点数；王炸之间不需要互压
    if (current.type === "BOMB" && next.type === "BOMB") {
      return next.mainValue > current.mainValue;
    }
    return false;
  }

  // 走到这里说明：双方都不是炸弹、也不是炸 vs 非炸
  // → 必须牌型相同才能比较
  if (current.type !== next.type) return false;

  switch (current.type) {
    case "SINGLE":
    case "PAIR":
    case "TRIPLE":
      // 这些纯看点数
      return next.mainValue > current.mainValue;

    case "CHAIN_PAIR":
    case "CHAIN_TRIPLE":
    case "STRAIGHT":
      // 连对 / 连续三张 / 顺子：长度也要一致
      if (current.cards.length !== next.cards.length) return false;
      return next.mainValue > current.mainValue;

    // BOMB / JOKER_BOMB 已经在上面处理过
    default:
      return false;
  }
}
function getBombStrength(play: Play): number {
  if (play.type === "BOMB") {
    // 普通炸弹：用「长度」作为主维度
    // 4张 → 4，5张 → 5，6张 → 6 ...
    return play.cards.length;
  }
  if (play.type === "JOKER_BOMB") {
    // 王炸：长度视为介于4张和5张之间
    // 这样：任何5张炸弹(5) > 王炸(4.5) > 所有4张炸弹(4)
    return 4.5;
  }
  throw new Error("Not a bomb type");
}
