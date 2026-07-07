# Security Policy

校对鸭 (ai-proofduck-extension) 是一个 Chrome 浏览器扩展，处理用户的 API 密钥（如 OpenAI / DeepSeek / 通义千问）和网页选中文本。安全对我们极其重要。

## 支持的版本

| 版本 | 安全更新 |
|---|:-:|
| 0.5.x (current) | ✅ |
| 0.4.x | ❌ (请升级到 0.5.x) |
| < 0.4 | ❌ |

发布节奏：修复关键漏洞时立即出 patch release；一般漏洞随下一个 minor release 一起发。

## 私下报告漏洞（推荐）

**请勿在公开 issue 里报告安全漏洞**。请使用 GitHub Security Advisories 私下提交：

👉 <https://github.com/gandli/ai-proofduck-extension/security/advisories/new>

如果没有 GitHub 账号，可通过 [Repository Owner](https://github.com/gandli) 主页的联系方式私下沟通。

### 响应时间承诺

| 阶段 | 目标窗口 |
|---|---|
| 首次确认收到报告 | 48 小时内 |
| 初步影响评估 | 5 个工作日内 |
| 补丁发布 | 7-14 天（视严重度） |
| CVE 公示 & 感谢名单 | 补丁发布后同步 |

## 已知安全边界

以下是**设计上的安全保证**，如果你发现绕过其中任一项，视为漏洞：

1. **API 密钥仅存本地**：所有 OpenAI 兼容 API key 存 `chrome.storage.local`，不同步到 chrome sync、不上传任何服务器。
2. **Host permissions 用户主动授权**：每个 API 端点需要用户在 Options 页点击"授权"才能访问。扩展启动时不预取任何 host permission。
3. **错误信息脱敏**：所有从上游 API 返回的错误 body 在展示到 UI/日志前会走 `sanitizeSecrets`，剥离 `Bearer <token>`、`sk-...`、`x-api-key` 等模式。
4. **无遥测**：扩展不会收集使用统计、不发送 crash report、不 phone home。
5. **CSP 严格**：manifest 使用 MV3 默认 CSP，禁止 `eval` / `unsafe-eval`；所有代码都是构建期打包的。
6. **CRX 签名稳定**：Release 走 GitHub Actions CI，使用固定 `CRX_KEY` secret 签名 —— 保证扩展 ID 不会因发布过程变化而漂移，老用户升级链路完好。

## 报告漏洞时请附

- 影响范围（哪个版本、哪个引擎/入口）
- 复现步骤（最小可复现测试用例）
- PoC（若涉及数据泄漏，请勿使用真实 API key/密钥）
- 你希望的披露时间线
- 你希望使用的署名（用于感谢名单）

## 补丁流程

1. 我们私下确认漏洞并评估严重度
2. 在 private branch 修复并添加回归测试
3. 与报告者协商披露时间
4. 发布补丁版本 + GitHub Security Advisory
5. 更新 CHANGELOG.md 并公开致谢

## 感谢名单

我们感谢所有负责任地报告漏洞的研究者。你的名字会出现在此 —— 除非你要求匿名。

_(等待第一位负责任的漏洞报告者)_

---

**最后更新**：2026-07-07 · v0.5.6 审计 v4
