## 2024-03-24 - [Avoid Redundant DOM Queries in High-Frequency Handlers]
**Learning:** Calling `document.getElementById` or `shadowRootNode.getElementById` repeatedly during high-frequency events like global `mousemove`/`mouseup` and WebSocket/Worker stream updates (e.g., `WORKER_UPDATE` every 50ms) causes unnecessary layout thrashing and CPU usage. In content scripts where performance is critical to avoid degrading page responsiveness, these DOM queries should be cached.
**Action:** When working with dynamic UI injected via content scripts (e.g., translation popups), create a centralized cache object (e.g., `popupCache`) to store element references right after DOM creation or the first query, and reuse them in frequent event listeners.

## 2026-03-06 - [Hoist Regex Compilation in Web Worker]
**Learning:** In highly trafficked interceptors like the global fetch proxy used in `worker.ts`, instantiating regular expressions inline within the handler function causes them to be recompiled on every single execution. For processes that stream data with potentially thousands of requests or checks, this introduces measurable latency and CPU overhead.
**Action:** Always hoist static regex definitions outside of frequently called functions (e.g. event handlers or interceptors) into module scope or outer closures to compile them once during initialization.

## 2025-03-06 - [Hoist Regex Compilation and Use Alternation]
**Learning:** Chaining multiple `.replace()` calls on a string with different regular expressions causes the JavaScript engine to traverse the full string multiple times. Furthermore, defining inline regexes inside frequently called utility functions (like `formatUserPrompt`) can introduce unnecessary parsing overhead, even though engines try to cache them.
**Action:** When performing multiple string replacement sanitization tasks, combine the regular expressions using alternation (`|`) into a single regex, and hoist the compiled regex to the module scope. This optimizes string processing by requiring only a single traversal and guaranteeing the regex is compiled only once.
