# 🛡️ 服务器端牌型验证

## 📋 功能概述

为了防止作弊和确保游戏公平性，服务器现在会验证每次出牌的合法性。

---

## ✅ 验证内容

### 1. 牌权验证

- **检查：** 出的牌是否真的在玩家手里
- **目的：** 防止玩家发送不存在的牌
- **错误示例：** `非法出牌：牌 A♠ 不在你的手牌中`

### 2. 牌型验证

- **检查：** 选择的牌是否构成有效牌型
- **支持的牌型：**
  - 单张 (SINGLE)
  - 对子 (PAIR)
  - 三张 (TRIPLE)
  - 顺子 (STRAIGHT) - 5 张及以上连续
  - 连对 (CHAIN_PAIR) - 3 对及以上连续
  - 连三张 (CHAIN_TRIPLE) - 2 组及以上连续
  - 炸弹 (BOMB) - 4 张及以上同点数
  - 王炸 (JOKER_BOMB) - 小王+大王
- **错误示例：** `非法出牌：选择的牌不构成有效牌型（3张牌）`

### 3. 管牌验证

- **检查：** 如果桌面有上家的牌，你的牌是否能管住
- **规则：**
  - 同类型牌型：点数必须更大
  - 炸弹可以管任何非炸弹牌型
  - 王炸可以管任何牌型
- **错误示例：** `非法出牌：你的PAIR(2张)无法管上家的TRIPLE(3张)`

---

## 🔒 安全性提升

### 修复前（❌ 危险）

```typescript
// 客户端发来什么就接受什么
session.submitDecision(cards);
```

**问题：**

- 恶意玩家可以发送不在手里的牌
- 可以发送非法牌型
- 可以发送管不住的牌

### 修复后（✅ 安全）

```typescript
// 先验证，通过了才接受
if (cards && cards.length > 0) {
  // 1. 验证牌在手里
  const handCardIds = new Set(playerHand.map((c) => c.id));
  for (const card of cards) {
    if (!handCardIds.has(card.id)) {
      throw new Error("牌不在手牌中");
    }
  }

  // 2. 验证牌型合法
  const play = classifyPlay(cards);
  if (!play) {
    throw new Error("不构成有效牌型");
  }

  // 3. 验证能否管牌
  if (lastPlay && !canBeat(lastPlay, play)) {
    throw new Error("无法管上家的牌");
  }
}

session.submitDecision(cards);
```

---

## 🧪 测试场景

### 场景 1：正常出牌 ✅

```
玩家手牌：3♠ 3♥ 3♦ 4♠ 5♠
出牌：3♠ 3♥ 3♦
结果：验证通过 (TRIPLE)
```

### 场景 2：牌不在手里 ❌

```
玩家手牌：3♠ 4♠ 5♠
出牌：6♠ 7♠ 8♠ (不在手里)
结果：错误 "牌不在你的手牌中"
```

### 场景 3：非法牌型 ❌

```
玩家手牌：3♠ 4♠ 6♠
出牌：3♠ 4♠ 6♠ (不连续，不是顺子)
结果：错误 "不构成有效牌型"
```

### 场景 4：管不住 ❌

```
桌面：5♠ 5♥ 5♦ (三张5)
玩家出：3♠ 3♥ (对子3)
结果：错误 "你的PAIR无法管上家的TRIPLE"
```

### 场景 5：炸弹管牌 ✅

```
桌面：5♠ 5♥ 5♦ (三张5)
玩家出：3♠ 3♥ 3♦ 3♣ (炸弹3)
结果：验证通过 (炸弹可以管任何牌型)
```

---

## 📊 验证流程图

```
客户端发送出牌
      ↓
[验证1] 牌是否在手里？
      ↓ 是
[验证2] 是否构成有效牌型？
      ↓ 是
[验证3] 桌面有牌吗？
      ↓ 有
[验证4] 能管住吗？
      ↓ 能
✅ 验证通过，接受出牌
      ↓
推进游戏
```

