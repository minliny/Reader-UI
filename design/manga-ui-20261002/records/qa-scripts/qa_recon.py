from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path="/Users/minliny/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell")
 page=browser.new_page(viewport={"width":1440,"height":1000},device_scale_factor=1)
 page.goto("http://127.0.0.1:4197/")
 page.wait_for_load_state("networkidle")
 page.screenshot(path=str(root/"qa-detail.png"),full_page=True)
 print(json.dumps({"buttons":page.get_by_role("button").all_text_contents(),"content":page.locator(".manga-app").inner_text()},ensure_ascii=False))
 browser.close()
