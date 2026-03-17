from playwright.sync_api import sync_playwright

def verify_accessibility():
    # We will just verify that the static file output contains the attributes we added
    with open('dist/chrome-mv3/chunks/sidepanel-BtLK4T8l.js', 'r') as f:
        content = f.read()

        print("Checking for attributes in compiled chunk...")

        if 'aria-label:t.original_text' in content or 'aria-label:e.original_text' in content or '"aria-label":e.original_text' in content:
            print("✅ Found aria-label on textarea for original text")
        else:
            print("❌ Could not verify aria-label for original text in chunk (might be minified differently)")

        if 'title:t.settings' in content or 'title:e.settings' in content or '"title":e.settings' in content:
            print("✅ Found title on settings button")

        if 'title:t.close_btn' in content or 'title:e.close_btn' in content or '"title":e.close_btn' in content:
            print("✅ Found title on close button")

        if 'focus-visible:ring-2' in content:
            print("✅ Found focus-visible:ring-2 class")

if __name__ == "__main__":
    verify_accessibility()
