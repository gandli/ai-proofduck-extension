# Requirements: AI proofduck Refactor

**Defined:** 2026-03-23
**Core Value:** 在不破坏现有用户流程的前提下，把这个扩展重构成一个清晰、稳健、可持续演进的代码库。

## v1 Requirements

### Architecture

- [ ] **ARCH-01**: 维护者可以从代码结构和文档中快速看清 background、content、sidepanel、offscreen、worker 各自负责什么
- [ ] **ARCH-02**: 模式、设置、存储键和运行时消息协议由共享契约统一定义并被各上下文复用
- [ ] **ARCH-03**: 重构后现有五种模式、快捷翻译、全文抓取和设置持久化行为继续可用

### Engine Runtime

- [ ] **ENGN-01**: 系统通过统一的运行时路由决定使用 Chrome AI、本地模型、在线 API 或翻译兜底
- [ ] **ENGN-02**: 加载、进度、完成、错误和重置行为在侧边栏和快捷翻译路径中保持一致
- [ ] **ENGN-03**: 本地模型缓存、镜像回退和 worker 生命周期逻辑与 UI 代码解耦

### Sidepanel UX Structure

- [ ] **UI-01**: `App.tsx` 主要负责组合界面，而不是承载大段状态恢复、消息分发和副作用流程
- [ ] **UI-02**: 设置、执行动作、结果展示三类逻辑可以分别测试和独立修改
- [ ] **UI-03**: 内容脚本里的翻译弹窗与交互流程被拆成职责更清楚的单元

### Quality and Docs

- [ ] **QUAL-01**: 测试覆盖当前关键流程，包括选中文本处理、全文抓取、快捷翻译、设置恢复和主要错误路径
- [ ] **QUAL-02**: 构建、编译和测试命令对当前仓库状态是准确且可执行的
- [ ] **QUAL-03**: 代码地图、项目说明和 README 能反映实际架构与输出目录

## v2 Requirements

### Future Enhancements

- **FUTR-01**: 为不同运行时路径建立性能预算和更细的遥测观察
- **FUTR-02**: 为 Firefox 路径建立与 Chromium 同等级别的回归验证
- **FUTR-03**: 基于清晰模块边界再推进更大范围的 UI 升级

## Out of Scope

| Feature | Reason |
|---------|--------|
| 新增新的 AI 模式 | 当前目标是结构整治，不是功能扩张 |
| 引入服务端或账号体系 | 会显著扩大范围，且不能直接解决当前代码可维护性问题 |
| 全量重写现有扩展 | 风险高、验证成本大，不符合 brownfield 重构原则 |
| 修改现有设置语义或清空用户本地配置 | 会带来升级风险，不适合放进第一轮重构 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| ENGN-01 | Phase 3 | Pending |
| ENGN-02 | Phase 3 | Pending |
| ENGN-03 | Phase 3 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 4 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
