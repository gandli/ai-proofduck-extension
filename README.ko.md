<div align="center">
  <a href="https://gandli.github.io/ai-proofduck-extension/">
    <img src="public/icons/icon-128.png" alt="AI Proofduck Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 12px 40px rgba(237, 80, 7, 0.15);" />
  </a>

  <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">AI Proofduck</h1>

  <p style="font-size: 1.2rem; color: #666;">
    <strong>스마트 글쓰기 어시스턴트 · 프라이버시 우선 · 완전 로컬</strong> <br/>
    글을 전문적이고 세련되며 정확하게 만들어보세요.
  </p>

  <p>
    <a href="#-핵심-기능">기능</a> •
    <a href="#-체인지로그-동기화">체인지로그 동기화</a> •
    <a href="#-테스트">테스트</a> •
    <a href="#-프라이버시">프라이버시</a>
  </p>

  <p>
    🌐 언어:
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">简体中文</a> |
    <a href="./README.ja.md">日本語</a> |
    <a href="./README.ko.md">한국어</a> |
    <a href="./README.es.md">Español</a> |
    <a href="./README.fr.md">Français</a>
  </p>

  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Built%20with-Astro%205.0-orange?style=flat-square&logo=astro" alt="Built with Astro"></a>
    <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styled%20with-Tailwind-38B2AC?style=flat-square&logo=tailwind-css" alt="Styled with Tailwind CSS"></a>
    <a href="https://lucide.dev"><img src="https://img.shields.io/badge/Icons-Lucide-pink?style=flat-square&logo=lucide" alt="Lucide Icons"></a>
  </p>

  <img src="public/images/screenshots/screenshot-en-summarize.png" alt="AI Proofduck Screenshot" width="800" style="border-radius: 12px; border: 1px solid #e5e5e5; margin-top: 20px;" />
</div>

<br />

> **AI Proofduck**는 브라우저 사이드 패널용 번역 우선 AI 글쓰기 어시스턴트입니다. 이제 **Chrome 내장 AI**, **로컬 WebGPU/WASM 추론**, **공개 번역/API 폴백**(Google/Baidu/OpenAI 호환)을 지원하여 프라이버시, 호환성, 즉시 사용성을 균형 있게 제공합니다.

---

## ✨ 핵심 기능

AI Proofduck은 웹 기반 글쓰기의 품질을 향상시키는 데 초점을 맞춘 다섯 가지 핵심 모드를 제공합니다:

| 모드 | 설명 |
| :--- | :--- |
| **📝 요약** | 긴 텍스트에서 핵심 포인트를 즉시 추출하여 주요 아이디어를 파악합니다. |
| **✅ 교정** | 철자, 문법 및 문장 부호 오류를 정확하게 식별하고 수정합니다. |
| **✨ 다듬기** | 문구와 문장 구조를 최적화하여 전문성과 흐름을 향상시킵니다. |
| **🌍 번역** | 주요 글로벌 언어 간의 문맥 인식 번역을 높은 정확도로 제공합니다. |
| **🚀 확장** | 짧은 키워드를 기반으로 세부 정보를 풍부하게 하여 표현에 깊이와 논리를 더합니다. |

### 🚀 하이브리드 인텔리전스

다양한 환경을 위해 세 가지 엔진 경로를 제공합니다:

- **🧠 Chrome 내장 AI**: Chrome 사이드패널에서 사용 가능한 경우 장치 내 AI를 직접 실행합니다.
- **⚡ 로컬 WebGPU / WASM**: 빠른 로컬 가속 + 광범위한 CPU 호환성.
- **🌍 공개 번역 & API**: Google/Baidu 번역 서비스 또는 OpenAI 호환 API를 폴백으로 사용합니다.

---

## 🔄 체인지로그 동기화

`gh-pages` 랜딩 페이지 체인지로그는 `main` 브랜치에서 동기화됩니다:

- **EN 페이지**: `main/CHANGELOG.md`를 자동으로 가져와 렌더링합니다.
- **ZH 페이지**: 중국어 독자를 위한 현지화된 체인지로그 사본을 유지합니다.
- 체인지로그 항목에서 인라인 마크다운 렌더링을 지원합니다:
  - `**굵게**`
  - `` `코드` ``
  - `[링크](https://example.com)`

새로고침 전략:

- 폴링 간격: **하루에 한 번**
- 페이지 `focus` 및 `visibilitychange` 시 스마트 새로고침

---

## 🧪 테스트

랜딩 페이지 E2E 테스트는 Playwright로 구동됩니다.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

현재 커버리지:

- EN/ZH 섹션 렌더링 및 핵심 복사
- 언어 전환 뷰 상태 보존
- 위로 가기 버튼 동작
- 동적 체인지로그 마크다운 렌더링

---

## 🔒 프라이버시 우선

**귀하의 데이터는 귀하의 것입니다.**

- **제로 데이터 수집**: 입력 콘텐츠나 개인 정보를 수집, 저장 또는 분석하지 않습니다.
- **로컬 우선**: 로컬 모델을 기본값으로 설정하여 데이터 처리가 클라우드에 업로드 없이 완전히 귀하의 장치에서 완료됩니다.
- **투명성 및 제어 가능**: API 키는 암호화되어 `localStorage`에 로컬로 저장되며 언제든지 삭제할 수 있습니다.

자세한 정책은 다음을 방문해주세요: [개인정보 처리방침 페이지](https://gandli.github.io/ai-proofduck-extension/#privacy)

---

## 🚀 스토어 등록 정보

### 1. 단일 목적 설명

**AI Proofduck**은 웹 기반 글쓰기의 품질 향상에 초점을 맞춘 지능형 글쓰기 어시스턴트입니다. 모든 기능(**요약**, **교정**, **교정**, **번역**, **확장**)은 "텍스트 최적화 및 처리"라는 핵심 목표와 긴밀하게 일치합니다.

### 2. 권한 정당화

- **`sidePanel`**: 현재 페이지를 떠나지 않고 글쓰기 지원을 위한 몰입형 상호작용 인터페이스를 제공합니다.
- **`storage`**: 사용자 환경설정, 엔진 선택 및 암호화된 API 키를 로컬에 저장합니다.
- **`tts`**: 접근성 및 멀티모달 교정을 위한 텍스트 음성 변환을 제공합니다.
- **`activeTab`**: 최소 권한 원칙을 준수하며, 사용자가 확장 프로그램을 명시적으로 트리거할 때만 현재 탭에 대한 임시 액세스를 요청합니다.
- **`contextMenus`**: 마우스 오른쪽 버튼 메뉴에 바로가기를 추가하여 `activeTab` 액세스 권한을 부여하는 정당한 사용자 트리거 상호작용을 제공합니다.
- **`scripting`**: 사용자 활성화 시 현재 페이지에서 선택한 텍스트를 안전하게 읽고 처리하는 데 사용됩니다.

### 3. 원격 코드 선언

이 확장 프로그램은 "**원격 호스팅 코드**"를 사용하지 않습니다. 모든 실행 로직(JS/Wasm)은 확장 프로그램 패키지 내에 완전히 번들로 제공되어 콘텐츠 보안 정책(CSP) 요구사항을 준수합니다.

---

<div align="center">
  <p>MIT 라이선스 © 2026 <a href="https://github.com/gandli">Gandli</a></p>
</div>