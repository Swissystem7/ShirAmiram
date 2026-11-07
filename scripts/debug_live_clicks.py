from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_logs = []
        page_errors = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: page_errors.append(str(err)))
        
        url = "http://127.0.0.1:8092/index.html"
        print(f"Navigating to {url} ...")
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        
        tabs = [
            ("vocab", '[data-tab="vocab"]'),
            ("quiz", '[data-tab="quiz"]'),
            ("flashcards", '[data-tab="flashcards"]'),
            ("dashboard", '[data-tab="dashboard"]'),
            ("songs", '[data-tab="songs"]'),
            ("suno", '[data-tab="suno"]'),
            ("karaoke", '[data-tab="karaoke"]'),
            ("song", '[data-tab="song"]')
        ]
        
        for name, selector in tabs:
            btn = page.query_selector(selector)
            if not btn:
                print(f"ERROR: Tab button {name} ({selector}) NOT found in DOM!")
                continue
            
            print(f"\n--- Testing Tab: {name} ---")
            btn.click()
            page.wait_for_timeout(400)
            
            section = page.query_selector(f"#{name}")
            if not section:
                print(f"ERROR: Section #{name} NOT found in DOM!")
                continue
                
            is_visible = page.evaluate(f"!document.getElementById('{name}').classList.contains('hidden')")
            print(f"Tab #{name} visible: {is_visible}")
            
            if name == "flashcards":
                card_word = page.evaluate("document.getElementById('srs-card-word')?.innerText")
                print(f"Flashcard word displayed: '{card_word}'")
                flip_btn = page.query_selector("#srs-btn-flip")
                if flip_btn:
                    flip_btn.click()
                    page.wait_for_timeout(300)
                    card_def = page.evaluate("document.getElementById('srs-card-def')?.innerText")
                    print(f"Flashcard flipped definition: '{card_def}'")
                    is_actions_visible = page.evaluate("!document.getElementById('srs-actions').classList.contains('hidden')")
                    print(f"SRS rating actions visible after flip: {is_actions_visible}")
                else:
                    print("ERROR: #srs-btn-flip not found!")
                    
            elif name == "songs":
                page.wait_for_timeout(500)
                articles = page.query_selector_all("#songs-list article")
                print(f"Songs count in songs tab: {len(articles)}")
                
            elif name == "dashboard":
                score = page.evaluate("document.getElementById('amiram-score-display')?.innerText")
                cefr = page.evaluate("document.getElementById('amiram-cefr-badge')?.innerText")
                print(f"Dashboard score: '{score}', CEFR: '{cefr}'")
                
            elif name == "vocab":
                rows = len(page.query_selector_all("#vocab-table tr"))
                print(f"Vocab table rows: {rows}")
                first_row = page.evaluate("document.querySelector('#vocab-table tr')?.innerText")
                print(f"First vocab row: {first_row}")

            elif name == "quiz":
                q_text = page.evaluate("document.querySelector('.quiz-q:not(.hidden) p')?.innerText")
                opts_count = len(page.query_selector_all(".quiz-q:not(.hidden) .quiz-opt"))
                print(f"Active quiz question: '{q_text}', Options count: {opts_count}")
                # Test clicking an option
                first_opt = page.query_selector(".quiz-q:not(.hidden) .quiz-opt")
                if first_opt:
                    first_opt.click()
                    page.wait_for_timeout(300)
                    fb_text = page.evaluate("document.querySelector('.quiz-q .quiz-fb')?.innerText")
                    print(f"Quiz feedback after click: '{fb_text}'")
        
        print("\n=== Console Logs ===")
        for log in console_logs:
            print(log)
            
        print("\n=== Page Errors ===")
        for err in page_errors:
            print(err)
            
        browser.close()

if __name__ == '__main__':
    main()
