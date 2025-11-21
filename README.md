# 🎮 抓黑A游戏 (Black-A Game)

一个基于 React Native/Expo 的多人联机扑克牌游戏。

## ✨ 功能特性

- 🎯 **6人多人游戏** - 支持6个玩家同时在线对战
- 🌐 **实时联机** - WebSocket 实时通信，状态同步
- 🤖 **AI 玩家** - 智能 AI 决策系统
- 🎨 **精美 UI** - 现代化的游戏界面
- ⚡ **快速响应** - 流畅的游戏体验

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动游戏

#### 1. 启动服务器

```bash
npm run server:simple
```

预期输出：
```
🚀 简单游戏服务器已启动: ws://localhost:9090
```

#### 2. 启动客户端

新开一个终端：

```bash
npm run web
```

浏览器会自动打开 `http://localhost:8081`

#### 3. 开始游戏

1. 切换到"联机"模式
2. 等待其他玩家加入（或打开多个浏览器标签）
3. 所有玩家点击"准备"
4. 点击"开始游戏"

## 📖 文档

### 用户文档

- **[快速测试指南](./TESTING_CHECKLIST.md)** - 5分钟快速测试流程
- **[游戏测试指南](./docs/game-flow-testing-guide.md)** - 完整的测试场景

### 开发文档

- **[服务器使用指南](./docs/SIMPLE_SERVER_GUIDE.md)** - 服务器架构和使用
- **[游戏流程实现](./docs/GAME_FLOW_IMPLEMENTATION.md)** - 详细的实现说明
- **[多人游戏架构](./docs/multiplayer-plan.md)** - 架构设计文档
- **[迁移指南](./docs/MIGRATION_TO_SIMPLE_SERVER.md)** - 架构迁移记录

## 🏗️ 项目结构

```
black-a-game/
├── app/                      # 主应用入口
│   └── index.tsx            # 主界面
├── src/
│   ├── features/
│   │   ├── game/            # 游戏核心功能
│   │   │   ├── components/  # UI 组件
│   │   │   ├── engine/      # 游戏引擎
│   │   │   └── hooks/       # React Hooks
│   │   └── multiplayer/     # 多人联机功能
│   │       ├── hooks/       # 网络 Hooks
│   │       └── network/     # WebSocket 客户端
│   ├── server/              # 游戏服务器
│   │   └── SimpleGameServer.ts
│   └── shared/              # 共享代码
│       ├── gameEngine/      # 游戏引擎核心
│       └── network/         # 网络协议
├── tools/
│   └── server/              # 服务器启动脚本
│       └── simpleServer.ts
└── docs/                    # 文档
```

## 🎮 游戏规则

### 基本规则

- **玩家人数：** 6人
- **阵营划分：** 有黑A的玩家为A阵营，其他为B阵营
- **获胜条件：** 同阵营玩家全部出完手牌

### 牌型

- 单张
- 对子
- 三张
- 炸弹（4张及以上）
- 顺子（5张及以上连续）
- 连对（3对及以上连续）
- 连三张（2组及以上连续）
- 王炸（大小王）

## 🛠️ 技术栈

### 前端

- **React Native** - 跨平台UI框架
- **Expo** - 开发工具链
- **TypeScript** - 类型安全
- **WebSocket** - 实时通信

### 后端

- **Node.js** - 运行环境
- **WebSocket (ws)** - 实时通信服务器
- **TypeScript** - 类型安全

## 📊 当前状态

### ✅ 已完成

- [x] 游戏引擎核心逻辑
- [x] 6人牌桌布局
- [x] WebSocket 服务器
- [x] 玩家加入/离开
- [x] 准备状态系统
- [x] 游戏开始流程
- [x] 状态实时同步
- [x] AI 决策系统

### 🚧 进行中

- [ ] 手动出牌 UI
- [ ] 断线重连
- [ ] 游戏录像

### 📋 计划中

- [ ] 房间列表
- [ ] 观战模式
- [ ] 聊天功能
- [ ] 统计数据
- [ ] 排行榜

## 🐛 已知问题

1. **手动出牌 UI** - 当前缺少手牌选择界面，玩家无法手动出牌
2. **断线重连** - 玩家断线后无法重新连接到游戏
3. **出牌验证** - 服务器端缺少完整的牌型验证

## 🤝 开发

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务器（终端1）
npm run server:simple

# 启动客户端（终端2）
npm run web

# 查看日志
# 服务器日志会在终端1显示
# 客户端日志在浏览器控制台（F12）
```

### 调试技巧

#### 1. 查看 WebSocket 消息

浏览器开发者工具 → Network → WS → Messages

#### 2. 查看服务器日志

服务器终端会显示详细的状态更新日志

#### 3. 查看客户端日志

浏览器控制台（F12 → Console）会显示：
- 事件接收日志
- 状态更新日志
- 调试信息

## 📝 脚本命令

```bash
# 开发
npm start              # 启动客户端（开发模式）
npm run web           # 启动 Web 客户端
npm run server:simple # 启动简单游戏服务器

# 构建
npm run build         # 构建生产版本

# 代码质量
npm run lint          # 运行 ESLint

# 测试
npm test              # 运行测试（待实现）
```

## 📄 许可证

MIT License

## 🙏 致谢

- React Native / Expo 团队
- 所有贡献者

---

**开始游戏：**

```bash
npm run server:simple  # 终端1
npm run web           # 终端2
```

**祝你玩得开心！** 🎉
