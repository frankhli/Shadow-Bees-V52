#!/usr/bin/env python3
"""截图脚本 - 聚焦核心功能页面"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
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
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def capture(driver, url, filename, wait=5):
    """截图指定页面"""
    print(f"截图: {filename}...")
    try:
        driver.get(url)
        time.sleep(wait)
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        print(f"✅ {filepath}")
        return True
    except Exception as e:
        print(f"⚠️ {e}")
        return False

def main():
    print("=" * 50)
    print("截取核心功能页面")
    print("=" * 50)
    
    driver = create_driver()
    base = "http://localhost:5173"
    
    # ===== 酒店端（给单体酒店用的）=====
    print("\n【酒店端 - 单体酒店】")
    capture(driver, f"{base}/content-factory", "01-内容工厂-AI种草.png", 6)
    capture(driver, f"{base}/tickets", "02-AI客服-智能工单.png", 6)
    capture(driver, f"{base}/pricing", "03-智能定价-尾房促销.png", 6)
    
    # ===== 集团端（给华美会用的）=====
    print("\n【集团端 - 华美会管理】")
    capture(driver, f"{base}/group", "04-集团数据大盘.png", 6)
    capture(driver, f"{base}/group/channels", "05-渠道分析-私域效果.png", 6)
    capture(driver, f"{base}/group/hotels", "06-多店管理.png", 6)
    
    driver.quit()
    
    print("\n" + "=" * 50)
    print("截图完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
