from playwright.sync_api import sync_playwright
import subprocess
import time
import os
import shutil

def run_verification():
    # Start HTTP server
    server_process = subprocess.Popen(
        ["python3", "-m", "http.server", "8000", "--directory", "dist/chrome-mv3"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)  # Wait for server

    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()

            # Mock APIs
            context.add_init_script("""
                const mockStorage = {
                    settings: {
                        extensionLanguage: 'English',
                        engine: 'local-wasm',
                        localModel: 'Llama-3-8B-Instruct-q4f32_1-MLC'
                    },
                    selectedText: 'Sample text from verification script'
                };

                const mockApi = {
                    runtime: {
                        id: 'mock-id',
                        getManifest: () => ({ version: '1.0.0' }),
                        onMessage: {
                            addListener: () => {},
                            removeListener: () => {}
                        },
                        sendMessage: () => Promise.resolve({})
                    },
                    tabs: {
                        query: () => Promise.resolve([{ id: 1 }]),
                        sendMessage: () => Promise.resolve({ content: 'Test content' })
                    },
                    storage: {
                        local: {
                            get: (keys, callback) => {
                                const res = mockStorage;
                                if (callback) callback(res);
                                return Promise.resolve(res);
                            },
                            set: (items, callback) => {
                                Object.assign(mockStorage, items);
                                if (callback) callback();
                                return Promise.resolve();
                            },
                            remove: (keys, callback) => {
                                if (callback) callback();
                                return Promise.resolve();
                            },
                            onChanged: {
                                addListener: () => {},
                                removeListener: () => {}
                            }
                        },
                        session: {
                            get: (keys, callback) => {
                                if (callback) callback({});
                                return Promise.resolve({});
                            },
                            set: (items, callback) => {
                                if (callback) callback();
                                return Promise.resolve();
                            },
                            onChanged: {
                                addListener: () => {},
                                removeListener: () => {}
                            }
                        },
                        onChanged: {
                            addListener: () => {},
                            removeListener: () => {}
                        }
                    },
                    i18n: {
                        getMessage: (key) => key,
                        getUILanguage: () => 'en-US'
                    }
                };

                window.browser = mockApi;
                window.chrome = mockApi;
            """)

            page = context.new_page()

            print("Navigating...")
            page.goto("http://localhost:8000/sidepanel.html")

            # Wait for ModeSelector (Summarize button)
            page.wait_for_selector("text=Summarize", timeout=5000)

            # Take clean screenshot
            os.makedirs("/home/jules/verification", exist_ok=True)
            screenshot_path = "/home/jules/verification/verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"Verification failed: {e}")
        exit(1)

    finally:
        if browser:
            browser.close()
        server_process.terminate()

if __name__ == "__main__":
    run_verification()
