## 2024-03-24 - [Avoid Redundant DOM Queries in High-Frequency Handlers]
**Learning:** Calling `document.getElementById` or `shadowRootNode.getElementById` repeatedly during high-frequency events like global `mousemove`/`mouseup` and WebSocket/Worker stream updates (e.g., `WORKER_UPDATE` every 50ms) causes unnecessary layout thrashing and CPU usage. In content scripts where performance is critical to avoid degrading page responsiveness, these DOM queries should be cached.
**Action:** When working with dynamic UI injected via content scripts (e.g., translation popups), create a centralized cache object (e.g., `popupCache`) to store element references right after DOM creation or the first query, and reuse them in frequent event listeners.

## 2026-03-06 - [Hoist Regex Compilation in Web Worker]
**Learning:** In highly trafficked interceptors like the global fetch proxy used in `worker.ts`, instantiating regular expressions inline within the handler function causes them to be recompiled on every single execution. For processes that stream data with potentially thousands of requests or checks, this introduces measurable latency and CPU overhead.
**Action:** Always hoist static regex definitions outside of frequently called functions (e.g. event handlers or interceptors) into module scope or outer closures to compile them once during initialization.

## 2024-05-18 - [Combine and Hoist Regexes to Avoid Chained Replace Overhead]
**Learning:** In text processing functions that handle dynamic or potentially large strings, chaining multiple `.replace()` calls with inline regexes causes unnecessary intermediate string allocations (memory copying) and redundant full-string traversals.
**Action:** When applying multiple sequential string replacements, combine them into a single-pass regular expression using alternation (`|`) and hoist the compilation of the regex outside of the function to avoid re-compiling it on every execution.
