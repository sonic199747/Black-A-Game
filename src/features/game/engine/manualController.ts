import { Card } from "./cards";
import { DecisionContext, DecisionFn, GameState } from "./gameEngineDemo";

export interface ManualDecisionRequest {
  playerId: string;
  playerName: string;
  playerIndex: number;
  context: DecisionContext;
}

const NO_DECISION: unique symbol = Symbol("NO_DECISION");

export class ManualDecisionNeeded extends Error {
  constructor(public readonly request: ManualDecisionRequest) {
    super("Manual decision required");
  }
}

/**
 * 帮助我们在同步的 GameEngine 中插入“真人决策”：
 * - GameEngine 调用决策器时，如果玩家还没在 UI 中选择牌，就抛出 ManualDecisionNeeded
 * - UI 捕获该错误后展示交互界面
 * - 玩家点击出牌/Pass 后调用 submitDecision，再次推进引擎即可
 */
export class ManualDecisionController {
  private pendingDecision: Card[] | null | typeof NO_DECISION = NO_DECISION;
  private currentRequest: ManualDecisionRequest | null = null;

  private decisionFn = (
    state: GameState,
    playerIndex: number,
    context: DecisionContext
  ): Card[] | null => {
    if (this.pendingDecision === NO_DECISION) {
      const player = state.players[playerIndex];
      const request: ManualDecisionRequest = {
        playerId: player.id,
        playerName: player.name,
        playerIndex,
        context,
      };
      this.currentRequest = request;
      throw new ManualDecisionNeeded(request);
    }

    const decision = this.pendingDecision;
    this.pendingDecision = NO_DECISION;
    this.currentRequest = null;
    return decision ?? null;
  };

  /** 暴露给 GameEngine 的决策函数 */
  getDecisionFn(): DecisionFn {
    return this.decisionFn;
  }

  /** 当玩家在 UI 中做出选择时，写入决策，让下一次推进可以读取 */
  submitDecision(decision: Card[] | null) {
    this.pendingDecision = decision;
  }

  /** 当前是否有等待中的真人指令 */
  get pendingRequest(): ManualDecisionRequest | null {
    return this.currentRequest;
  }

  /** 如果需要（例如重新开局）可以清理状态 */
  reset() {
    this.pendingDecision = NO_DECISION;
    this.currentRequest = null;
  }
}
