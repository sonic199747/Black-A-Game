// src/features/game/engine/manualController.ts
// 简化的手动控制器类型定义，兼容网络和本地游戏
import { Card } from "./cards";
import { DecisionContext } from "./gameEngineDemo";

/**
 * 手动决策请求
 */
export interface ManualDecisionRequest {
  playerId: string;
  playerName: string;
  playerIndex: number;
  context: DecisionContext;
}

/**
 * 手动决策控制器
 * 用于将异步的用户输入转换为同步的决策函数
 */
export class ManualDecisionController {
  private pendingResolver: ((cards: Card[] | null) => void) | null = null;

  /**
   * 获取决策函数，用于注入到 GameEngine 中
   */
  getDecisionFn() {
    return () => {
      // 同步等待不可行，返回 null 表示暂时 PASS
      // 实际决策通过 submitDecision 异步提供
      return null;
    };
  }

  /**
   * 提交玩家的决策
   */
  submitDecision(cards: Card[] | null): void {
    if (this.pendingResolver) {
      this.pendingResolver(cards);
      this.pendingResolver = null;
    }
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.pendingResolver = null;
  }
}
