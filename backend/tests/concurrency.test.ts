/**
 * 并发测试 - 验证防超卖
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3002/api';

async function testConcurrentOrders() {
  console.log('🧪 并发订单测试 - 验证防超卖\n');

  const hotelId = 'test-hotel-001';
  const roomTypeId = 'test-room-001';
  const testDate = '2024-12-01';

  await initTestData(hotelId, roomTypeId, testDate);

  const concurrentCount = 15;
  const stock = 10;

  console.log(`并发创建 ${concurrentCount} 个订单，库存只有 ${stock}...\n`);

  const promises = [];
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < concurrentCount; i++) {
    const promise = fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId, roomTypeId, platform: 'xianyu',
        checkInDate: testDate, checkOutDate: '2024-12-02',
        nights: 1, price: 300, totalAmount: 300,
        inventorySource: 'shadow', customerName: `客户${i}`,
      }),
    }).then(async (res) => {
      if (res.ok) { results.success++; console.log(`✅ 订单 ${i + 1} 成功`); }
      else { results.failed++; console.log(`❌ 订单 ${i + 1} 失败`); }
    });
    promises.push(promise);
  }

  await Promise.all(promises);

  const finalInventory = await prisma.roomInventory.findUnique({
    where: { hotelId_roomTypeId_date: { hotelId, roomTypeId, date: new Date(testDate) } },
  });

  console.log(`\n📊 结果: 成功${results.success}, 失败${results.failed}, 剩余库存${finalInventory?.shadowPool}`);
  
  if (results.success === stock && finalInventory?.shadowPool === 0) {
    console.log('✅ 测试通过！没有超卖');
  } else {
    console.log('❌ 测试失败！');
    process.exit(1);
  }

  await cleanupTestData(hotelId, roomTypeId, testDate);
  await prisma.$disconnect();
}

async function initTestData(hotelId: string, roomTypeId: string, date: string) {
  await prisma.hotel.upsert({
    where: { id: hotelId },
    update: {},
    create: { id: hotelId, name: '测试酒店', type: 'city', tier: 'comfort', theme: 'cyan', city: '北京' },
  });
  await prisma.roomType.upsert({
    where: { id: roomTypeId },
    update: {},
    create: { id: roomTypeId, hotelId, name: '测试房型', floorPrice: 200, ceilingPrice: 500, totalInventory: 10, otaAllocation: 0, flexibleAllocation: 10 },
  });
  await prisma.roomInventory.upsert({
    where: { hotelId_roomTypeId_date: { hotelId, roomTypeId, date: new Date(date) } },
    update: { shadowPool: 10, soldShadow: 0 },
    create: { hotelId, roomTypeId, date: new Date(date), otaPool: 0, shadowPool: 10, soldOta: 0, soldShadow: 0 },
  });
}

async function cleanupTestData(hotelId: string, roomTypeId: string, date: string) {
  await prisma.order.deleteMany({ where: { hotelId, roomTypeId, checkInDate: new Date(date) } });
  await prisma.roomInventory.deleteMany({ where: { hotelId, roomTypeId, date: new Date(date) } });
  await prisma.roomType.delete({ where: { id: roomTypeId } }).catch(() => {});
  await prisma.hotel.delete({ where: { id: hotelId } }).catch(() => {});
}

testConcurrentOrders().catch(console.error);
