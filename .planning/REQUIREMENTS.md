# Requirements: 校对鸭

**Defined:** 2026-03-23
**Core Value:** 用户在网页里看到一段内容时，能立刻用低打断的方式完成理解、改写或翻译，而且优先走本地能力。

## v1 Requirements

### Core Experience

- [ ] **CORE-01**: 用户可以打开浏览器侧边栏进入校对鸭主界面。
- [ ] **CORE-02**: 用户可以在侧边栏中切换 `翻译`、`摘要`、`校对`、`润色`、`扩写` 五种模式。
- [ ] **CORE-03**: 用户可以看到原文输入区、处理结果区和当前运行状态。

### Input Flows

- [ ] **INPT-01**: 用户在网页中选中文本后，可以直接把该文本送入校对鸭处理流程。
- [ ] **INPT-02**: 用户可以从当前网页抓取整页正文到侧边栏输入区。
- [ ] **INPT-03**: 用户可以直接在侧边栏中编辑或粘贴文本再处理。

### Processing Modes

- [ ] **MODE-01**: 用户可以把文本翻译为目标语言。
- [ ] **MODE-02**: 用户可以把长文本摘要成更短的重点内容。
- [ ] **MODE-03**: 用户可以对文本进行基础错误校对。
- [ ] **MODE-04**: 用户可以对文本进行润色改写。
- [ ] **MODE-05**: 用户可以对简短内容进行扩写。

### Engine Routing

- [ ] **ENG-01**: 产品支持浏览器内置 AI 路径。
- [ ] **ENG-02**: 产品支持本地模型路径。
- [ ] **ENG-03**: 产品支持在线 API 路径。
- [ ] **ENG-04**: 当主要引擎不可用时，翻译模式可以使用兜底翻译服务。
- [ ] **ENG-05**: 引擎切换后，用户能得到明确的可用状态、加载进度或失败提示。

### Settings

- [ ] **SET-01**: 用户可以在设置中选择目标语言和主要引擎。
- [ ] **SET-02**: 用户可以配置在线 API 所需的基础信息。
- [ ] **SET-03**: 用户修改设置后，下次打开扩展仍能恢复。

### Quality

- [ ] **QUAL-01**: v1 必须能通过类型检查与基础自动测试。
- [ ] **QUAL-02**: 关键用户路径必须有最小人工 smoke 清单。
- [ ] **QUAL-03**: 扩展在“网页阅读与写作助手”定位上保持清晰，不漂移成泛聊天工具。

## v2 Requirements

### Future

- **FUTR-01**: 更丰富的模型管理能力
- **FUTR-02**: 更完整的结果历史和恢复能力
- **FUTR-03**: 更细粒度的网页内快捷操作
- **FUTR-04**: 更多可配置写作风格和模板

## Out of Scope

| Feature | Reason |
|---------|--------|
| 账号系统 | 不是 v1 核心价值 |
| 云同步 | 会显著增加复杂度，先不做 |
| 团队协作 | 超出浏览器内个人使用场景 |
| 独立移动端/桌面端 | 当前只做浏览器扩展 |
| 泛聊天机器人 | 会冲淡产品定位 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| INPT-01 | Phase 2 | Pending |
| INPT-02 | Phase 2 | Pending |
| INPT-03 | Phase 1 | Pending |
| MODE-01 | Phase 3 | Pending |
| MODE-02 | Phase 3 | Pending |
| MODE-03 | Phase 3 | Pending |
| MODE-04 | Phase 3 | Pending |
| MODE-05 | Phase 3 | Pending |
| ENG-01 | Phase 4 | Pending |
| ENG-02 | Phase 4 | Pending |
| ENG-03 | Phase 4 | Pending |
| ENG-04 | Phase 4 | Pending |
| ENG-05 | Phase 4 | Pending |
| SET-01 | Phase 1 | Pending |
| SET-02 | Phase 4 | Pending |
| SET-03 | Phase 1 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after initial definition*
