## 2024-06-20 - Cache DOM lookups outside loops
**Learning:** Found an expensive DOM querying function (`detectPageLanguage`) being called inside a loop over all text nodes during full page translation. Querying `document.querySelector` thousands of times causes significant main thread blocking.
**Action:** Always resolve configuration values that rely on DOM lookups or other expensive operations *before* iterating over large collections of elements.
