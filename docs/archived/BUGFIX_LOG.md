# 🐛 Bug修复日志

## 2025-11-23 - 游戏流程核心修复

### 问题1：出牌后游戏卡住

**症状：**
- 玩家选择手牌并点击"出牌"后，游戏没有推进
- 当前玩家索引保持不变
- 浏览器显示命令已发送，但服务器没有响应

**原因分析：**
在 `GameRoom.advanceGame()` 中，有一个判断逻辑用于等待真人玩家决策：

```typescript
if (currentSession && !currentSession.isAI && !currentSession.decisionResolved) {
  return true; // 等待玩家决策
}
```

当玩家提交决策后：
- `pendingDecision` 被设置为卡牌数组
- `decisionResolved` 仍为 `false`（因为还未被引擎消费）

所以判断认为"玩家还没决策"，直接返回，**根本没调用引擎去消费这个决策**！

**解决方案：**
修改判断条件，检查 `pendingDecision` 是否为 `null`：

```typescript
if (
  currentSession &&
  !currentSession.isAI &&
  currentSession.pendingDecision === null &&
  !currentSession.decisionResolved
) {
  return true; // 等待玩家决策
}
```

**影响的文件：**
- `src/server/SimpleGameServer.ts` (第 248-258 行)

---

### 问题2：过牌后游戏卡住

**症状：**
- 玩家点击"不出"按钮后，游戏继续卡住
- 出牌能正常工作，但过牌不行

**原因分析：**
当玩家选择"不出"时，`pendingDecision` 被设为 `null`。

在决策函数中：
```typescript
if (session.pendingDecision !== null && !session.decisionResolved) {
  return session.pendingDecision; // 返回决策
}
return null; // 等待决策
```

这导致：
- 出牌：`pendingDecision = cards`（非null）→ 能返回决策 ✅
- 过牌：`pendingDecision = null` → 判断失败，永远返回 null ❌

**核心问题：** 无法区分"还没决策"和"决策是过牌"这两种情况，因为它们的 `pendingDecision` 都是 `null`。

**解决方案：**
添加一个新的标志 `hasSubmitted` 来明确标记"是否已提交决策"：

```typescript
class GameSession {
  pendingDecision: Card[] | null = null;
  hasSubmitted = false; // 新增：标记是否已提交决策（包括过牌）
  decisionResolved = false;

  submitDecision(cards: Card[] | null) {
    this.pendingDecision = cards;
    this.hasSubmitted = true; // 关键：无论出牌还是过牌都设为 true
    this.decisionResolved = false;
  }

  clearDecision() {
    this.pendingDecision = null;
    this.hasSubmitted = false; // 清除时重置
    this.decisionResolved = false;
  }
}
```

修改决策函数：
```typescript
if (session.hasSubmitted && !session.decisionResolved) {
  const decision = session.pendingDecision; // 可能是 cards 也可能是 null
  session.markDecisionResolved();
  return decision;
}
return null; // 真正的"等待决策"
```

修改等待判断：
```typescript
if (currentSession && !currentSession.isAI && !currentSession.hasSubmitted) {
  return true; // 等待玩家决策
}
```

**影响的文件：**
- `src/server/SimpleGameServer.ts` (第 44-75, 150-166, 248-258 行)

---

## 测试结果

### 修复前
- ❌ 出牌后游戏卡住
- ❌ 过牌后游戏卡住
- ❌ 无法完整进行一局游戏

### 修复后
- ✅ 出牌正常推进
- ✅ 过牌正常推进
- ✅ AI 自动决策正常
- ✅ 游戏可以正常结束
- ✅ 结束后返回准备界面

---

## 经验总结

### 状态管理的关键
在异步决策系统中，需要**明确区分三种状态**：

1. **未决策** - 玩家还没做决定
2. **决策中** - 玩家已提交，等待处理
3. **已处理** - 决策已被引擎消费

不能用 `null` 来表示多种含义！

### 调试技巧
添加详细的日志非常重要：
```typescript
console.log("[GameRoom] 玩家尝试出牌:", {
  sessionId,
  sessionDisplayName,
  sessionPlayerId,
  currentPlayerIndex,
  currentPlayerId,
  isCorrectPlayer,
});
```

这帮助我们快速定位了问题。

---

**修复时间：** 2025-11-23  
**修复者：** AI Assistant with User Testing  
**测试通过：** ✅

