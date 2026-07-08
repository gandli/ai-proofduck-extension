## 2026-07-08 - Fixed XSS vulnerability in index.html
**Vulnerability:** innerHTML was used in index.html to render translations without sanitization.
**Learning:** Even static translation dictionaries need to be rendered safely to prevent XSS if translations were ever dynamic or came from a CMS.
**Prevention:** Use textContent instead of innerHTML for static text.
