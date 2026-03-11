#!/usr/bin/env python3
"""截图脚本 V3 - 登录后截图"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

SCREENSHOT_DIR = "/Users/frank/Desktop/华美会合作资料/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# 登录账号（Mock模式用默认账号）
LOGIN_EMAIL = "admin@shadowbees.com"
LOGIN_PASSWORD = "shadowbees123"

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

def login_and_capture(driver, base_url, filename, path=""):
    """登录并截图"""
    print(f"正在截图: {filename}...")
    try:
        # 访问页面
        full_url = f"{base_url}{path}"
        driver.get(full_url)
        time.sleep(3)
        
        # 检查是否需要登录（查找登录表单）
        email_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='email'], input[name='email'], input[placeholder*='邮箱']")
        password_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password'], input[name='password']")
        
        if email_inputs and password_inputs:
            print(f"  检测到登录页，正在登录...")
            email_inputs[0].clear()
            email_inputs[0].send_keys(LOGIN_EMAIL)
            password_inputs[0].clear()
            password_inputs[0].send_keys(LOGIN_PASSWORD)
            
            # 点击登录按钮
            login_buttons = driver.find_elements(By.CSS_SELECTOR, "button[type='submit'], .login-btn, button:contains('登录')")
            if login_buttons:
                login_buttons[0].click()
            else:
                # 尝试按回车
                password_inputs[0].submit()
            
            time.sleep(4)  # 等待登录后页面加载
        
        # 等待内容加载
        time.sleep(3)
        
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        print(f"✅ 已保存: {filepath}")
        return True
        
    except Exception as e:
        print(f"⚠️  {filename}: {e}")
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        driver.save_screenshot(filepath)
        return False

def main():
    print("=" * 50)
    print("开始截取 Shadow-Bees 三端页面 V3")
    print("=" * 50)
    
    driver = create_driver()
    
    # 酒店端
    print("\n【酒店端】")
    login_and_capture(driver, "http://localhost:5173", "01-hotel-dashboard.png")
    login_and_capture(driver, "http://localhost:5173", "02-hotel-content.png", "/content-factory")
    login_and_capture(driver, "http://localhost:5173", "03-hotel-tickets.png", "/tickets")
    login_and_capture(driver, "http://localhost:5173", "04-hotel-pricing.png", "/pricing")
    
    # 集团端
    print("\n【集团端】")
    login_and_capture(driver, "http://localhost:5173", "05-group-dashboard.png", "/group")
    login_and_capture(driver, "http://localhost:5173", "06-group-channels.png", "/group/channels")
    
    # 管理端
    print("\n【管理端】")
    login_and_capture(driver, "http://localhost:5173", "07-admin-dashboard.png", "/admin")
    login_and_capture(driver, "http://localhost:5173", "08-admin-customers.png", "/admin/customers")
    
    driver.quit()
    
    print("\n" + "=" * 50)
    print(f"所有截图已保存到: {SCREENSHOT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
