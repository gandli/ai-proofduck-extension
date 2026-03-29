import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Mock extension APIs properly for React hooks
    page.add_init_script("""
        window.browser = {
            runtime: {
                id: 'test-extension-id',
                getManifest: () => ({ version: '1.0.0' }),
                getURL: (path) => path,
                onMessage: { addListener: () => {}, removeListener: () => {} },
                sendMessage: async () => {}
            },
            tabs: { query: async () => [{ id: 1, url: 'https://example.com' }] },
            storage: {
                local: { get: async () => ({ settings: { extensionLanguage: 'English', engine: 'chrome-ai' } }), set: async () => {} },
                session: { get: async () => ({}), set: async () => {} },
                onChanged: { addListener: () => {}, removeListener: () => {} }
            }
        };
        window.chrome = window.browser;
    """)

    page.goto("http://localhost:8081/sidepanel.html")
    page.wait_for_timeout(3000)
    page.screenshot(path="/home/jules/verification/screenshots/verification-main.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
