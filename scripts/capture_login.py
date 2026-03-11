#!/usr/bin/env python3
"""截图脚本 - 完整登录后截图"""

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

def login_and_capture(driver, url, filename, password="owner123"):
    """完整登录流程后截图"""
    print(f"截图: {filename}...")
    try:
        driver.get(url)
        time.sleep(3)
        
        # 1. 找"进入系统"按钮并点击
        enter_buttons = driver.find_elements(By.XPATH, "//*[contains(text(), '进入系统')]")
        if enter_buttons:
            enter_buttons[0].click()
            print(f"  点击进入系统...")
            time.sleep(2)
        
        # 2. 找密码输入框并输入密码
        pwd_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        if pwd_inputs:
            pwd_inputs[0].clear()
            pwd_inputs[0].send_keys(password)
            print(f"  输入密码...")
        
        # 3. 点击登录按钮
        login_buttons = driver.find_elements(By.XPATH, "//*[contains(text(), '登录系统')]")
        if login_buttons:
            login_buttons[0].click()
            print(f"  点击登录...")
            time.sleep(5)  # 等待页面加载
        
        # 保存截图
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        print(f"✅ {filepath}")
        return True
    except Exception as e:
        print(f"⚠️ {e}")
        # 即使出错也保存截图看看到哪一步了
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        return False

def main():
    print("=" * 50)
    print("截图 - 完整登录流程")
    print("=" * 50)
    
    driver = create_driver()
    base = "http://localhost:5173"
    
    # 酒店端 (密码 owner123)
    print("\n【酒店端】")
    login_and_capture(driver, f"{base}/content-factory", "01-内容工厂-AI种草.png", "owner123")
    login_and_capture(driver, f"{base}/tickets", "02-AI客服-智能工单.png", "owner123")
    login_and_capture(driver, f"{base}/pricing", "03-智能定价-尾房促销.png", "owner123")
    
    # 集团端 (密码 admin123)
    print("\n【集团端】")
    login_and_capture(driver, f"{base}/group", "04-集团数据大盘.png", "admin123")
    login_and_capture(driver, f"{base}/group/channels", "05-渠道分析-私域效果.png", "admin123")
    
    driver.quit()
    
    print("\n" + "=" * 50)
    print("完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
