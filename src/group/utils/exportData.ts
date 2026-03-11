/**
 * 数据导出工具
 * 支持 CSV、JSON 格式导出
 */

export type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
}

/**
 * 导出数据为文件
 */
export function exportData<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const { filename = 'export', format = 'csv' } = options;
  
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  let content: string;
  let mimeType: string;
  let extension: string;
  
  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  } else {
    // CSV 格式
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // 处理包含逗号或换行符的值
          const stringValue = String(value ?? '');
          if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    content = csvRows.join('\n');
    mimeType = 'text/csv;charset=utf-8';
    extension = 'csv';
  }
  
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 导出表格数据（自动格式化）
 */
export function exportTableData(
  data: Record<string, string | number>[],
  columns: { key: string; label: string }[],
  filename: string
): void {
  // 将数据映射为带中文表头的格式
  const formattedData = data.map(row => {
    const formatted: Record<string, string> = {};
    columns.forEach(col => {
      formatted[col.label] = String(row[col.key] ?? '-');
    });
    return formatted;
  });
  
  exportData(formattedData, { filename, format: 'csv' });
}

/**
 * 生成报表摘要
 */
export function generateReportSummary(data: {
  title: string;
  timeRange: string;
  metrics: { label: string; value: string }[];
}): string {
  const { title, timeRange, metrics } = data;
  
  const lines = [
    `${title}`,
    `统计周期: ${timeRange}`,
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '关键指标:',
    ...metrics.map(m => `  ${m.label}: ${m.value}`),
    '',
    '---',
    '本报告由 Shadow-Bees 系统自动生成',
  ];
  
  return lines.join('\n');
}

export default {
  exportData,
  exportTableData,
  generateReportSummary,
};
