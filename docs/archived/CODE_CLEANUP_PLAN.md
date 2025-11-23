# 🧹 代码清理计划

## 📋 清理概览

经过扫描，发现以下可以清理的内容：

---

## 🗑️ 建议删除的文件（未使用）

### 1. **`src/features/game/components/DebugAllPlayersPanel.tsx`**
- **状态：** ❌ 未使用
- **原因：** 定义了组件但从未被导入或使用
- **影响：** 无，可安全删除
- **操作：** 删除文件 + 从 `index.ts` 移除导出

### 2. **`src/features/game/components/TableLayout.tsx`**
- **状态：** ❌ 未使用
- **原因：** 已被 `SixPlayerTableLayout` 完全替代
- **影响：** 无，可安全删除
- **操作：** 删除文件 + 从 `index.ts` 移除导出

### 3. **`src/features/game/hooks/useNetworkGameState.ts`** ⚠️
- **状态：** ❌ 未使用（500+ 行）
- **原因：** 旧架构的 Hook，现在直接使用 `useNetworkRoomGame`
- **影响：** 无，但建议先备份（文件很大）
- **操作：** 删除文件 + 从 `index.ts` 移除导出
- **备注：** 这是旧的网络游戏状态管理，包含复杂的房间管理逻辑

### 4. **`src/shared/gameEngine/gameEngine.ts`**
- **状态：** 🟡 仅重导出
- **原因：** 只包含 `export * from './gameEngineDemo';`，没有独立价值
- **影响：** 需要更新导入路径
- **操作：** 删除，统一使用 `gameEngineDemo.ts`

### 5. **`src/features/game/engine/gameEngine.ts`**
- **状态：** 🟡 仅重导出
- **原因：** 只包含 `export * from '../../../shared/gameEngine/gameEngine';`
- **影响：** 需要更新导入路径
- **操作：** 删除，直接从 shared 导入

### 6. **`src/features/game/engine/manualController.ts`** 和 **`src/shared/gameEngine/manualController.ts`**
- **状态：** 🟡 可能重复
- **原因：** 两个地方都有类似的 ManualController 实现
- **影响：** 需要检查哪个在使用
- **操作：** 保留一个，删除另一个（建议保留 shared 中的）

---

## 🔄 需要重构的文件（重复或冗余）

### 1. **重复的引擎文件导出**
当前状态：
```
src/shared/gameEngine/
  ├── gameEngine.ts (→ gameEngineDemo.ts)
  └── gameEngineDemo.ts (实际实现)

src/features/game/engine/
  ├── gameEngine.ts (→ ../../../shared/gameEngine/gameEngine.ts)
  └── gameEngineDemo.ts (→ ../../../shared/gameEngine/gameEngineDemo.ts)
```

**建议简化为：**
```
src/shared/gameEngine/
  └── gameEngineDemo.ts (唯一实现)

src/features/game/engine/
  └── (直接导入 shared/gameEngineDemo)
```

---

## 🧪 测试文件检查

### Tools 目录
- ✅ `tools/server/simpleServer.ts` - **保留**（正在使用）
- ⏳ `tools/test/*.test.ts` - 需要检查是否还在运行测试
- ⏳ `tools/cli/*.ts` - 需要检查是否还在使用
- ⏳ `tools/debug/debug.ts` - 需要检查是否还有用

---

## 📊 清理影响评估

| 文件类型 | 删除数量 | 代码行数 | 影响范围 |
|---------|---------|---------|---------|
| 未使用组件 | 2 | ~150行 | 无 |
| 未使用Hook | 1 | ~500行 | 无 |
| 冗余导出 | 2 | ~5行 | 需更新导入 |
| 重复实现 | 1 | ~50行 | 需检查 |
| **总计** | **6-7** | **~705行** | **低风险** |

---

## 🎯 清理步骤建议

### 阶段 1：安全删除（无依赖）

1. 删除 `DebugAllPlayersPanel.tsx`
2. 删除 `TableLayout.tsx`  
3. 从 `src/features/game/index.ts` 移除这两个导出

### 阶段 2：备份后删除（大文件）

4. **备份** `useNetworkGameState.ts` 到 `docs/archived/`
5. 删除 `src/features/game/hooks/useNetworkGameState.ts`
6. 从 `src/features/game/index.ts` 移除导出

### 阶段 3：重构导入路径

7. 删除 `src/shared/gameEngine/gameEngine.ts`
8. 删除 `src/features/game/engine/gameEngine.ts`
9. 更新所有导入，统一使用 `gameEngineDemo`

### 阶段 4：检查并合并重复代码

10. 比较两个 `manualController.ts`
11. 保留一个（建议 shared），删除另一个
12. 更新导入路径

### 阶段 5：清理测试和工具文件

13. 检查 `tools/test/` 下的测试是否还在使用
14. 检查 `tools/cli/` 和 `tools/debug/` 是否还需要
15. 删除不用的文件

---

## ⚠️ 注意事项

### 1. Git 管理
- 使用 `git rm` 而不是直接删除
- 每个阶段单独提交，便于回滚
- 提交信息清晰标注删除原因

### 2. 导入路径更新
- 删除 `gameEngine.ts` 后，需要全局搜索并替换导入路径
- 建议使用 IDE 的重构功能

### 3. 备份策略
- 大文件（如 `useNetworkGameState.ts`）先移到 `docs/archived/`
- 等确认无问题后再从 git 历史中删除

### 4. 测试
每个阶段完成后：
- ✅ 确保项目能正常编译
- ✅ 运行一次完整游戏测试
- ✅ 检查是否有 TypeScript 错误

---

## 📈 清理收益

### 代码质量提升
- ✅ 减少 ~700 行未使用代码
- ✅ 简化项目结构
- ✅ 降低维护成本

### 开发效率提升
- ✅ 减少文件搜索时的干扰
- ✅ 加快 IDE 索引速度
- ✅ 新人更容易理解代码结构

### 构建性能提升
- ✅ 减少编译时间（虽然不会很明显）
- ✅ 减少打包体积

---

## 🤔 是否清理的决策

| 文件 | 优先级 | 风险 | 建议 |
|-----|--------|------|------|
| DebugAllPlayersPanel | 🔴 高 | 低 | 立即删除 |
| TableLayout | 🔴 高 | 低 | 立即删除 |
| useNetworkGameState | 🟡 中 | 中 | 备份后删除 |
| gameEngine 导出文件 | 🟡 中 | 中 | 重构后删除 |
| manualController 重复 | 🟢 低 | 中 | 确认后合并 |

---

## 📝 执行清单

### 准备工作
- [ ] 创建新分支 `cleanup/unused-code`
- [ ] 确保当前代码可以正常运行
- [ ] 创建备份目录 `docs/archived/`

### 执行步骤
- [ ] 阶段 1：删除未使用组件
- [ ] 阶段 2：备份并删除大文件
- [ ] 阶段 3：重构导入路径
- [ ] 阶段 4：合并重复代码
- [ ] 阶段 5：清理测试和工具

### 验证
- [ ] 运行 `npm run lint`
- [ ] TypeScript 编译无错误
- [ ] 完整测试一局游戏
- [ ] 检查所有功能正常

### 完成
- [ ] 提交清理更新
- [ ] 合并到主分支
- [ ] 更新文档

---

**创建时间：** 2025-11-23  
**预计耗时：** 30-60 分钟  
**风险等级：** 🟡 中低

