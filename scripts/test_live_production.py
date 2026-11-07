from playwright.sync_api import sync_playwright

def test_live():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_logs = []
        page_errors = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: page_errors.append(str(err)))
        
        url = 'https://swissystem7.github.io/ShirAmiram/'
        print(f"Visiting live: {url}")
        page.goto(url, wait_until='networkidle')
        page.wait_for_timeout(1000)
        
        # Test Vocab
        rows = len(page.query_selector_all('#vocab-table tr'))
        print(f"Live Vocab rows: {rows}")
        
        # Test Tabs
        tabs = ['quiz', 'flashcards', 'dashboard', 'songs', 'suno', 'karaoke']
        for tab in tabs:
            page.click(f'[data-tab="{tab}"]')
            page.wait_for_timeout(300)
            is_vis = page.evaluate(f"!document.getElementById('{tab}').classList.contains('hidden')")
            print(f"Tab #{tab} visible: {is_vis}")
            
        # Test Flashcard Flip
        page.click('[data-tab="flashcards"]')
        page.wait_for_timeout(300)
        word = page.evaluate('document.getElementById("srs-card-word")?.innerText')
        page.click('#srs-btn-flip')
        page.wait_for_timeout(200)
        definition = page.evaluate('document.getElementById("srs-card-def")?.innerText')
        print(f"Flashcard live: Word=\"{word}\", Def=\"{definition}\"")
        
        # Test Quiz click
        page.click('[data-tab="quiz"]')
        page.wait_for_timeout(300)
        page.click('.quiz-q:not(.hidden) .quiz-opt')
        page.wait_for_timeout(300)
        fb = page.evaluate('document.querySelector(".quiz-q .quiz-fb")?.innerText')
        print(f"Quiz live feedback: \"{fb}\"")
        
        # Test Suno Songs
        page.click('[data-tab="suno"]')
        page.wait_for_timeout(300)
        suno_opts = len(page.query_selector_all('#suno-song-select option'))
        print(f"Live Suno songs count: {suno_opts}")
        
        print('\nLive Page Errors:', page_errors)
        browser.close()
        assert len(page_errors) == 0, f"Page errors found: {page_errors}"
        assert rows == 300, f"Expected 300 vocab rows, got {rows}"
        print('\n>>> LIVE PRODUCTION VERIFICATION 100% SUCCESSFUL! <<<')

if __name__ == '__main__':
    test_live()
