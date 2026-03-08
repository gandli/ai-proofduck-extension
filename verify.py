from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

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

        page.goto("http://localhost:8081/sidepanel.html")
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Print page content to debug if selector fails
        print(f"Page title: {page.title()}")
        print(f"Body content length: {len(page.content())}")

        try:
            # Use a more generic selector for the settings button (the last button in the ModeSelector div)
            settings_btn = page.locator('div.flex.items-stretch > button.flex.items-center.justify-center').first
            settings_btn.wait_for(state='visible', timeout=5000)
            settings_btn.click()
            page.wait_for_timeout(1000)

            # Focus the local model selector to see the focus outline
            page.locator('#local-model-select').focus()
            page.wait_for_timeout(500)

            # Hover over a label to see if pointer cursor shows (optional)
            page.locator('label[for="lang-select"]').hover()

            page.screenshot(path="verification.png", full_page=True)
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Failed to find element: {e}")
            page.screenshot(path="error_state.png")
            print("Saved error_state.png")

        browser.close()

if __name__ == "__main__":
    verify()
