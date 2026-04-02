# AI ProofDuck

AI-powered proofreading and translation browser extension (Manifest V3).

## Tech Stack

- **WXT** - Browser extension framework
- **React 19** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Zustand** - State management
- **@hxt-dev/i18n** - Internationalization
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Project Structure

```
ai-proofduck-extension/
├── entrypoints/           # Browser extension entry points
│   ├── background.ts      # Service Worker
│   ├── content.ts         # Content Script
│   └── popup/             # Extension popup UI
│       ├── App.tsx
│       ├── main.tsx
│       └── components/    # Popup components
├── src/                   # Shared source code
│   ├── engines/           # Translation engine adapters
│   ├── core/              # Core functionality (EngineManager, etc.)
│   ├── hooks/             # React hooks
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript type definitions
│   ├── components/         # Shared React components
│   └── utils/             # Utility functions
├── public/
│   └── _locales/          # i18n message files (en, zh, ja)
├── tests/
│   ├── unit/              # Vitest unit tests
│   │   ├── engines/
│   │   ├── core/
│   │   ├── components/
│   │   └── utils/
│   ├── e2e/               # Playwright E2E tests
│   │   └── popup/
│   └── bdd/               # BDD feature files
│       └── features/
├── wxt.config.ts          # WXT configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest configuration
├── playwright.config.ts   # Playwright configuration
└── tailwind.config.js     # TailwindCSS configuration
```

## Commands

```bash
# Development
bun dev              # Start dev server (localhost:3000)
bun dev:firefox      # Firefox development

# Build
bun build            # Production build
bun build:firefox    # Firefox production build
bun zip              # Package as zip
bun zip:firefox      # Firefox zip

# Type checking
bun compile          # TypeScript type check

# Testing
bun test             # Unit tests (Vitest)
bun test:run         # Run tests once
bun test:ui          # Vitest UI
bun test:e2e         # Playwright E2E tests
bun test:e2e:ui      # Playwright UI
bun test:e2e:headed  # Playwright headed mode
```

## Path Aliases

- `@/` → `src/`
- `@entry/` → `entrypoints/`
