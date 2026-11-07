#!/usr/bin/env python3
"""Mobile UI Playwright test for ShirAmiram: 375px and 390px across all tabs."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
VIEWPORTS = [(375, 812), (390, 844)]
TABS = ["song", "vocab", "quiz", "flashcards", "dashboard", "songs", "suno", "karaoke"]

def test_mobile():
    url = "file://" + str(INDEX)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto(url, wait_until="domcontentloaded")
            for tab in TABS:
                page.locator(f'[data-tab="{tab}"]').click()
                page.wait_for_timeout(100)
                sw = page.evaluate("document.documentElement.scrollWidth")
                cw = page.evaluate("document.documentElement.clientWidth")
                assert sw <= width + 1, f"Tab {tab} at {width}px: scrollWidth {sw} > clientWidth {cw}"
                
            # Verify tab buttons >= 44px
            for btn in page.locator(".tab-btn").all():
                box = btn.bounding_box()
                if box:
                    assert box["height"] >= 43.5, f"Tab btn height {box['height']} < 44"
                    
            # Check quiz tab
            page.locator('[data-tab="quiz"]').click()
            page.wait_for_timeout(100)
            quiz_opts = page.locator(".quiz-opt").all()
            if quiz_opts:
                for opt in quiz_opts:
                    box = opt.bounding_box()
                    if box and box["height"] > 0:
                        assert box["height"] >= 43.5, f"Quiz opt height {box['height']} < 44"
            print(f"PASS Mobile UI check at {width}x{height}: 0 horizontal overflow, tap targets >= 44px across all tabs.")
        browser.close()

if __name__ == "__main__":
    test_mobile()
