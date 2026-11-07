from playwright.sync_api import sync_playwright

def test_interactive():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_logs = []
        page_errors = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: page_errors.append(str(err)))
        
        page.goto("http://127.0.0.1:8092/index.html", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        
        # 1. Test Vocab Level Filters
        print("\n--- Testing Vocab Level Filters ---")
        page.click('[data-tab="vocab"]')
        page.wait_for_timeout(300)
        
        page.click('.level-btn[data-level="A_foundational"]')
        page.wait_for_timeout(200)
        rows_a = len(page.query_selector_all("#vocab-table tr"))
        print(f"Level A rows: {rows_a}")
        assert rows_a == 100, f"Expected 100, got {rows_a}"
        
        page.click('.level-btn[data-level="B_intermediate"]')
        page.wait_for_timeout(200)
        rows_b = len(page.query_selector_all("#vocab-table tr"))
        print(f"Level B rows: {rows_b}")
        assert rows_b == 100, f"Expected 100, got {rows_b}"
        
        page.click('.level-btn[data-level="C_advanced"]')
        page.wait_for_timeout(200)
        rows_c = len(page.query_selector_all("#vocab-table tr"))
        print(f"Level C rows: {rows_c}")
        assert rows_c == 100, f"Expected 100, got {rows_c}"
        
        page.click('.level-btn[data-level="all"]')
        page.wait_for_timeout(200)
        rows_all = len(page.query_selector_all("#vocab-table tr"))
        print(f"Level All rows: {rows_all}")
        assert rows_all == 300, f"Expected 300, got {rows_all}"
        
        # Test Vocab Search
        page.fill('#vocab-search', 'achieve')
        page.wait_for_timeout(200)
        rows_search = len(page.query_selector_all("#vocab-table tr"))
        print(f"Search 'achieve' rows: {rows_search}")
        assert rows_search >= 1
        page.fill('#vocab-search', '')
        page.wait_for_timeout(200)
        
        # 2. Test Flashcards Interaction (Rating & Next Card)
        print("\n--- Testing Flashcards (SRS Leitner) ---")
        page.click('[data-tab="flashcards"]')
        page.wait_for_timeout(300)
        card1_word = page.evaluate("document.getElementById('srs-card-word')?.innerText")
        print(f"Initial card: {card1_word}")
        page.click('#srs-btn-flip')
        page.wait_for_timeout(200)
        # Click Good rating (+1 box)
        page.click('#srs-btn-good')
        page.wait_for_timeout(300)
        card2_word = page.evaluate("document.getElementById('srs-card-word')?.innerText")
        print(f"Next card after rating: {card2_word}")
        assert card2_word != card1_word, "Card should advance to next word"
        
        # 3. Test Suno Songs Prompts Tab
        print("\n--- Testing Suno 50 Educational Songs ---")
        page.click('[data-tab="suno"]')
        page.wait_for_timeout(400)
        options_count = len(page.query_selector_all("#suno-song-select option"))
        print(f"Suno select options count: {options_count}")
        assert options_count >= 50, f"Expected at least 50 Suno songs, got {options_count}"
        song_title = page.evaluate("document.getElementById('suno-title')?.innerText")
        print(f"Suno active song title: '{song_title}'")
        assert len(song_title) > 0, "Expected non-empty Suno song title"
        
        # 4. Test 30-Song Karaoke Teleprompter under Songs tab
        print("\n--- Testing 30-Song Karaoke Teleprompter in Songs Tab ---")
        page.click('[data-tab="songs"]')
        page.wait_for_timeout(400)
        karaoke_songs_count = len(page.query_selector_all("#karaoke-30-select option"))
        print(f"Karaoke 30-select options count: {karaoke_songs_count}")
        assert karaoke_songs_count >= 30, f"Expected 30 songs, got {karaoke_songs_count}"
        page.click('#btn-teleprompter-play')
        page.wait_for_timeout(400)
        lines_count = len(page.query_selector_all("#teleprompter-viewport [data-line-idx]"))
        print(f"Teleprompter lines rendered: {lines_count}")
        assert lines_count > 0, "Expected teleprompter lines"
        page.click('#btn-teleprompter-play') # pauses

        # 5. Test Rhythm Tap Karaoke Tab
        print("\n--- Testing Karaoke Rhythm Tap Tab ---")
        page.click('[data-tab="karaoke"]')
        page.wait_for_timeout(300)
        page.click('#karaoke-start-btn')
        page.wait_for_timeout(300)
        status_text = page.evaluate("document.getElementById('karaoke-status-text')?.innerText")
        print(f"Karaoke game status: '{status_text}'")

        # 6. Test Quiz Modes (Sentence Completion, Restatements, Reading Comprehension)
        print("\n--- Testing Quiz Exam Modes ---")
        page.click('[data-tab="quiz"]')
        page.wait_for_timeout(300)
        
        # Switch to Restatements mode
        print("Testing Restatements tab button...")
        page.click('#exam-type-restatement')
        page.wait_for_timeout(400)
        restatement_prompt = page.evaluate("document.querySelector('.quiz-q:not(.hidden) p')?.innerText")
        print(f"Restatement question text: '{restatement_prompt[:60]}...'")
        restatement_opts = len(page.query_selector_all(".quiz-q:not(.hidden) .quiz-opt"))
        print(f"Restatement options count: {restatement_opts}")
        assert restatement_opts == 4, f"Expected 4 restatement options, got {restatement_opts}"
        
        # Switch to Reading Comprehension mode
        print("Testing Reading Comprehension tab button...")
        page.click('#exam-type-reading')
        page.wait_for_timeout(400)
        is_rc_panel_visible = page.evaluate("!document.getElementById('reading-passage-container').classList.contains('hidden')")
        print(f"RC passage panel visible: {is_rc_panel_visible}")
        assert is_rc_panel_visible, "RC passage panel should be visible"
        rc_title = page.evaluate("document.getElementById('rc-passage-title')?.innerText")
        print(f"RC passage title: '{rc_title}'")
        rc_opts = len(page.query_selector_all(".quiz-q:not(.hidden) .quiz-opt"))
        print(f"RC question options count: {rc_opts}")
        assert rc_opts == 4, f"Expected 4 RC options, got {rc_opts}"
        
        # 7. Test Dashboard Update
        print("\n--- Testing Dashboard Metrics ---")
        page.click('[data-tab="dashboard"]')
        page.wait_for_timeout(400)
        score_val = page.evaluate("document.getElementById('amiram-score-display')?.innerText")
        cefr_val = page.evaluate("document.getElementById('amiram-cefr-badge')?.innerText")
        print(f"Dashboard score: {score_val}, CEFR: {cefr_val}")
        assert int(score_val) >= 50 and int(score_val) <= 150, f"Score out of range: {score_val}"

        print("\nPage errors:", page_errors)
        assert len(page_errors) == 0, f"Encountered page errors: {page_errors}"
        print("\n>>> ALL DEEP INTERACTIVE TESTS PASSED PERFECTLY! <<<")
        browser.close()

if __name__ == '__main__':
    test_interactive()
