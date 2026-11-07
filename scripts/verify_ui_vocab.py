from playwright.sync_api import sync_playwright
from pathlib import Path

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        url = (Path(r'D:\ShirAmiram\index.html')).as_uri()
        page.goto(url)
        page.wait_for_timeout(500)
        
        # 1. Check initial active tab
        active_tab = page.evaluate("document.querySelector('.tab-btn[aria-pressed=\"true\"]')?.getAttribute('data-tab')")
        print('Initial active tab:', active_tab)
        
        # 2. Check total vocab rows
        total_rows = len(page.query_selector_all('#vocab-table tr'))
        print('Total vocab rows loaded:', total_rows)
        
        # 3. Click Level A
        page.click('[data-level="A_foundational"]')
        level_a = len(page.query_selector_all('#vocab-table tr'))
        print('Level A rows:', level_a)
        
        # 4. Click Level B
        page.click('[data-level="B_intermediate"]')
        level_b = len(page.query_selector_all('#vocab-table tr'))
        print('Level B rows:', level_b)
        
        # 5. Click Level C
        page.click('[data-level="C_advanced"]')
        level_c = len(page.query_selector_all('#vocab-table tr'))
        print('Level C rows:', level_c)
        
        # 6. Click Quiz Tab and test Reading Comprehension toggle
        page.click('[data-tab="quiz"]')
        page.click('#exam-type-reading')
        reading_visible = not page.evaluate("document.getElementById('reading-passage-container').classList.contains('hidden')")
        print('Reading Comprehension container visible:', reading_visible)
        
        browser.close()

if __name__ == '__main__':
    main()
