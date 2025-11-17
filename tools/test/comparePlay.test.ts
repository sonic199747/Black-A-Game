import {
  classifyPlay,
  canBeat,
  type Play,
} from "../../src/features/game/engine/plays";
import type {
  Card,
  Rank,
  Suit,
} from "../../src/features/game/engine/cards";

// 简单造牌工具：自动生成 id，方便测试
let idCounter = 0;
const makeCard = (rank: Rank, suit: Suit = "spade"): Card => ({
  id: `test-${idCounter++}`,
  rank,
  suit,
});

const makeCards = (ranks: Rank[], suit: Suit = "spade"): Card[] =>
  ranks.map((r) => makeCard(r, suit));

// 用一串 rank 直接生成 Play（默认同花色）
function makePlay(ranks: Rank[], suit: Suit = "spade"): Play {
  const cards = makeCards(ranks, suit);
  const play = classifyPlay(cards);
  if (!play) {
    throw new Error("Invalid play in test: " + JSON.stringify(cards));
  }
  return play;
}

describe("classifyPlay 牌型识别健壮性", () => {
  test("可以识别符合条件的连续三张", () => {
    const cards = makeCards(["5", "5", "5", "6", "6", "6"], "spade");
    const play = classifyPlay(cards);
    expect(play?.type).toBe("CHAIN_TRIPLE");
  });

  test("顺子不能包含 2 或大小王", () => {
    const withTwo = makeCards(["10", "J", "Q", "K", "A", "2"]);
    const withJoker = [
      ...makeCards(["7", "8", "9", "10"], "heart"),
      makeCard("SJ", "joker"),
    ];

    expect(classifyPlay(withTwo)).toBeNull();
    expect(classifyPlay(withJoker)).toBeNull();
  });

  test("顺子不能有重复点数", () => {
    const cards = makeCards(["5", "5", "6", "7", "8"]);
    expect(classifyPlay(cards)).toBeNull();
  });

  test("连对包含 2 时应判定为非法", () => {
    const cards = [
      ...makeCards(["3", "3", "4", "4", "5", "5"]),
      ...makeCards(["2", "2"]),
    ];
    expect(classifyPlay(cards)).toBeNull();
  });
});

describe("canBeat / compare 基础规则", () => {
  test("当前没人出牌时，任何合法出牌都可以出", () => {
    const next = makePlay(["3"]);
    expect(canBeat(null, next)).toBe(true);
  });

  test("同为单张，点数大的可以压点数小的", () => {
    const cur = makePlay(["5"]);
    const next = makePlay(["7"]);

    expect(canBeat(cur, next)).toBe(true);
    expect(canBeat(next, cur)).toBe(false);
  });

  test("同为对子，点数大的可以压点数小的", () => {
    const cur = makePlay(["7", "7"]);
    const next = makePlay(["9", "9"]);

    expect(canBeat(cur, next)).toBe(true);
    expect(canBeat(next, cur)).toBe(false);
  });

  test("不同牌型之间（非炸弹）不能互相压", () => {
    const singleA = makePlay(["A"], "heart");
    const pairK = makePlay(["K", "K"], "club");

    expect(canBeat(singleA, pairK)).toBe(false);
    expect(canBeat(pairK, singleA)).toBe(false);
  });
});

describe("炸弹 / 王炸 规则", () => {
  test("任意炸弹都可以压非炸弹", () => {
    const curSingle = makePlay(["A"], "heart");
    const bomb4 = makePlay(["9", "9", "9", "9"], "club");

    expect(canBeat(curSingle, bomb4)).toBe(true);
    expect(canBeat(bomb4, curSingle)).toBe(false);
  });

  test("更长的普通炸弹 > 更短的普通炸弹", () => {
    const bomb4 = makePlay(["8", "8", "8", "8"], "spade");
    const bomb5 = makePlay(["7", "7", "7", "7", "7"], "heart");

    expect(canBeat(bomb4, bomb5)).toBe(true); // 5张炸 > 4张炸
    expect(canBeat(bomb5, bomb4)).toBe(false);
  });

  test("王炸介于 4 炸 和 5 炸之间", () => {
    const bomb4 = makePlay(["8", "8", "8", "8"], "club");
    const jokerBomb = makePlay(["SJ", "BJ"], "joker");
    const bomb5 = makePlay(["7", "7", "7", "7", "7"], "diamond");

    // 王炸 > 所有 4 张普通炸弹
    expect(canBeat(bomb4, jokerBomb)).toBe(true);
    // 但 5 张炸弹 > 王炸
    expect(canBeat(jokerBomb, bomb5)).toBe(true);
    expect(canBeat(bomb5, jokerBomb)).toBe(false);
  });

  test("同长度的普通炸弹按点数比较；王炸之间不能互相压", () => {
    const bomb7777 = makePlay(["7", "7", "7", "7"], "spade");
    const bomb8888 = makePlay(["8", "8", "8", "8"], "heart");
    const jokerBomb1 = makePlay(["SJ", "BJ"], "joker");
    const jokerBomb2 = makePlay(["SJ", "BJ"], "joker");

    expect(canBeat(bomb7777, bomb8888)).toBe(true);
    expect(canBeat(bomb8888, bomb7777)).toBe(false);

    // 两个王炸互相都不能压
    expect(canBeat(jokerBomb1, jokerBomb2)).toBe(false);
    expect(canBeat(jokerBomb2, jokerBomb1)).toBe(false);
  });
});

