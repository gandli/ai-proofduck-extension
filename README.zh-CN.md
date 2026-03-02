# AI 校对鸭（gh-pages）

> 这是 gh-pages 落地页分支的中文说明。

- 官网：<https://gandli.github.io/ai-proofduck-extension/>
- 英文 README：[`README.md`](./README.md)

## 主要能力

- Chrome 内置 AI
- 本地 WebGPU / WASM
- 公共翻译与 API 兜底（Google / Baidu / OpenAI 兼容）

## Changelog 同步

- 英文页从 `main/CHANGELOG.md` 动态同步
- 中文页保持本地中文内容

## 测试

```bash
npm install
npx playwright install chromium
npm run test:e2e
```
