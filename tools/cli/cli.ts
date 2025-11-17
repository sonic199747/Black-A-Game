import readlineSync from "readline-sync";
import { Card, isBlackA } from "../logic/cards";
import {
  GameEngine,
  GameState,
  PlayerState,
  DecisionFn,
  Camp,
  createDeck,
  shuffle,
} from "../logic/gameEngineDemo"; // 路径按你的项目调整

// ========= 小工具：格式化牌 =========

function formatCard(card: Card): string {
  const suitMap: Record<Card["suit"], string> = {
    spade: "♠",
    heart: "♥",
    club: "♣",
    diamond: "♦",
    joker: "JOKER",
  };
  return `${suitMap[card.suit]}${card.rank}`;
}

function formatHand(hand: Card[]): string {
  return hand.map((c, idx) => `${idx}: ${formatCard(c)}`).join("  |  ");
}

// ========= 人类玩家决策器（同步版） =========

/**
 * 命令行版人类决策：
 * - 展示当前手牌（带索引）
 * - 输入：0 3 4  表示出这几张
 * - 输入：p 或空  表示 PASS
 */
const humanDecision: DecisionFn = (state: GameState, playerIndex: number) => {
  const player = state.players[playerIndex];

  console.log("\n==============================");
  console.log(
    `🧍 轮到你出牌：${player.name}（阵营=${player.camp}，手牌=${player.hand.length}）`
  );
  console.log(`你的手牌：`);
  console.log(formatHand(player.hand));

  if (state.lastPlay) {
    const lastOwner =
      state.lastPlayOwnerIndex != null
        ? state.players[state.lastPlayOwnerIndex].name
        : "未知";
    console.log(`\n桌面当前牌型持有者：${lastOwner}`);
    console.log(
      `（具体牌型结构在日志里就不展开了，有需要可以自己打印 state.lastPlay）`
    );
  } else {
    console.log("\n桌面目前为空，你可以任意首出。");
  }

  console.log(
    "\n请输入要出的牌索引（用空格分隔），例如：0 3 4\n" +
      "输入 p 或直接回车 表示 PASS。\n"
  );

  const input = readlineSync.question("> ").trim();

  if (input === "" || input.toLowerCase() === "p") {
    console.log("🙅 你选择了 PASS");
    return null;
  }

  const parts = input.split(/\s+/);
  const indexes: number[] = [];

  for (const p of parts) {
    const n = Number(p);
    if (Number.isNaN(n)) {
      console.log(`⚠️ 无法解析索引：${p}，忽略。`);
      continue;
    }
    if (n < 0 || n >= player.hand.length) {
      console.log(
        `⚠️ 索引越界：${p}（合法范围为 0 ~ ${player.hand.length - 1}），忽略。`
      );
      continue;
    }
    indexes.push(n);
  }

  if (indexes.length === 0) {
    console.log("⚠️ 没有有效索引，视为 PASS");
    return null;
  }

  // 根据索引取出要出的牌
  const chosen = indexes.map((i) => player.hand[i]);

  console.log(
    `✅ 你选择出的牌：${chosen
      .map(formatCard)
      .join(" ")} （注意：具体是否合法会在引擎里校验）`
  );

  // 这里不做 classifyPlay / canBeat 校验，
  // 让 GameEngine.executePlay 统一处理合法性和“压不住”的情况
  return chosen;
};

// ========= 主流程（命令行版游戏） =========

function main() {
  console.log("🎮 欢迎来到命令行版抓黑A！（你将扮演 玩家1）");

  const deck = shuffle([...createDeck(), ...createDeck(), ...createDeck()]);
  const playerCount = 6;
  const players: PlayerState[] = [];

  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `P${i + 1}`,
      name: `玩家${i + 1}`,
      hand: [],
      finished: false,
      camp: "B" as Camp,
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

  console.log("\n🃏 发牌完成，玩家阵营：");
  for (const p of players) {
    console.log(
      `- ${p.name}（id=${p.id}）：阵营=${p.camp}，是否有黑A=${
        p.hasBlackA ? "是" : "否"
      }，手牌数=${p.hand.length}`
    );
  }

  // 任选一个先手，这里沿用你原来的随机先手
  const firstIndex = Math.floor(Math.random() * playerCount);

  const state: GameState = {
    players,
    currentPlayerIndex: firstIndex,
    lastPlay: null,
    lastPlayOwnerIndex: null,
    passesInRound: 0,
    finishCount: 0,
    gameOver: false,
  };

  // 控制器：P1 为人类，其余默认 AI
  const controllers: Partial<Record<string, DecisionFn>> = {
    P1: humanDecision,
    // 其他玩家不写 = 走 GameEngine 内部的 defaultSingleAIDecision
  };

  const engine = new GameEngine(state, controllers);

  console.log(`\n🎮 游戏开始！先手玩家：${players[firstIndex].name}`);
  console.log("（你控制的是 玩家1，如果先手不是你，就先看别人出牌）");

  const MAX_TURNS = 500;
  let turn = 0;

  while (turn < MAX_TURNS && !state.gameOver) {
    const allFinished = state.players.every((p) => p.finished);
    if (allFinished) break;

    engine.playAutoTurn();
    turn++;
  }

  if (turn >= MAX_TURNS) {
    console.log("\n⚠️ 到达最大回合数，可能逻辑有问题需要排查。");
  }

  console.log("\n👋 游戏结束，感谢游玩命令行版抓黑A！");
}

main();
