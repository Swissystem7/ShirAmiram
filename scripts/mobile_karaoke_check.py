#!/usr/bin/env python3
"""Headless mobile overflow + tap-target check for ShirAmiram karaoke."""
from __future__ import annotations
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path.home() / "shiramiram"
INDEX = ROOT / "index.html"
OUT = Path.home() / "test-artifacts"
VIEWPORTS = [(375, 812), (390, 844)]


def check(width: int, height: int) -> None:
    url = "file://" + str(INDEX)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(url, wait_until="domcontentloaded")
        # open karaoke tab
        page.locator('[data-tab="karaoke"]').click()
        page.wait_for_timeout(200)
        sw = page.evaluate("document.documentElement.scrollWidth")
        cw = page.evaluate("document.documentElement.clientWidth")
        assert sw <= width + 1, f"{width}: scrollWidth {sw} > viewport {width} (client={cw})"
        for sel in ("#karaoke-start-btn", "#karaoke-mic-btn"):
            box = page.locator(sel).bounding_box()
            assert box, f"missing {sel}"
            assert box["height"] >= 44 - 0.5, f"{sel} height {box['height']} < 44 at {width}"
            assert box["width"] >= 44 - 0.5, f"{sel} width {box['width']} < 44 at {width}"
        # status indicator exists
        assert page.locator("#karaoke-status").count() == 1
        assert page.locator("#karaoke-scoreboard").count() == 1
        OUT.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(OUT / f"karaoke-{width}.png"), full_page=True)
        # instrumental flag via evaluate
        has = page.evaluate(
            """() => {
              const K = window.ShirAmiramKaraoke;
              if (!K) return {ok:false, reason:'no K'};
              const fake = {
                state:'running', currentTime:0, destination:{},
                createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};},
                createOscillator(){return {type:'',frequency:{value:0},connect(){},start(){},stop(){},disconnect(){}};}
              };
              const pl = K.createInstrumentalPlayer(fake);
              return {ok:true, hasVocals: pl.hasVocals, kind: pl.kind};
            }"""
        )
        assert has.get("ok"), has
        assert has["hasVocals"] is False, has
        browser.close()
        print(f"PASS {width}x{height} scrollWidth={sw} vocals=False")


def main() -> int:
    if not INDEX.exists():
        print("missing", INDEX)
        return 1
    rc = 0
    for w, h in VIEWPORTS:
        try:
            check(w, h)
        except Exception as e:
            print(f"FAIL {w}: {e}")
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
