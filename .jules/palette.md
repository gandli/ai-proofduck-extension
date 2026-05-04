## 2026-05-04 - Wrap pure visual characters inside interactive buttons
**Learning:** Pure visual characters or emojis inside interactive components lacking semantic boundaries can result in confusing screen reader announcements, particularly when mixed with interactive logic like aria labels.
**Action:** Always wrap purely visual characters (e.g. `×`, `📋`, `🔊`, `↻`, `📖`) inside a `<span aria-hidden="true">` element when used alongside labels in components like buttons. Furthermore, non-submit buttons must always have `type="button"` specified.
