<div align="center">
  <h1>AI proofduck</h1>
  <img src="public/icon.svg" alt="AI proofduck Logo" width="128" height="128" />
</div>

[English](./README.md) | [中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Changelog](./CHANGELOG.md)

---

## 📸 스크린샷

`store-assets/` 디렉터리의 스크린샷을 참고하세요.

---

**AI proofduck**는 브라우저 사이드패널 기반 하이브리드 AI 글쓰기 확장입니다.

**로컬 우선 라우팅 전략**:
1. Chrome Built-in AI (Gemini Nano)
2. Local WebGPU/WASM 모델
3. Online API (고성능 클라우드)
4. 번역 전용 폴백(설치 직후 사용성 보장)

## ✨ 주요 기능

- **번역 우선 UX**
  - **Translate**: 다국어 번역(전체 페이지 번역 포함)
  - **Summarize / Correct / Proofread / Expand**
- **로컬 우선 프라이버시**: 가능한 경우 온디바이스 처리
- **클라우드 강화 경로**: OpenAI 호환 API 지원
- **번역 폴백**: AI 엔진/키가 없을 때도 번역 유지
- **스마트 본문 가져오기**: 선택 텍스트가 없으면 페이지 본문 자동 수집

## 📦 설치

### [Chrome Web Store에서 설치](https://chromewebstore.google.com/detail/gpjneodcglcajciglofbfhafgncgfmcn/)

---

## ⚙️ 설정

- **엔진 선택**
  - Chrome Built-in AI
  - Local (WebGPU / WASM)
  - Online API
- **온라인 프리셋**
  - OpenRouter free
  - Cloudflare AI
- **번역 폴백**
  - Disabled / Google free / MyMemory

## 🛠️ 개발

```bash
git clone https://github.com/gandli/ai-proofduck-extension
cd ai-proofduck-extension
npm install
npm run dev
```

빌드:

```bash
npm run build
```

---

## 📄 라이선스

[MIT](LICENSE)
