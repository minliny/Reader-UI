from pathlib import Path
from playwright.sync_api import sync_playwright, expect
r=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/Users/minliny/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell')
 page=b.new_page(viewport={"width":1440,"height":1000});page.goto('http://127.0.0.1:4197/');page.wait_for_load_state('networkidle');page.set_default_timeout(6000)
 app=page.locator('.manga-app');nav=page.locator('.manga-demo-sidebar nav')
 nav.get_by_role('button',name='完整目录').click();app.get_by_label('搜索章名或序号').fill('第20');app.locator('[data-chapter-id="ep-20"]').click();page.get_by_role('button',name='查看章末画面',exact=True).click()
 expect(app.locator('.chapter-end')).to_contain_text('下一卷 · 番外卷 · 山海手札');app.get_by_role('button',name='继续阅读下一卷').click();expect(app.locator('.header-title small')).to_have_text('番外卷 · 山海手札')
 print('PASS 第20话章末文案与按钮均进入同一可读番外卷')
 nav.get_by_role('button',name='漫画详情').click();page.wait_for_timeout(250);scroll=app.locator('.manga-page>.mobile-scroll');scroll.evaluate('(el)=>el.scrollTop=el.scrollHeight');page.wait_for_timeout(150);last=app.locator('[data-chapter-id="whole-volume"]').bounding_box();dock=app.locator('.manga-detail-dock').bounding_box();assert last['y']+last['height']<dock['y']
 full=app.get_by_role('button',name='完整目录',exact=True);full.scroll_into_view_if_needed();page.wait_for_timeout(150);saved=scroll.evaluate('(el)=>el.scrollTop');full.click();app.get_by_role('button',name='返回',exact=True).click();expect(app).to_have_attribute('data-page','detail');page.wait_for_timeout(200);restored=scroll.evaluate('(el)=>el.scrollTop');print('SCROLL',saved,restored);assert abs(restored-saved)<2
 print('PASS 详情末行可滚过悬浮层；返回保留滚动位置')
 page.locator('.manga-demo-sidebar').get_by_role('button',name='深墨',exact=True).click();page.wait_for_timeout(250);page.screenshot(path=str(r/'screenshots/19-detail-dark-check.png'))
 page.get_by_role('button',name='平板方案').click();page.wait_for_timeout(250);page.screenshot(path=str(r/'screenshots/20-tablet-dark.png'));page.get_by_role('button',name='关闭版式对照').click()
 page.set_viewport_size({'width':600,'height':900});page.wait_for_timeout(200);page.screenshot(path=str(r/'screenshots/21-narrow-preview.png'));b.close()
