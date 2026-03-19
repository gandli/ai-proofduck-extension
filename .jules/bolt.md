## 2024-03-24 - [Avoid Redundant DOM Queries in High-Frequency Handlers]
**Learning:** Calling `document.getElementById` or `shadowRootNode.getElementById` repeatedly during high-frequency events like global `mousemove`/`mouseup` and WebSocket/Worker stream updates (e.g., `WORKER_UPDATE` every 50ms) causes unnecessary layout thrashing and CPU usage. In content scripts where performance is critical to avoid degrading page responsiveness, these DOM queries should be cached.
**Action:** When working with dynamic UI injected via content scripts (e.g., translation popups), create a centralized cache object (e.g., `popupCache`) to store element references right after DOM creation or the first query, and reuse them in frequent event listeners.

## 2026-03-06 - [Hoist Regex Compilation in Web Worker]
**Learning:** In highly trafficked interceptors like the global fetch proxy used in `worker.ts`, instantiating regular expressions inline within the handler function causes them to be recompiled on every single execution. For processes that stream data with potentially thousands of requests or checks, this introduces measurable latency and CPU overhead.
**Action:** Always hoist static regex definitions outside of frequently called functions (e.g. event handlers or interceptors) into module scope or outer closures to compile them once during initialization.

## 2024-10-25 - [Hoist and Combine Regex in String Sanitization]
**Learning:** Using multiple chained `.replace()` calls with different regular expressions (e.g., `text.replace(/A/).replace(/B/).replace(/C/)`) to sanitize input causes multiple full-string traversals and intermediate string allocations. This overhead is particularly noticeable in high-frequency functions like `formatUserPrompt` that prepare text for ML processing.
**Action:** Prefer a single-pass regular expression with alternation (`|`) (e.g., `/A|B|C/`) and hoist the regex compilation outside of the function scope. This avoids recompilation on every call and reduces overhead, resulting in an 8x+ speedup in microbenchmarks for string sanitization.
