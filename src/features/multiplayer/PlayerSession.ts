import { Card } from "../game/engine/cards";
import { DecisionFn } from "../game/engine/gameEngineDemo";
import {
  ManualDecisionController,
  ManualDecisionRequest,
} from "../game/engine/manualController";

export type PlayerSessionKind = "AI" | "MANUAL";

export interface PlayerSessionOptions {
  id?: string;
  displayName: string;
  kind: PlayerSessionKind;
  decisionFn?: DecisionFn;
}

type ManualRequestListener = (request: ManualDecisionRequest) => void;

export class PlayerSession {
  readonly id: string;
  readonly displayName: string;
  readonly kind: PlayerSessionKind;

  private manualController?: ManualDecisionController | null;
  private readonly listeners = new Set<ManualRequestListener>();
  private externalDecisionFn?: DecisionFn;
  private _seatIndex: number | null = null;
  private _pendingManualRequest: ManualDecisionRequest | null = null;

  constructor(options: PlayerSessionOptions) {
    this.id = options.id ?? PlayerSession.createSessionId();
    this.displayName = options.displayName;
    this.kind = options.kind;
    this.externalDecisionFn = options.decisionFn;
    this.manualController =
      this.kind === "MANUAL" ? new ManualDecisionController() : null;
  }

  get seatIndex(): number | null {
    return this._seatIndex;
  }

  assignSeat(index: number | null) {
    this._seatIndex = index;
  }

  get pendingManualRequest(): ManualDecisionRequest | null {
    return this._pendingManualRequest;
  }

  getDecisionFn(): DecisionFn | undefined {
    if (this.kind === "MANUAL") {
      return this.manualController?.getDecisionFn();
    }
    return this.externalDecisionFn;
  }

  setDecisionFn(fn: DecisionFn) {
    this.externalDecisionFn = fn;
  }

  onManualRequest(listener: ManualRequestListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyManualDecisionNeeded(request: ManualDecisionRequest): void {
    this._pendingManualRequest = request;
    this.listeners.forEach((listener) => listener(request));
  }

  submitManualDecision(decision: Card[] | null): void {
    if (!this.manualController) {
      return;
    }
    this.manualController.submitDecision(decision);
    this._pendingManualRequest = null;
  }

  dispose(): void {
    this.listeners.clear();
    this.manualController?.reset();
    this.manualController = null;
  }

  private static createSessionId(): string {
    return `S-${Math.random().toString(36).slice(2, 10)}`;
  }
}
