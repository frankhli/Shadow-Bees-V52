#!/usr/bin/env python3
"""截图脚本 - 使用Selenium截取三个端的核心页面"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# 截图保存目录
SCREENSHOT_DIR = "/Users/frank/Desktop/华美会合作资料/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def create_driver():
    """创建Chrome浏览器实例"""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--hide-scrollbars")
    
    # 设置页面加载策略
    options.page_load_strategy = 'eager'
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def capture_page(driver, url, filename, wait_time=5):
    """截取单个页面"""
    print(f"正在截图: {filename}...")
    try:
        driver.get(url)
        time.sleep(wait_time)  # 等待页面渲染
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        print(f"✅ 已保存: {filepath}")
        return True
    except Exception as e:
        print(f"❌ 截图失败 {filename}: {e}")
        return False

def main():
    print("=" * 50)
    print("开始截取 Shadow-Bees 三端页面")
    print("=" * 50)
    
    driver = create_driver()
    
    # 酒店端截图
    print("\n【酒店端】")
    capture_page(driver, "http://localhost:5173/", "01-hotel-overview.png")
    capture_page(driver, "http://localhost:5173/content-factory", "02-hotel-content.png")
    capture_page(driver, "http://localhost:5173/tickets", "03-hotel-tickets.png")
    capture_page(driver, "http://localhost:5173/pricing", "04-hotel-pricing.png")
    
    # 集团端截图
    print("\n【集团端】")
    capture_page(driver, "http://localhost:5173/group", "05-group-dashboard.png")
    capture_page(driver, "http://localhost:5173/group/channels", "06-group-channels.png")
    capture_page(driver, "http://localhost:5173/group/hotels", "07-group-hotels.png")
    
    # 管理端截图
    print("\n【管理端】")
    capture_page(driver, "http://localhost:5173/admin", "08-admin-dashboard.png")
    capture_page(driver, "http://localhost:5173/admin/customers", "09-admin-customers.png")
    capture_page(driver, "http://localhost:5173/admin/finance", "10-admin-finance.png")
    
    driver.quit()
    
    print("\n" + "=" * 50)
    print(f"所有截图已保存到: {SCREENSHOT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
