## 2024-03-24 - [Avoid Redundant DOM Queries in High-Frequency Handlers]
**Learning:** Calling `document.getElementById` or `shadowRootNode.getElementById` repeatedly during high-frequency events like global `mousemove`/`mouseup` and WebSocket/Worker stream updates (e.g., `WORKER_UPDATE` every 50ms) causes unnecessary layout thrashing and CPU usage. In content scripts where performance is critical to avoid degrading page responsiveness, these DOM queries should be cached.
**Action:** When working with dynamic UI injected via content scripts (e.g., translation popups), create a centralized cache object (e.g., `popupCache`) to store element references right after DOM creation or the first query, and reuse them in frequent event listeners.

## 2026-03-06 - [Hoist Regex Compilation in Web Worker]
**Learning:** In highly trafficked interceptors like the global fetch proxy used in `worker.ts`, instantiating regular expressions inline within the handler function causes them to be recompiled on every single execution. For processes that stream data with potentially thousands of requests or checks, this introduces measurable latency and CPU overhead.
**Action:** Always hoist static regex definitions outside of frequently called functions (e.g. event handlers or interceptors) into module scope or outer closures to compile them once during initialization.

## 2024-03-24 - [Avoid Chained Regex Replaces in High-Frequency String Parsing]
**Learning:** Using chained `.replace()` calls with separate regular expressions (e.g. `.replace(/a/g, '').replace(/b/g, '')`) causes the JavaScript engine to traverse the string multiple times, and if the regexes are declared inline, they are recompiled on every execution. In high-traffic or large-payload processing, this adds significant CPU overhead.
**Action:** Hoist the regular expression compilation outside of the function scope, and use regex alternation (`|`) to combine patterns (e.g., `const SANITIZE_REGEX = /a|b/g`). Apply it with a single `.replace(SANITIZE_REGEX, '')` to perform replacements in a single traversal pass.
