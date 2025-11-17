// 点数
export type Rank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2"
  | "SJ" // small joker
  | "BJ"; // big joker

// 花色
export type Suit = "spade" | "heart" | "club" | "diamond" | "joker";

export interface Card {
  id: string; // 多副牌时用唯一id区别，例如 "d1-3-heart-1"
  rank: Rank;
  suit: Suit;
}

// 牌力顺序
const RANK_ORDER: Rank[] = [
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

export const rankToValue = (rank: Rank): number => RANK_ORDER.indexOf(rank);

export const compareCard = (a: Card, b: Card): number =>
  rankToValue(a.rank) - rankToValue(b.rank);

// 判断所有牌点数是否相同（判断对子 / 炸弹会用到）
export const isSameRank = (cards: Card[]): boolean => {
  if (cards.length === 0) return false;
  const first = cards[0].rank;
  return cards.every((c) => c.rank === first);
};

// 判断 ranks 是否是连续的（例如 [7,8,9,10,J]）
export const isConsecutive = (values: number[]): boolean => {
  if (values.length <= 1) return false;
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
};

// 帮忙判断一个 rank 是否允许出现在顺子 / 连对中
// 按斗地主规则：顺子 / 连对不能带 2、大小王
export const canBeInChain = (rank: Rank): boolean =>
  rank !== "2" && rank !== "SJ" && rank !== "BJ";

export const isBlackA = (card: Card): boolean =>
  card.rank === "A" && card.suit === "spade";

// 两张黑桃A的对子
export const isBlackAPair = (cards: Card[]): boolean =>
  cards.length === 2 &&
  cards.every((c) => c.rank === "A" && c.suit === "spade");
