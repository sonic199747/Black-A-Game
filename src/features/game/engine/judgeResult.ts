type Camp = "A" | "B";

export interface PlayerFinish {
  id: string; // 玩家ID或名字
  camp: Camp; // 阵营 A 或 B
}

export interface Result {
  winner: Camp | "DRAW"; // 胜利阵营或平局
  caught: string[]; // 被抓的玩家ID数组
}

/**
 * 根据出完牌的顺序来判断胜负和被抓玩家。
 *
 * 新规则（结合你现在的游戏逻辑）：
 *
 * - 游戏在“某一阵营所有玩家都出完牌”的那一刻立刻结束。
 * - 记这个阵营为 completedCamp。
 * - 看整局中第一个出完的玩家 first.camp 是否 == completedCamp：
 *    - 是：completedCamp 赢，另一阵营所有玩家都被抓。
 *    - 否：平局，不抓人。
 *
 * 在实现上：
 * - finishOrder 是按出完先后顺序排好的所有“已经出完的玩家”。
 * - 在游戏结束的那一刻，最后一个出完的玩家，一定是那个“刚刚完成全员出完的阵营”的最后一人。
 *   换句话说：
 *     - 如果 A 阵营先全员出完，则 lastA === finishOrder.length - 1 且 lastB < lastA；
 *     - 如果 B 阵营先全员出完，则 lastB === finishOrder.length - 1 且 lastA < lastB。
 */
export function judgeResult(finishOrder: PlayerFinish[]): Result {
  // 没人出完，平局
  if (finishOrder.length === 0) {
    return { winner: "DRAW", caught: [] };
  }

  const n = finishOrder.length;

  let lastA = -1;
  let lastB = -1;

  // 记录每个阵营最后一个完成的位置
  finishOrder.forEach((p, index) => {
    if (p.camp === "A") {
      lastA = Math.max(lastA, index);
    } else {
      lastB = Math.max(lastB, index);
    }
  });

  // 1️⃣ 推断是哪一阵营在“游戏结束的那一刻”完成了全员出完
  let completedCamp: Camp | null = null;

  if (lastA === n - 1 && lastB !== n - 1) {
    completedCamp = "A";
  } else if (lastB === n - 1 && lastA !== n - 1) {
    completedCamp = "B";
  }

  // 如果能推断出 completedCamp，就按你新规则判断
  if (completedCamp) {
    const firstCamp = finishOrder[0].camp;

    if (firstCamp === completedCamp) {
      // ✅ 胜方就是 completedCamp，另一阵营所有玩家都被抓
      const loserCamp: Camp = completedCamp === "A" ? "B" : "A";

      // 在实现中，我们只能抓到 finishOrder 里属于失败阵营的玩家
      const caught = finishOrder
        .filter((p) => p.camp === loserCamp)
        .map((p) => p.id);

      return {
        winner: completedCamp,
        caught,
      };
    } else {
      // ❌ 首出玩家不属于这一方 → 平局
      return {
        winner: "DRAW",
        caught: [],
      };
    }
  }

  // 2️⃣ 兜底逻辑（如果无法推断 completedCamp，比如两边都刚好一起打完）
  //    保留你原来的 lastA / lastB 规则作为 fallback。

  if (lastA !== -1 && (lastB === -1 || lastA < lastB)) {
    const caught = finishOrder
      .slice(lastA + 1)
      .filter((p) => p.camp === "B")
      .map((p) => p.id);
    return { winner: "A", caught };
  }

  if (lastB !== -1 && (lastA === -1 || lastB < lastA)) {
    const caught = finishOrder
      .slice(lastB + 1)
      .filter((p) => p.camp === "A")
      .map((p) => p.id);
    return { winner: "B", caught };
  }

  return {
    winner: "DRAW",
    caught: [],
  };
}
