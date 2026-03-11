import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const screenshotsDir = '/Users/frank/Desktop/华美会合作资料/screenshots';

async function captureScreenshots() {
  await mkdir(screenshotsDir, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // 1. 酒店端 - 今日概览
  console.log('截图: 酒店端-今日概览...');
  const hotelPage = await context.newPage();
  await hotelPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await hotelPage.waitForTimeout(3000);
  await hotelPage.screenshot({ 
    path: `${screenshotsDir}/01-hotel-overview.png`, 
    fullPage: false 
  });

  // 2. 酒店端 - 内容工厂（AI种草）
  console.log('截图: 酒店端-内容工厂...');
  await hotelPage.goto('http://localhost:5173/content-factory', { waitUntil: 'networkidle' });
  await hotelPage.waitForTimeout(3000);
  await hotelPage.screenshot({ 
    path: `${screenshotsDir}/02-hotel-content.png`, 
    fullPage: false 
  });

  // 3. 酒店端 - AI客服/工单
  console.log('截图: 酒店端-AI客服...');
  await hotelPage.goto('http://localhost:5173/tickets', { waitUntil: 'networkidle' });
  await hotelPage.waitForTimeout(3000);
  await hotelPage.screenshot({ 
    path: `${screenshotsDir}/03-hotel-ai-chat.png`, 
    fullPage: false 
  });

  await hotelPage.close();

  // 4. 集团端 - 数据大盘
  console.log('截图: 集团端-数据大盘...');
  const groupPage = await context.newPage();
  await groupPage.goto('http://localhost:5173/group', { waitUntil: 'networkidle' });
  await groupPage.waitForTimeout(3000);
  await groupPage.screenshot({ 
    path: `${screenshotsDir}/04-group-dashboard.png`, 
    fullPage: false 
  });

  // 5. 集团端 - 渠道分析
  console.log('截图: 集团端-渠道分析...');
  await groupPage.goto('http://localhost:5173/group/channels', { waitUntil: 'networkidle' });
  await groupPage.waitForTimeout(3000);
  await groupPage.screenshot({ 
    path: `${screenshotsDir}/05-group-channels.png`, 
    fullPage: false 
  });

  await groupPage.close();

  // 6. 管理端 - 数据大盘
  console.log('截图: 管理端-数据大盘...');
  const adminPage = await context.newPage();
  await adminPage.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(3000);
  await adminPage.screenshot({ 
    path: `${screenshotsDir}/06-admin-dashboard.png`, 
    fullPage: false 
  });

  // 7. 管理端 - 客户管理
  console.log('截图: 管理端-客户管理...');
  await adminPage.goto('http://localhost:5173/admin/customers', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(3000);
  await adminPage.screenshot({ 
    path: `${screenshotsDir}/07-admin-customers.png`, 
    fullPage: false 
  });

  await adminPage.close();

  await browser.close();
  console.log('✅ 所有截图完成！');
  console.log(`截图保存在: ${screenshotsDir}`);
}

captureScreenshots().catch(console.error);
