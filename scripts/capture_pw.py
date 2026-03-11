#!/usr/bin/env python3
"""用Playwright截图 - 完整登录流程"""

import asyncio
from playwright.async_api import async_playwright
import os

SCREENSHOT_DIR = "/Users/frank/Desktop/华美会合作资料/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def capture_page(page, url, filename, password="owner123"):
    """访问页面、登录、截图"""
    print(f"截图: {filename}...")
    try:
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(2)
        
        # 1. 点击"进入系统"
        enter_btn = await page.query_selector("text=进入系统")
        if enter_btn:
            await enter_btn.click()
            print(f"  点击进入系统...")
            await asyncio.sleep(2)
        
        # 2. 输入密码
        pwd_input = await page.query_selector("input[type='password']")
        if pwd_input:
            await pwd_input.fill(password)
            print(f"  输入密码...")
        
        # 3. 点击登录
        login_btn = await page.query_selector("text=登录系统")
        if login_btn:
            await login_btn.click()
            print(f"  点击登录...")
            await asyncio.sleep(5)
        
        # 截图
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        await page.screenshot(path=filepath, full_page=False)
        print(f"✅ {filepath}")
        return True
    except Exception as e:
        print(f"⚠️ {e}")
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        await page.screenshot(path=filepath, full_page=False)
        return False

async def main():
    print("=" * 50)
    print("Playwright 截图")
    print("=" * 50)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        base = "http://localhost:5173"
        
        # 酒店端
        print("\n【酒店端】")
        await capture_page(page, f"{base}/content-factory", "01-内容工厂-AI种草.png", "owner123")
        await capture_page(page, f"{base}/tickets", "02-AI客服-智能工单.png", "owner123")
        await capture_page(page, f"{base}/pricing", "03-智能定价-尾房促销.png", "owner123")
        
        # 集团端
        print("\n【集团端】")
        await capture_page(page, f"{base}/group", "04-集团数据大盘.png", "admin123")
        await capture_page(page, f"{base}/group/channels", "05-渠道分析-私域效果.png", "admin123")
        
        await browser.close()
    
    print("\n" + "=" * 50)
    print("完成！")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
