from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Mock window.browser API
        # Need to ensure this runs before any script on the page
        page.add_init_script("""
            const mockBrowser = {
                storage: {
                    local: {
                        get: async () => {
                            console.log("Mock storage.local.get called");
                            return {
                                selectedText: 'Initial text',
                                settings: { engine: 'chrome-ai', extensionLanguage: 'English' }
                            };
                        },
                        set: async () => {},
                        remove: async () => {},
                    },
                    session: {
                        get: async () => ({}),
                        set: async () => {},
                    },
                    onChanged: {
                        addListener: () => console.log("storage.onChanged.addListener called"),
                        removeListener: () => {},
                    }
                },
                tabs: {
                    query: async () => ([{ id: 1 }]),
                    sendMessage: async () => ({ content: 'Page content' }),
                },
                runtime: {
                    sendMessage: async () => {},
                    getURL: (path) => path,
                    id: 'mock-extension-id',
                    onMessage: {
                        addListener: () => console.log("runtime.onMessage.addListener called"),
                        removeListener: () => {},
                    },
                    onConnect: {
                        addListener: () => {},
                    }
                },
                i18n: {
                    getMessage: (key) => key,
                    getUILanguage: () => 'en',
                }
            };
            window.browser = mockBrowser;
            window.chrome = mockBrowser;
            console.log("Mock browser API injected");
        """)

        try:
            print("Navigating to page...")
            page.goto("http://localhost:8000/sidepanel.html")

            print("Waiting for textarea...")
            # Wait for the main textarea to be visible
            page.wait_for_selector("textarea", timeout=5000)

            print("Filling textarea...")
            page.fill("textarea", "Hello World")

            print("Taking screenshot...")
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
