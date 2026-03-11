#!/usr/bin/env python3
"""截图脚本 V2 - 等待页面完全加载"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

SCREENSHOT_DIR = "/Users/frank/Desktop/华美会合作资料/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def create_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--force-device-scale-factor=1")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def wait_for_page_load(driver, url, filename, check_selector=None, wait_time=10):
    """等待页面加载完成再截图"""
    print(f"正在截图: {filename}...")
    try:
        driver.get(url)
        
        # 等待页面加载完成
        if check_selector:
            WebDriverWait(driver, wait_time).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, check_selector))
            )
        else:
            # 默认等待body元素
            WebDriverWait(driver, wait_time).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        
        # 额外等待JS渲染
        time.sleep(3)
        
        # 等待加载动画消失
        for _ in range(10):
            loading = driver.find_elements(By.CSS_SELECTOR, ".loading, .spinner, [class*='loading'], [class*='spinner']")
            if not loading:
                break
            time.sleep(0.5)
        
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        print(f"✅ 已保存: {filepath}")
        return True
    except Exception as e:
        print(f"⚠️  {filename}: {e}")
        # 即使超时也保存截图
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        return False

def main():
    print("=" * 50)
    print("开始截取 Shadow-Bees 三端页面 V2")
    print("=" * 50)
    
    driver = create_driver()
    
    # 酒店端截图
    print("\n【酒店端 - Hotel Portal】")
    wait_for_page_load(driver, "http://localhost:5173/", "01-hotel-dashboard.png", "[data-testid='dashboard']", 15)
    wait_for_page_load(driver, "http://localhost:5173/content-factory", "02-hotel-content.png", wait_time=15)
    wait_for_page_load(driver, "http://localhost:5173/tickets", "03-hotel-tickets.png", wait_time=15)
    wait_for_page_load(driver, "http://localhost:5173/pricing", "04-hotel-pricing.png", wait_time=15)
    
    # 集团端截图
    print("\n【集团端 - Group Portal】")
    wait_for_page_load(driver, "http://localhost:5173/group", "05-group-dashboard.png", wait_time=15)
    wait_for_page_load(driver, "http://localhost:5173/group/channels", "06-group-channels.png", wait_time=15)
    
    # 管理端截图
    print("\n【管理端 - Admin Portal】")
    wait_for_page_load(driver, "http://localhost:5173/admin", "07-admin-dashboard.png", wait_time=15)
    wait_for_page_load(driver, "http://localhost:5173/admin/customers", "08-admin-customers.png", wait_time=15)
    
    driver.quit()
    
    print("\n" + "=" * 50)
    print(f"所有截图已保存到: {SCREENSHOT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
