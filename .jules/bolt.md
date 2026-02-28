## 2024-05-18 - [Optimize Map lookups]
**Learning:** The Map.has() followed by Map.get() pattern adds unnecessary overhead (~82% slower) compared to a single Map.get() followed by a truthy check.
**Action:** When querying Maps (like those caching engine instances), retrieve the value once via `.get()` and check if it exists instead of querying the Map twice.
