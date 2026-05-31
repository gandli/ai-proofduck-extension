## 2025-05-31 - Parallelizing Core Engine/Model Initialization
**Learning:** The codebase relies heavily on dynamic registration and runtime availability checks for its translation engines (`EngineManager`) and local LLM models (`ModelLoader`). Because many of these checks are asynchronous (e.g., verifying WebGPU capabilities or prompting window.ai), iterating over them sequentially using `for...of` loops creates a massive bottleneck during initialization and selection phases.
**Action:** Operations that iterate over multiple engines or models and perform async checks must be parallelized using `Promise.all` and `.map()`. This pattern should be consistently applied wherever multiple independent engine/model promises can be resolved concurrently.

## 2025-05-31 - Vite/Rolldown Path Resolution Errors in WXT
**Learning:** Build pipelines leveraging WXT with Vite/Rolldown (as seen in `bun run build`) may fail with `[UNLOADABLE_DEPENDENCY]` errors for files imported using absolute TypeScript path aliases (e.g., `@/services/SpeechService`). The bundler occasionally fails to resolve these paths correctly during production builds despite `tsconfig.json` configurations.
**Action:** When experiencing `[UNLOADABLE_DEPENDENCY]` errors for absolute path aliases (`@/`) in a WXT/Vite environment that otherwise typechecks correctly, replace the absolute aliases (`@/`) with standard relative imports (`../`, `./`).

## 2025-05-31 - GitHub Actions Missing WXT Build Artifacts
**Learning:** In the default WXT React starter configuration, `wxt build` outputs artifacts to `.output/chrome-mv3/` by default, not `.output/chrome-mv3-prod/`. Relying on the wrong path in GitHub Actions for `upload-artifact` or `download-artifact` steps causes the CI pipeline to fail downstream during test or deployment jobs with `Artifact not found`.
**Action:** When debugging 'Artifact not found' errors in GitHub Actions CI pipelines for WXT extensions, always verify that the artifact upload and download paths in the workflow YAML match the actual output directory configuration, which is `.output/chrome-mv3/`.
