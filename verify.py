from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:8081/sidepanel.html")
    # Wait for the main app container to appear to ensure React mounted
    page.wait_for_timeout(3000)

    print("Console logs:")

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )

        # Inject mock browser object BEFORE navigation
        context.add_init_script("""
            window.browser = {
                runtime: {
                    id: 'mock-id',
                    getManifest: () => ({ version: '1.0' }),
                    getURL: (path) => path,
                    onMessage: { addListener: () => {}, removeListener: () => {} },
                    sendMessage: async () => {}
                },
                tabs: {
                    query: async () => []
                },
                storage: {
                    local: {
                        get: async () => ({
                            'ai_proofduck_settings': {
                                engine: 'local-wasm',
                                extensionLanguage: 'English'
                            }
                        }),
                        set: async () => {}
                    },
                    session: {
                        get: async () => ({}),
                        set: async () => {}
                    },
                    onChanged: { addListener: () => {}, removeListener: () => {} }
                }
            };
        """)

        page = context.new_page()
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
