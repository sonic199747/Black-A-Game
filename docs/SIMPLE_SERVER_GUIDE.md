# 🎮 简化游戏服务器 - 使用指南

## 🎯 全新架构

我已经创建了一个**极简**的游戏服务器，抛弃了所有复杂的抽象层。

### 特点

- ✅ **极简**：单个文件，400行代码，易于理解
- ✅ **完整**：支持房间、准备状态、游戏流程
- ✅ **清晰**：没有多层抽象，直接明了
- ✅ **可用**：即插即用，无需配置

---

## 🚀 立即开始

### 1. 启动服务器

```bash
npm run server:simple
```

**或指定端口：**
```bash
PORT=9090 npm run server:simple
```

**预期输出：**
```
🚀 简单游戏服务器已启动: ws://localhost:9090
```

### 2. 启动客户端

另一个终端：
```bash
npm start
```

### 3. 测试

1. 打开浏览器 `http://localhost:8081`
2. 切换到"联机"模式
3. 应该**自动连接**并**自动加入房间**
4. 点击"准备"按钮 ✅
5. 观察服务器日志

---

## 📋 支持的命令

### JOIN_ROOM - 加入房间
```json
{
  "type": "JOIN_ROOM",
  "roomId": "default-room",
  "displayName": "玩家1"
}
```

### READY_UP - 准备
```json
{
  "type": "READY_UP",
  "roomId": "default-room"
}
```

### CANCEL_READY - 取消准备
```json
{
  "type": "CANCEL_READY",
  "roomId": "default-room"
}
```

### START_GAME - 开始游戏
```json
{
  "type": "START_GAME",
  "roomId": "default-room"
}
```

### PLAY_CARDS - 出牌
```json
{
  "type": "PLAY_CARDS",
  "roomId": "default-room",
  "cards": [...]
}
```

### PASS - 过牌
```json
{
  "type": "PASS",
  "roomId": "default-room"
}
```

---

## 📁 代码结构

```
src/server/
  └── SimpleGameServer.ts       # 主服务器（400行）
      ├── GameSession           # 玩家会话
      ├── GameRoom              # 游戏房间
      └── SimpleGameServer      # 服务器主类

tools/server/
  └── simpleServer.ts           # WebSocket 桥接
```

### 核心类说明

**GameSession（玩家会话）**
- 存储玩家信息
- 管理准备状态
- 处理决策

**GameRoom（游戏房间）**
- 管理玩家列表
- 处理游戏流程
- 广播状态变化

**SimpleGameServer（服务器）**
- 处理客户端命令
- 管理房间和会话
- 路由消息

---

## 🔄 工作流程

```
客户端连接
    ↓
发送 JOIN_ROOM → 创建会话 → 加入房间
    ↓
发送 READY_UP → 设置准备状态
    ↓
(所有玩家准备)
    ↓
发送 START_GAME → 启动游戏 → 初始化引擎
    ↓
发送 PLAY_CARDS/PASS → 提交决策 → 游戏继续
```

---

## 🐛 调试

### 服务器日志

```
✅ 客户端连接: abc-123
[SimpleGameServer] 房间状态更新: { roomId: 'default-room', playerCount: 1, readyCount: 0 }
✅ 客户端连接: def-456
[SimpleGameServer] 房间状态更新: { roomId: 'default-room', playerCount: 2, readyCount: 1 }
```

### 浏览器控制台

打开开发者工具 → Network → WS → Messages

应该看到：
- `kind: "READY"` - 连接成功
- `kind: "COMMAND_RESULT"` - 命令成功
- `kind: "ROOM_EVENT"` - 房间事件

---

## ✨ 与旧系统对比

| 特性 | 旧系统 | 新系统 |
|------|--------|--------|
| 代码行数 | 3000+ | 400 |
| 文件数量 | 15+ | 2 |
| 抽象层次 | 5层 | 1层 |
| 协议类型 | 3种 | 1种 |
| 理解难度 | 困难 | 简单 |
| 可维护性 | 低 | 高 |

---

## 🎯 下一步

### 如果服务器正常工作

1. ✅ 测试准备状态
2. ✅ 测试多人游戏
3. ✅ 完善UI显示

### 如果还有问题

检查：
1. 端口是否被占用（9090）
2. WebSocket 连接是否成功
3. 服务器日志中的错误信息

---

## 💡 扩展建议

如果需要添加新功能：

1. **在 SimpleGameServer.ts 中添加新命令**
   ```typescript
   case "YOUR_COMMAND": {
     // 处理逻辑
     return { success: true };
   }
   ```

2. **在 GameRoom 中添加新方法**
   ```typescript
   yourMethod() {
     // 游戏逻辑
   }
   ```

3. **广播状态变化**
   ```typescript
   this.broadcastRoomState(roomId);
   ```

就这么简单！

---

## 🆚 旧服务器对比

**不再需要：**
- ❌ RoomManager / ServerRoomManager
- ❌ RoomInstance / ServerGameRoom  
- ❌ InMemoryRoomGateway
- ❌ AuthoritativeRoomServer
- ❌ 路径别名问题
- ❌ 协议转换
- ❌ 多层抽象

**只需要：**
- ✅ SimpleGameServer（一个文件）
- ✅ simpleServer（WebSocket 桥接）

---

**开始使用吧！** 🚀

```bash
npm run server:simple
```

