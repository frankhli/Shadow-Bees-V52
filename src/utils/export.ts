/**
 * 数据导出工具函数
 * 支持：Excel、CSV、JSON、PDF
 */

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * 导出为 CSV
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const { filename = 'export.csv' } = options;
  
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // 获取表头
  const headers = Object.keys(data[0]);
  
  // 转换数据
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // 处理特殊字符
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ].join('\n');

  // 下载
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * 导出为 JSON
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const { filename = 'export.json' } = options;
  
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * 导出为 Excel (使用 SheetJS 库)
 * 需要先安装: npm install xlsx
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'export.xlsx', sheetName = 'Sheet1' } = options;
  
  try {
    // 动态导入 xlsx 库
    const XLSX = await import('xlsx') as any;
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 设置列宽
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Failed to export Excel:', error);
    // 降级到 CSV
    exportToCSV(data, { filename: filename.replace('.xlsx', '.csv') });
  }
}

/**
 * 打印为 PDF
 */
export function printToPDF(elementId: string, title: string = 'Document'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以打印');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 导出订单数据（业务专用）
 */
export function exportOrders(
  orders: any[],
  format: 'csv' | 'excel' | 'json' = 'csv'
): void {
  // 格式化数据
  const formattedData = orders.map(order => ({
    '订单号': order.orderNo,
    '酒店': order.hotelName,
    '房型': order.roomType,
    '客户': order.customerName,
    '手机号': order.customerPhone,
    '入住日期': order.checkInDate,
    '退房日期': order.checkOutDate,
    '晚数': order.nights,
    '金额': order.totalAmount,
    '平台': order.platform,
    '状态': order.status,
    '创建时间': order.timestamp,
  }));

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `orders_${timestamp}`;

  switch (format) {
    case 'csv':
      exportToCSV(formattedData, { filename: `${filename}.csv` });
      break;
    case 'excel':
      exportToExcel(formattedData, { filename: `${filename}.xlsx`, sheetName: '订单' });
      break;
    case 'json':
      exportToJSON(formattedData, { filename: `${filename}.json` });
      break;
  }
}

/**
 * 导出财务报表
 */
export function exportFinanceReport(
  data: any[],
  period: string
): void {
  const formattedData = data.map(item => ({
    '日期': item.date,
    '营收': item.revenue,
    '订单数': item.orderCount,
    '入住率': `${item.occupancyRate}%`,
    '平均房价': item.avgPrice,
    '平台费用': item.platformFee,
    '净收入': item.netRevenue,
  }));

  exportToExcel(formattedData, {
    filename: `finance_report_${period}.xlsx`,
    sheetName: '财务报表',
  });
}