describe("连对 / 连续三张 / 顺子 比较规则", () => {
  test("连对：长度必须一致且点数更大才可以压", () => {
    // 33 44 55
    const cur = makePlay(["3", "3", "4", "4", "5", "5"], "heart");
    // 44 55 66
    const bigger = makePlay(["4", "4", "5", "5", "6", "6"], "club");
    // 长度不同（33 44 55 66）
    const longer = makePlay(["3", "3", "4", "4", "5", "5", "6", "6"], "spade");

    expect(canBeat(cur, bigger)).toBe(true);
    expect(canBeat(bigger, cur)).toBe(false);
    expect(canBeat(cur, longer)).toBe(false); // 长度不同，不能压
  });

  test("连续三张：长度必须一致且点数更大才可以压", () => {
    // 333 444
    const cur = makePlay(["3", "3", "3", "4", "4", "4"], "diamond");
    // 444 555
    const bigger = makePlay(["4", "4", "4", "5", "5", "5"], "club");

    expect(canBeat(cur, bigger)).toBe(true);
    expect(canBeat(bigger, cur)).toBe(false);
  });

  test("顺子：长度必须一致且点数更大才可以压", () => {
    const cur = makePlay(["3", "4", "5", "6", "7"], "spade");
    const sameLenBigger = makePlay(["4", "5", "6", "7", "8"], "heart");
    const diffLen = makePlay(["3", "4", "5", "6", "7", "8"], "club");

    expect(canBeat(cur, sameLenBigger)).toBe(true);
    expect(canBeat(cur, diffLen)).toBe(false);
  });
});

describe("黑桃 A / 对黑A 特殊牌力", () => {
  test("单张黑桃A 介于 2 和 小王之间（只能大致比较，不测具体数值）", () => {
    // 用不同花色的 2 避免误伤 isBlackA
    const twoHeart = makePlay(["2"], "heart");
    const blackASingle = makePlay(["A"], "spade"); // 黑桃A
    const smallJoker = makePlay(["SJ"], "joker");

    // 黑桃A 可以压 2
    expect(canBeat(twoHeart, blackASingle)).toBe(true);
    expect(canBeat(blackASingle, twoHeart)).toBe(false);

    // 小王 可以压 黑桃A
    expect(canBeat(blackASingle, smallJoker)).toBe(true);
    expect(canBeat(smallJoker, blackASingle)).toBe(false);
  });

  test("对黑桃A 的对子大于所有其他对子（包括对大王）", () => {
    const blackAPair = makePlay(["A", "A"], "spade"); // 两张黑桃A
    const pairKK = makePlay(["K", "K"], "heart");
    const pair22 = makePlay(["2", "2"], "club");
    const bigJokerPair = makePlay(["BJ", "BJ"], "joker");

    // 别人不能压对黑A
    expect(canBeat(blackAPair, pairKK)).toBe(false);
    expect(canBeat(blackAPair, pair22)).toBe(false);
    expect(canBeat(blackAPair, bigJokerPair)).toBe(false);

    // 对黑A 可以压其他任意对子
    expect(canBeat(pairKK, blackAPair)).toBe(true);
    expect(canBeat(pair22, blackAPair)).toBe(true);
    expect(canBeat(bigJokerPair, blackAPair)).toBe(true);
  });

  test("对黑A 可以压任意单张（你的特殊规则）", () => {
    const blackAPair = makePlay(["A", "A"], "spade"); // 对黑A

    const single3 = makePlay(["3"], "heart");
    const single2 = makePlay(["2"], "club");
    const singleBJ = makePlay(["BJ"], "joker");

    // 只要 current 是单张，next 是对黑A，就能压
    expect(canBeat(single3, blackAPair)).toBe(true);
    expect(canBeat(single2, blackAPair)).toBe(true);
    expect(canBeat(singleBJ, blackAPair)).toBe(true);
  });
});
