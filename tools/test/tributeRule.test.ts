import { Card, rankToValue } from "../../src/features/game/engine/cards";
import {
  applyTributeRule,
  PlayerState,
  PreviousRoundSnapshot,
} from "../../src/features/game/engine/gameEngineDemo";

const makeCard = (id: string, rank: Card["rank"], suit: Card["suit"]): Card => ({
  id,
  rank,
  suit,
});

const makePlayer = (overrides: Partial<PlayerState>): PlayerState => ({
  id: "P1",
  name: "玩家1",
  hand: [],
  finished: false,
  finishOrder: undefined,
  camp: "A",
  hasBlackA: false,
  ...overrides,
});

describe("applyTributeRule", () => {
  test("returns null when没有胜利阵营或没有被抓玩家", () => {
    const players: PlayerState[] = [
      makePlayer({ id: "P1", name: "A1" }),
      makePlayer({ id: "P2", name: "B1", camp: "B" }),
    ];

    const snapshot: PreviousRoundSnapshot = {
      result: { winner: "DRAW", caught: [] },
      players: players.map(({ id, name, camp }) => ({ id, name, camp })),
    };

    const summary = applyTributeRule(players, snapshot, () => 0.1);
    expect(summary).toBeNull();
  });

  test("被抓玩家会交出最大牌且胜利阵营仅返还≤10的牌", () => {
    const players: PlayerState[] = [
      makePlayer({
        id: "P1",
        name: "A1",
        hand: [
          makeCard("c1", "9", "heart"),
          makeCard("c2", "Q", "spade"),
          makeCard("c11", "4", "club"),
        ],
      }),
      makePlayer({
        id: "P2",
        name: "A2",
        hand: [
          makeCard("c3", "7", "club"),
          makeCard("c4", "J", "diamond"),
          makeCard("c5", "3", "spade"),
        ],
      }),
      makePlayer({
        id: "P3",
        name: "B1",
        camp: "B",
        hand: [
          makeCard("c6", "K", "diamond"),
          makeCard("c7", "A", "spade"), // 黑桃A，不能被进贡
          makeCard("c8", "2", "club"),
          makeCard("c9", "BJ", "joker"),
          makeCard("c10", "10", "heart"),
        ],
      }),
      makePlayer({
        id: "P4",
        name: "B2",
        camp: "B",
        hand: [makeCard("c12", "5", "diamond")],
      }),
    ];

    const snapshot: PreviousRoundSnapshot = {
      result: { winner: "A", caught: ["P3"] },
      players: [
        { id: "P1", name: "A1", camp: "A" },
        { id: "P2", name: "A2", camp: "A" },
        { id: "P3", name: "B1", camp: "B" },
        { id: "P4", name: "B2", camp: "B" },
      ],
    };

    const summary = applyTributeRule(players, snapshot, () => 0);
    expect(summary).not.toBeNull();
    expect(summary?.winnerCamp).toBe("A");
    expect(summary?.exchanges).toHaveLength(1);

    const exchange = summary!.exchanges[0];
    expect(exchange.giverId).toBe("P3");
    expect(exchange.tributeCards).toHaveLength(2);
    expect(exchange.tributeCards.map((t) => t.card.rank).sort()).toEqual(
      ["2", "BJ"].sort()
    );

    expect(exchange.returnCards).toHaveLength(2);
    const maxReturnValue = rankToValue("10");
    expect(
      exchange.returnCards.every(
        (ret) => rankToValue(ret.card.rank) <= maxReturnValue
      )
    ).toBe(true);
    expect(exchange.returnCards.map((t) => t.card.rank).sort()).toEqual(
      ["3", "9"].sort()
    );

    const giverHandRanks = players
      .find((p) => p.id === "P3")!
      .hand.map((card) => card.rank)
      .sort();
    expect(giverHandRanks).toEqual(["10", "3", "9", "A", "K"]);
    expect(
      players
        .find((p) => p.id === "P3")!
        .hand.some((card) => card.rank === "A" && card.suit === "spade")
    ).toBe(true);

    const winnerOneRanks = players
      .find((p) => p.id === "P1")!
      .hand.map((card) => card.rank);
    expect(winnerOneRanks).toContain("BJ");
    expect(winnerOneRanks).not.toContain("9"); // 9 被返还
  });
});
