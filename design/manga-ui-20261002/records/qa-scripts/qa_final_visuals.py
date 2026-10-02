from pathlib import Path
from playwright.sync_api import sync_playwright, expect
r=Path(__file__).parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/Users/minliny/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell')
 page=b.new_page(viewport={'width':1440,'height':1000});page.goto('http://127.0.0.1:4197/');page.wait_for_load_state('networkidle');app=page.locator('.manga-app');nav=page.locator('.manga-demo-sidebar nav')
 def shot(name):
  page.wait_for_timeout(600);page.mouse.move(30,30);page.screenshot(path=str(r/'screenshots'/f'{name}.png'))
 shot('01-detail')
 nav.get_by_role('button',name='共用书架').click();expect(app.locator('.manga-header h2')).to_have_text('书架');shot('13-shelf')
 nav.get_by_role('button',name='搜索适配').click();expect(app.locator('.manga-header h2')).to_have_text('搜索');shot('12-search')
 nav.get_by_role('button',name='书源适配').click();expect(app.locator('.manga-header h2')).to_have_text('书源管理');shot('11-sources')
 nav.get_by_role('button',name='漫画阅读').click();app.get_by_role('button',name='目录',exact=True).click();page.wait_for_timeout(650);row=page.locator('.manga-sheet-body [data-chapter-id="ep-12"]');bounds=row.bounding_box();viewport=page.locator('.sheet-scroll .mobile-scroll').bounding_box();assert bounds['y']>=viewport['y'] and bounds['y']+bounds['height']<=viewport['y']+viewport['height'];shot('04-reader-directory');print('PASS 阅读目录打开时当前条目可见')
 page.get_by_role('button',name='关闭面板').click();page.wait_for_timeout(550);page.get_by_role('button',name='平板方案').click();expect(page.locator('.adaptive-catalog .volume-heading')).to_have_count(2);shot('22-tablet');page.get_by_role('button',name='关闭版式对照').click()
 page.set_viewport_size({'width':600,'height':900});page.wait_for_timeout(200);expect(page.get_by_label('选择Demo页面')).to_be_visible();page.get_by_label('选择Demo页面').select_option('detail');shot('21-narrow-preview');print('PASS 宽屏目录完整；窄屏外部导航可用');b.close()
