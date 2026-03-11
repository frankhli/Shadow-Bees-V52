#!/usr/bin/env node
/**
 * Playwright 截图脚本 - 完整登录后截图
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/frank/Desktop/华美会合作资料/screenshots';

async function capturePage(page, url, filename, password = 'owner123') {
  console.log(`截图: ${filename}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 1. 点击"进入系统"
    const enterBtn = await page.$('text=进入系统');
    if (enterBtn) {
      await enterBtn.click();
      console.log('  点击进入系统...');
      await page.waitForTimeout(2000);
    }
    
    // 2. 输入密码
    const pwdInput = await page.$('input[type="password"]');
    if (pwdInput) {
      await pwdInput.fill(password);
      console.log('  输入密码...');
    }
    
    // 3. 点击登录
    const loginBtn = await page.$('text=登录系统');
    if (loginBtn) {
      await loginBtn.click();
      console.log('  点击登录...');
      await page.waitForTimeout(5000);
    }
    
    // 截图
    const filepath = join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`✅ ${filepath}`);
    return true;
  } catch (e) {
    console.log(`⚠️ ${e.message}`);
    const filepath = join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Playwright 截图 - 完整登录流程');
  console.log('='.repeat(50));
  
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 } 
  });
  const page = await context.newPage();
  
  const base = 'http://localhost:5173';
  
  // 酒店端
  console.log('\n【酒店端】');
  await capturePage(page, `${base}/content-factory`, '01-内容工厂-AI种草.png', 'owner123');
  await capturePage(page, `${base}/tickets`, '02-AI客服-智能工单.png', 'owner123');
  await capturePage(page, `${base}/pricing`, '03-智能定价-尾房促销.png', 'owner123');
  
  // 集团端
  console.log('\n【集团端】');
  await capturePage(page, `${base}/group`, '04-集团数据大盘.png', 'admin123');
  await capturePage(page, `${base}/group/channels`, '05-渠道分析-私域效果.png', 'admin123');
  
  await browser.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('完成！');
  console.log('='.repeat(50));
}

main().catch(console.error);
