import {
  judgeResult,
  PlayerFinish,
  Result,
} from "../../src/features/game/engine/judgeResult";
type Camp = "A" | "B";

describe("judgeResult（基于当前实现版本）", () => {
  const make = (id: string, camp: Camp): PlayerFinish => ({ id, camp });

  test("A 阵营最后完成，且第一个出完的是 A → A 赢，所有 B 被抓", () => {
    // 出完顺序：
    // A1(0), B1(1), B2(2), A2(3), A3(4)
    // lastA = 4 = n-1，lastB = 2 → completedCamp = "A"
    // firstCamp = "A" → winner = "A"
    // caught = 所有 B 阵营的玩家 = [B1, B2]
    const finishOrder: PlayerFinish[] = [
      make("A1", "A"),
      make("B1", "B"),
      make("B2", "B"),
      make("A2", "A"),
      make("A3", "A"),
    ];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("A");
    expect(result.caught.sort()).toEqual(["B1", "B2"].sort());
  });

  test("A 阵营最后完成，但第一个出完的是 B → 平局、不抓人", () => {
    // B1(0), B2(1), A1(2), A2(3), A3(4)
    // lastA = 4 = n-1，lastB = 1 → completedCamp = "A"
    // firstCamp = "B" → 平局
    const finishOrder: PlayerFinish[] = [
      make("B1", "B"),
      make("B2", "B"),
      make("A1", "A"),
      make("A2", "A"),
      make("A3", "A"),
    ];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("DRAW");
    expect(result.caught).toEqual([]);
  });

  test("B 阵营最后完成，且第一个出完的是 B → B 赢，所有 A 被抓", () => {
    // B1(0), A1(1), A2(2), B2(3), B3(4)
    // lastB = 4 = n-1，lastA = 2 → completedCamp = "B"
    // firstCamp = "B" → winner = "B"
    // caught = 所有 A = [A1, A2]
    const finishOrder: PlayerFinish[] = [
      make("B1", "B"),
      make("A1", "A"),
      make("A2", "A"),
      make("B2", "B"),
      make("B3", "B"),
    ];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("B");
    expect(result.caught.sort()).toEqual(["A1", "A2"].sort());
  });

  test("B 阵营最后完成，但第一个出完的是 A → 平局", () => {
    // A1(0), A2(1), B1(2), B2(3), B3(4)
    // lastB = 4 = n-1，lastA = 1 → completedCamp = "B"
    // firstCamp = "A" → 平局
    const finishOrder: PlayerFinish[] = [
      make("A1", "A"),
      make("A2", "A"),
      make("B1", "B"),
      make("B2", "B"),
      make("B3", "B"),
    ];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("DRAW");
    expect(result.caught).toEqual([]);
  });

  test("极端情况：只有 A 阵营有人 → A 完成且首出也是 A → A 赢，但无 B 被抓", () => {
    // A1(0), A2(1)
    // lastA = 1 = n-1，lastB = -1 → completedCamp = "A"
    // firstCamp = "A" → winner = "A"
    // caught = 所有 B（这里一个都没有） → []
    const finishOrder: PlayerFinish[] = [make("A1", "A"), make("A2", "A")];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("A");
    expect(result.caught).toEqual([]);
  });

  test("极端情况：只有 B 阵营有人 → B 完成且首出也是 B → B 赢，但无 A 被抓", () => {
    const finishOrder: PlayerFinish[] = [make("B1", "B"), make("B2", "B")];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("B");
    expect(result.caught).toEqual([]);
  });

  test("失败阵营还有人未出完时，只能抓到顺序里出现过的对手", () => {
    // A1(0), B1(1), A2(2), A3(3)
    // lastA = 3 = n-1 → completedCamp = "A"
    // firstCamp = "A" → winner = "A"
    // caught 只能拿到 finishOrder 中 camp = B 的玩家，即 B1
    const finishOrder: PlayerFinish[] = [
      make("A1", "A"),
      make("B1", "B"),
      make("A2", "A"),
      make("A3", "A"),
    ];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("A");
    expect(result.caught).toEqual(["B1"]);
  });

  test("空数组：没有人出完 → 平局", () => {
    const finishOrder: PlayerFinish[] = [];

    const result: Result = judgeResult(finishOrder);

    expect(result.winner).toBe("DRAW");
    expect(result.caught).toEqual([]);
  });
});
