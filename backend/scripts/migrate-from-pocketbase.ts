/**
 * PocketBase → PostgreSQL 数据迁移脚本
 * 
 * 使用方式:
 * 1. 确保旧后端数据在 backup_legacy/pb_data/data.db
 * 2. 确保 PostgreSQL 已启动且数据库已初始化
 * 3. 运行: npx ts-node migrate-from-pocketbase.ts
 */

import { PrismaClient } from '@prisma/client';
import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const prisma = new PrismaClient();

// PocketBase 数据库路径
const PB_DB_PATH = '../backup_legacy/pb_data/data.db';

async function migrate() {
  console.log('🚀 开始数据迁移...\n');

  // 连接 SQLite
  const pbDb = await open({
    filename: PB_DB_PATH,
    driver: sqlite3.Database,
  });

  // 1. 迁移酒店
  await migrateHotels(pbDb);

  // 2. 迁移房型
  await migrateRoomTypes(pbDb);

  // 3. 迁移订单
  await migrateOrders(pbDb);

  // 4. 迁移内容
  await migrateContents(pbDb);

  console.log('\n✅ 数据迁移完成！');
  
  await pbDb.close();
  await prisma.$disconnect();
}

// 迁移酒店
async function migrateHotels(pbDb: any) {
  console.log('🏨 迁移酒店数据...');
  
  const hotels = await pbDb.all('SELECT * FROM hotels');
  console.log(`  找到 ${hotels.length} 个酒店`);

  let success = 0;
  let skipped = 0;

  for (const h of hotels) {
    try {
      // 映射字段
      const hotelData = {
        id: h.id,
        name: h.name,
        type: h.type || 'city',
        tier: h.tier || 'comfort',
        theme: h.theme || 'cyan',
        city: h.city || '未知',
        address: h.address,
        coordinates: h.coordinates ? JSON.parse(h.coordinates) : null,
        defaultMode: h.default_mode || 'dynamic',
        scriptStrategy: h.script_strategy,
        flexibleInventoryRate: h.flexible_inventory_rate,
        createdAt: new Date(h.created),
        updatedAt: new Date(h.updated),
      };

      await prisma.hotel.create({ data: hotelData });
      success++;
    } catch (e) {
      if (e.code === 'P2002') {
        console.log(`    酒店 ${h.id} 已存在，跳过`);
        skipped++;
      } else {
        console.error(`    迁移酒店 ${h.id} 失败:`, e.message);
      }
    }
  }

  console.log(`  ✅ 成功: ${success}, 跳过: ${skipped}\n`);
}

// 迁移房型
async function migrateRoomTypes(pbDb: any) {
  console.log('🛏️  迁移房型数据...');
  
  const roomTypes = await pbDb.all('SELECT * FROM room_types');
  console.log(`  找到 ${roomTypes.length} 个房型`);

  let success = 0;
  let skipped = 0;

  for (const rt of roomTypes) {
    try {
      const roomTypeData = {
        id: rt.id,
        hotelId: rt.hotel,
        name: rt.name,
        floorPrice: rt.floor_price,
        ceilingPrice: rt.ceiling_price,
        currentPrice: rt.current_price,
        totalInventory: rt.total_inventory,
        otaAllocation: rt.ota_allocation,
        flexibleAllocation: rt.flexible_allocation,
        attributes: rt.attributes ? JSON.parse(rt.attributes) : null,
        createdAt: new Date(rt.created),
        updatedAt: new Date(rt.updated),
      };

      await prisma.roomType.create({ data: roomTypeData });
      success++;
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++;
      } else {
        console.error(`    迁移房型 ${rt.id} 失败:`, e.message);
      }
    }
  }

  console.log(`  ✅ 成功: ${success}, 跳过: ${skipped}\n`);
}

// 迁移订单
async function migrateOrders(pbDb: any) {
  console.log('📝 迁移订单数据...');
  
  const orders = await pbDb.all('SELECT * FROM orders');
  console.log(`  找到 ${orders.length} 个订单`);

  let success = 0;
  let skipped = 0;

  for (const o of orders) {
    try {
      const orderData = {
        id: o.id,
        orderNo: o.order_no,
        hotelId: o.hotel,
        roomTypeId: o.room_type,
        platform: o.platform,
        sourceContentId: o.source_content_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        checkInDate: new Date(o.check_in_date),
        checkOutDate: new Date(o.check_out_date),
        nights: o.nights,
        price: o.price,
        totalAmount: o.total_amount,
        platformFee: o.platform_fee,
        netRevenue: o.net_revenue,
        status: o.status || 'PENDING',
        inventorySource: 'SHADOW', // 默认灵活库存
        timestamp: new Date(o.timestamp),
        notes: o.notes,
        createdAt: new Date(o.created),
        updatedAt: new Date(o.updated),
      };

      await prisma.order.create({ data: orderData });
      success++;
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++;
      } else {
        console.error(`    迁移订单 ${o.id} 失败:`, e.message);
      }
    }
  }

  console.log(`  ✅ 成功: ${success}, 跳过: ${skipped}\n`);
}

// 迁移内容
async function migrateContents(pbDb: any) {
  console.log('🎨 迁移内容数据...');
  
  // PocketBase 的内容表可能叫 contents
  const contents = await pbDb.all('SELECT * FROM contents').catch(() => []);
  console.log(`  找到 ${contents.length} 条内容`);

  let success = 0;
  let skipped = 0;

  for (const c of contents) {
    try {
      const contentData = {
        id: c.id,
        hotelId: c.hotel,
        platform: c.platform,
        contentType: c.content_type || 'TEXT',
        title: c.title,
        content: c.content,
        images: c.images ? JSON.parse(c.images) : [],
        prompt: c.prompt,
        rawOutput: c.raw_output,
        status: c.status || 'DRAFT',
        humanEdit: c.human_edit,
        publishedAt: c.published_at ? new Date(c.published_at) : null,
        performance: c.performance ? JSON.parse(c.performance) : null,
        createdAt: new Date(c.created),
        updatedAt: new Date(c.updated),
      };

      await prisma.content.create({ data: contentData });
      success++;
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++;
      } else {
        console.error(`    迁移内容 ${c.id} 失败:`, e.message);
      }
    }
  }

  console.log(`  ✅ 成功: ${success}, 跳过: ${skipped}\n`);
}

// 运行迁移
migrate().catch((e) => {
  console.error('❌ 迁移失败:', e);
  process.exit(1);
});
