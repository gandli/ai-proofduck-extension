## 2024-04-29 - Parallelize Engine Availability Checks
**Learning:** EngineManager uses a sequential loop over \`engines.values()\` to call \`await engine.checkAvailability()\`, which takes O(N) time across N engines (doing network/local checks sequentially).
**Action:** Replace \`for...of\` loops with \`Promise.all\` and \`Array.map\` to parallelize async checking routines across available engines, significantly speeding up initialization times and fallback queries without modifying program state determinism.
