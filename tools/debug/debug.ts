import { Card } from "../../src/logic/cards";
import { PlayerState, DecisionFn, runDebugGame } from "../../src/logic/gameEngineDemo";

// 小工具：造一张随便的牌
const dummy = (id: string): Card => ({
  id,
  suit: "spade",
  rank: "3",
});

// 一次性把所有手牌打光
const playAll: DecisionFn = (state, i) => {
  return [...state.players[i].hand];
};

// 永远 PASS
const passAll: DecisionFn = () => null;

/** 你真正要跑的调试场景 */
export function debugGame() {
  console.log(
    "▶️ 运行 debugGame 场景 1: 模拟 A 阵营先全部出完, B 阵营剩 1 人被抓"
  );

  const players: PlayerState[] = [
    // 注意：这里我们直接指定阵营，不走发牌/黑A逻辑
    {
      id: "P1",
      name: "P1",
      camp: "B",
      hasBlackA: false,
      hand: [dummy("c1")], // 故意让他最后没出完
      finished: false,
    },
    {
      id: "P2",
      name: "P2",
      camp: "A",
      hasBlackA: true,
      hand: [dummy("c2")],
      finished: false,
    },
    {
      id: "P3",
      name: "P3",
      camp: "B",
      hasBlackA: false,
      hand: [dummy("c3")],
      finished: false,
    },
    {
      id: "P4",
      name: "P4",
      camp: "A",
      hasBlackA: true,
      hand: [dummy("c4")],
      finished: false,
    },
    {
      id: "P5",
      name: "P5",
      camp: "B",
      hasBlackA: false,
      hand: [dummy("c5")],
      finished: false,
    },
    {
      id: "P6",
      name: "P6",
      camp: "B",
      hasBlackA: false,
      hand: [dummy("c6")],
      finished: false,
    },
  ];

  // 控制出牌顺序：
  // 想要的 finish 顺序：P2(A) → P5(B) → P6(B) → P3(B) → P4(A)，P1 未出完
  const controllers: Partial<Record<string, DecisionFn>> = {
    P2: playAll,
    P5: playAll,
    P6: playAll,
    P3: playAll,
    P4: playAll,
    P1: passAll,
  };

  const { result, turns } = runDebugGame({
    players,
    controllers,
    startIndex: 1, // 先手 P2
  });

  console.log("🔍 Debug 对局总回合数：", turns);
  console.log("🔚 Debug 最终结果：", result);
}

// 直接跑
debugGame();