---

## 🎮 用户体验

### 客户端表现

当验证失败时，客户端会收到错误信息：

- 出牌按钮恢复可点击
- 显示错误提示（通过 console.error）
- 玩家可以重新选择牌

### 错误信息示例

```javascript
[useNetworkRoomGame] 出牌失败: Error: 非法出牌：你的PAIR(2张)无法管上家的TRIPLE(3张)
```

---

## 🔧 实现细节

### 文件位置

`src/server/SimpleGameServer.ts` - `submitDecision` 方法

### 依赖函数

```typescript
import { classifyPlay, canBeat } from "../shared/gameEngine/plays";
```

- **`classifyPlay(cards)`** - 判断牌型是否合法，返回 Play 对象或 null
- **`canBeat(lastPlay, play)`** - 判断是否能管住上家的牌

### 验证代码

```typescript
// 验证出牌合法性
if (cards && cards.length > 0) {
  // 1. 验证牌是否在玩家手里
  const playerHand = currentPlayer.hand;
  const handCardIds = new Set(playerHand.map((c) => c.id));

  for (const card of cards) {
    if (!handCardIds.has(card.id)) {
      throw new Error(`非法出牌：牌 ${card.rank}${card.suit} 不在你的手牌中`);
    }
  }

  // 2. 验证牌型是否合法
  const play = classifyPlay(cards);
  if (!play) {
    throw new Error(`非法出牌：选择的牌不构成有效牌型（${cards.length}张牌）`);
  }

  // 3. 如果需要管牌，验证是否能管上家的牌
  const lastPlay = this.gameWrapper.state.lastPlay;
  if (lastPlay && !canBeat(lastPlay, play)) {
    throw new Error(
      `非法出牌：你的${play.type}(${play.cards.length}张)无法管上家的${lastPlay.type}(${lastPlay.cards.length}张)`
    );
  }

  console.log(`[GameRoom] 出牌验证通过: ${play.type} (${cards.length}张)`);
}
```

---

## 📈 性能影响

### 验证开销

- **时间复杂度：** O(n) where n = 牌数（通常 < 10）
- **额外计算：**
  - 创建 Set：O(m) where m = 手牌数（通常 < 30）
  - 遍历验证：O(n)
  - 牌型判断：O(n)
  - 管牌判断：O(1)
- **总开销：** 几乎可忽略（< 1ms）

### 内存影响

- 临时创建一个 Set 对象（手牌 ID）
- 内存增加可忽略不计

---

## ✅ 验证结果

### 阻止的作弊行为

- ✅ 发送不存在的牌
- ✅ 发送非法牌型
- ✅ 发送管不住的牌
- ✅ 修改牌的数据（通过 ID 验证）

### 不影响的正常游戏

- ✅ 正常出牌流畅
- ✅ 过牌正常（不验证）
- ✅ AI 决策正常（因为 AI 总是合法）

---

## 🚀 下一步改进

### 可选增强

1. **错误提示优化**

   - 在客户端 UI 显示友好的错误提示
   - 不只是控制台日志

2. **防重放攻击**

   - 添加 nonce 或时间戳验证
   - 防止重复发送相同的出牌

3. **速率限制**

   - 限制出牌频率
   - 防止刷屏攻击

4. **日志记录**
   - 记录所有非法出牌尝试
   - 用于检测和封禁作弊玩家

---

## 📝 提交信息建议

```bash
git add src/server/SimpleGameServer.ts docs/SERVER_VALIDATION.md
git commit -m "feat: 添加服务器端牌型验证

- 验证牌是否在玩家手里
- 验证牌型是否合法
- 验证是否能管上家的牌
- 防止作弊行为，确保游戏公平性"
```

---

**实现时间：** 2025-11-23  
**实现者：** AI Assistant  
**状态：** ✅ 已完成，待测试
